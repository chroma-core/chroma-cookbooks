import { Tiktoken } from "tiktoken";
import { Chunk } from "./types";
import * as path from "node:path";
import { languageConfigs } from "./languages";
import * as fs from "node:fs";
import Parser, { SyntaxNode } from "tree-sitter";
import { v4 as uuidv4 } from "uuid";

export class Chunker {
  private readonly rootPath: string;
  private readonly maxTokens: number;
  private encoder: Tiktoken;

  constructor({
    rootPath,
    encoder,
    maxTokens,
  }: {
    rootPath: string;
    encoder: Tiktoken;
    maxTokens: number;
  }) {
    this.rootPath = rootPath;
    this.encoder = encoder;
    this.maxTokens = maxTokens;
  }

  private static symbolName(node: SyntaxNode) {
    return node.childForFieldName("name")?.text;
  }

  async chunkFile(filePath: string): Promise<Chunk[]> {
    const fileExtension = path.extname(filePath);
    const config = languageConfigs[fileExtension];
    if (!config) {
      return [];
    }

    const absolutePath = path.join(this.rootPath, filePath);
    const fileContent = fs.readFileSync(absolutePath, "utf-8");

    const parser = new Parser();
    parser.setLanguage(config.language());
    const tree = parser.parse(fileContent);

    const nodes = this.collectNodes(tree.rootNode, config.targetNodes);
    nodes.sort((a, b) => a.startIndex - b.startIndex);

    const chunks: Omit<Chunk, "language" | "filePath">[] = [];

    let cursor = 0;
    let line = tree.rootNode.startPosition.row;

    for (const node of nodes) {
      // Code before a wanted node
      if (cursor < node.startIndex) {
        const gap = fileContent.slice(cursor, node.startIndex);
        chunks.push(...this.chunkCodeSpan(gap, line));
      }

      // Add wanted node
      const nodeContent = fileContent.slice(node.startIndex, node.endIndex);
      const nodeLine = node.startPosition.row;
      const nodeSplits = this.chunkCodeSpan(nodeContent, nodeLine).map((s) => {
        return {
          ...s,
          symbol: Chunker.symbolName(node),
        };
      });
      chunks.push(...nodeSplits);

      cursor = node.endIndex;
      line = node.endPosition.row;
    }

    // Trailing code after last wanted code
    if (cursor < fileContent.length) {
      const tail = fileContent.slice(cursor);
      chunks.push(...this.chunkCodeSpan(tail, line));
    }

    return chunks.map((chunk, i) => {
      return {
        ...chunk,
        filePath,
        language: config.name,
      };
    });
  }

  private collectNodes(
    node: SyntaxNode,
    targetNodes: Set<string>,
  ): SyntaxNode[] {
    const nodes: SyntaxNode[] = [];
    if (targetNodes.has(node.type)) {
      nodes.push(node);
    } else {
      for (const child of node.children) {
        nodes.push(...this.collectNodes(child, targetNodes));
      }
    }
    return nodes;
  }

  private chunkCodeSpan(
    src: string,
    startLine: number,
  ): Omit<Chunk, "language" | "filePath">[] {
    if (!src.trim()) {
      return [];
    }

    const chunks: Omit<Chunk, "language" | "filePath">[] = [];
    const NEW_LINE_TOKEN = this.encoder.encode("\n").length;
    const lines = src.split("\n");

    let currentLines: string[] = [];
    let currentTokens = 0;
    let splitStart = startLine;

    const flush = () => {
      chunks.push({
        id: uuidv4(),
        document: currentLines.join("\n"),
        startLine: splitStart,
        endLine: splitStart + currentLines.length - 1,
      });
    };

    for (const line of lines) {
      const lineTokens = this.encoder.encode(line).length + NEW_LINE_TOKEN;
      if (
        currentTokens + lineTokens > this.maxTokens &&
        currentLines.length > 0
      ) {
        flush();
        splitStart += currentLines.length;
        currentLines = [];
        currentTokens = 0;
      }

      currentLines.push(line);
      currentTokens += lineTokens;
    }

    if (currentLines.length > 0) {
      flush();
    }

    return chunks;
  }
}
