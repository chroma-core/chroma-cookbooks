import { Collection, CloudClient } from "chromadb";
import { CommitDetails, Diffs, Repository } from "../repository";
import { Chunker } from "../chunker";
import { encoding_for_model, Tiktoken } from "tiktoken";
import path from "path";
import fs from "fs";
import ignore from "ignore";
import { AgentError } from "@chroma-cookbooks/agent-framework";
import { OpenAIEmbeddingFunction } from "@chroma-core/openai";
import { Chunk } from "../chunker/types";
import { createHash } from "node:crypto";

export class Indexer {
  private static MAX_TOKEN = 8192;
  private static BATCH_SIZE = 300;
  private static COMMITS_COLLECTION = "commits";

  private chromaClient: CloudClient;
  private commitsCollection: Collection;
  private chunker: Chunker;
  repository: Repository;

  constructor({
    chromaClient,
    commitsCollection,
    repository,
  }: {
    chromaClient: CloudClient;
    commitsCollection: Collection;
    repository: Repository;
  }) {
    this.chromaClient = chromaClient;
    this.commitsCollection = commitsCollection;
    this.repository = repository;

    const encoder: Tiktoken = encoding_for_model("text-embedding-3-large");
    this.chunker = new Chunker({
      rootPath: this.repository.path,
      encoder,
      maxTokens: Indexer.MAX_TOKEN,
    });
  }

  static async create({
    repository,
  }: {
    repository: Repository;
  }): Promise<Indexer> {
    const chromaClient = new CloudClient();
    const commitsCollection = await chromaClient.getOrCreateCollection({
      name: Indexer.COMMITS_COLLECTION,
    });

    return new Indexer({ chromaClient, commitsCollection, repository });
  }

  private static async addBatch(chunks: Chunk[], collection: Collection) {
    const batch = chunks.slice(0, Indexer.BATCH_SIZE);

    try {
      await collection.add({
        ids: batch.map((chunk) => chunk.id),
        documents: batch.map((chunk) => chunk.document),
        metadatas: batch.map((chunk) => {
          const { id, document, ...metadata } = chunk;
          return metadata;
        }),
      });
    } catch (error) {
      throw new AgentError(
        `Failed to add batch to collection ${collection.name}`,
        error,
      );
    }

    return chunks.slice(Indexer.BATCH_SIZE);
  }

  async run(): Promise<Collection> {
    const head = await this.repository.headCommit();
    let latestIndexedCommit = await this.latestIndexedCommit();

    let latestCollection: Collection;
    if (!latestIndexedCommit) {
      latestCollection = await this.indexRepository(head);
      latestIndexedCommit = head.id;
    } else {
      try {
        latestCollection = await this.chromaClient.getCollection({
          name: latestIndexedCommit,
        });
      } catch (error) {
        throw new AgentError(
          `Failed to get collection for latest indexed commit ${latestIndexedCommit}`,
          error,
        );
      }
    }

    if (head.id !== latestIndexedCommit) {
      const diffs = await this.repository.commitDiffs(
        latestIndexedCommit,
        head.id,
      );
      latestCollection = await this.indexDiffs({
        diffs,
        latestCommitID: latestIndexedCommit,
        newCommitID: head.id,
      });
    }

    const workingTreeDiffs = await this.repository.workingTreeDiffs(head.id);
    if (!workingTreeDiffs.clean) {
      const dirtyName = await this.dirtyCollectionName(
        head.id,
        workingTreeDiffs,
      );

      try {
        latestCollection = await this.chromaClient.getCollection({
          name: dirtyName,
        });
      } catch {
        latestCollection = await this.indexDiffs({
          diffs: workingTreeDiffs,
          latestCommitID: head.id,
          dirtyName,
        });
      }
    }

    return latestCollection;
  }

  private async latestIndexedCommit(): Promise<string | undefined> {
    const latestRecord = await this.commitsCollection.get<{
      latest: boolean;
    }>({ where: { latest: true } });

    if (latestRecord.ids.length === 0) {
      return undefined;
    }

    return latestRecord.ids[0];
  }

