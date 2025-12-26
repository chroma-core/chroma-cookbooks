import path from "path";
import { Branch, CommitDetails, Diffs, Repository } from "./types";
import { simpleGit, SimpleGit } from "simple-git";

export class GitRepository implements Repository {
  public readonly name: string;
  public readonly path: string;
  private git: SimpleGit;

  constructor(repoPath: string) {
    this.path = repoPath;
    this.name = path.basename(repoPath);
    this.git = simpleGit(repoPath);
  }

  async headRef(): Promise<Branch> {
    const branch = await this.git.branchLocal();
    const revParse = await this.git.revparse(["HEAD"]);

    return {
      name: branch.current || "HEAD",
      commit: revParse.trim(),
    };
  }

  async headCommit(): Promise<CommitDetails> {
    const log = await this.git.log({ n: 1 });
    const latest = log.latest;

    if (!latest) {
      throw new Error("No commits found");
    }

    return {
      id: latest.hash,
      message: latest.message,
    };
  }

  async commitDiffs(oldCommitId: string, newCommitId: string): Promise<Diffs> {
    const summary = await this.git.diffSummary([oldCommitId, newCommitId]);
    return this.parseDiffSummary(summary);
  }

  async workingTreeDiffs(headCommitId: string): Promise<Diffs> {
    const summary = await this.git.diffSummary([headCommitId]);
    return this.parseDiffSummary(summary);
  }

  private parseDiffSummary(summary: {
    files: Array<{ file: string; status?: string }>;
  }): Diffs {
    const added: string[] = [];
    const modified: string[] = [];
    const deleted: string[] = [];

    for (const file of summary.files) {
      switch (file.status) {
        case "A":
          added.push(file.file);
          break;
        case "D":
          deleted.push(file.file);
          break;
        default:
          modified.push(file.file);
          break;
      }
    }

    return {
      added,
      modified,
      deleted,
      clean: summary.files.length === 0,
    };
  }
}
