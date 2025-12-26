export interface Repository {
  name: string;
  path: string;
  headRef(): Promise<Branch>;
  headCommit(): Promise<CommitDetails>;
  commitDiffs(oldCommitId: string, newCommitId: string): Promise<Diffs>;
  workingTreeDiffs(headCommitId: string): Promise<Diffs>;
}

export interface Branch {
  name: string;
  commit: string;
}

export interface CommitDetails {
  id: string;
  message: string;
}

export interface Diffs {
  added: string[];
  modified: string[];
  deleted: string[];
  clean: boolean;
}