  private async indexRepository(commit: CommitDetails): Promise<Collection> {
    const ig = ignore();
    const gitignore = path.join(this.repository.path, ".gitignore");
    if (fs.existsSync(gitignore)) {
      const content = await fs.promises.readFile(gitignore, "utf8");
      ig.add(content);
      ig.add(".git");
    }

    try {
      await this.commitsCollection.add({
        ids: [commit.id],
        documents: [commit.message],
        metadatas: [{ latest: true }],
      });
    } catch (error) {
      throw new AgentError("Failed to add record to commits collection", error);
    }

    let collection: Collection;
    try {
      collection = await this.chromaClient.getOrCreateCollection({
        name: commit.id,
        embeddingFunction: new OpenAIEmbeddingFunction({
          modelName: "text-embedding-3-large",
        }),
      });
    } catch (error) {
      throw new AgentError(
        "Failed to create collection for repository indexing",
        error,
      );
    }

    let chunks: Chunk[] = [];

    const walkRepo = async (dir: string) => {
      const entries = await fs.promises
        .readdir(dir, { withFileTypes: true })
        .catch(() => []);
      for (const entry of entries) {
        const absolutePath = path.join(dir, entry.name);
        const relativePath = path.relative(this.repository.path, absolutePath);

        if (ig.ignores(relativePath)) {
          continue;
        }

        if (entry.isDirectory()) {
          await walkRepo(absolutePath);
        } else if (entry.isFile()) {
          const fileChunks = await this.chunker.chunkFile(relativePath);
          chunks.push(...fileChunks);
          if (chunks.length > Indexer.BATCH_SIZE) {
            chunks = await Indexer.addBatch(chunks, collection);
          }
        }
      }
    };

    await walkRepo(this.repository.path);
    while (chunks.length > 0) {
      chunks = await Indexer.addBatch(chunks, collection);
    }

    return collection;
  }

  private async indexDiffs({
    diffs,
    latestCommitID,
    newCommitID,
    dirtyName,
  }: {
    diffs: Diffs;
    latestCommitID: string;
    newCommitID?: string;
    dirtyName?: string;
  }) {
    if (!newCommitID && !dirtyName) {
      throw new AgentError(
        "Must provide either a new commit ID or dirty collection name to index diffs",
      );
    }

    let latestCollection: Collection;

    try {
      latestCollection = await this.chromaClient.getCollection({
        name: latestCommitID,
      });
    } catch (error) {
      throw new AgentError(`Failed to get collection ${latestCommitID}`, error);
    }

    let newCollection: Collection;

    try {
      newCollection = await latestCollection.fork({
        name: newCommitID || dirtyName!,
      });
    } catch (error) {
      throw new AgentError(
        `Failed to fork collection ${latestCommitID}`,
        error,
      );
    }

    if (newCommitID) {
      try {
        await this.commitsCollection.upsert({
          ids: [latestCommitID, newCommitID],
          metadatas: [{ latest: null }, { latest: true }],
        });
      } catch (error) {
        throw new AgentError("Failed to update commits collection", error);
      }
    }

    await newCollection.delete({
      where: {
        filePath: {
          $in: [...diffs.added, ...diffs.deleted, ...diffs.modified],
        },
      },
    });

    let chunks: Chunk[] = [];
    for (const filePath of [...diffs.added, ...diffs.modified]) {
      const fileChunks = await this.chunker.chunkFile(filePath);
      chunks.push(...fileChunks);
      if (chunks.length > Indexer.BATCH_SIZE) {
        chunks = await Indexer.addBatch(chunks, newCollection);
      }
    }

    while (chunks.length > 0) {
      chunks = await Indexer.addBatch(chunks, newCollection);
    }

    return newCollection;
  }

  private async dirtyCollectionName(
    baseCommit: string,
    diffs: Diffs,
  ): Promise<string> {
    const contentHashes: string[] = [];

    for (const file of [...diffs.added, ...diffs.modified].sort()) {
      const absolutePath = path.join(this.repository.path, file);
      const content = await fs.promises.readFile(absolutePath, "utf-8");
      const hash = createHash("sha256")
        .update(content)
        .digest("hex")
        .slice(0, 8);
      contentHashes.push(`${file}:${hash}`);
    }

    for (const file of diffs.deleted.sort()) {
      contentHashes.push(`${file}:deleted`);
    }

    const stateHash = createHash("sha256")
      .update(contentHashes.join("\n"))
      .digest("hex")
      .slice(0, 12);

    return `dirty-${baseCommit.slice(0, 8)}-${stateHash}`;
  }
}
