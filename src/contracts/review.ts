/**
 * Review contracts and normalized data types for over-review.
 * @packageDocumentation
 */

export type FileStatus = 'added' | 'modified' | 'removed' | 'renamed' | 'copied';

export interface ThreadComment {
  author: string;
  body: string;
  isBot: boolean;
}

export interface CommentThread {
  line: number;
  comments: ThreadComment[];
}

export interface Hunk {
  header: string;
  startLine: number;
  endLine: number;
  diff: string;
  reviewableLines: number[];
  commentThreads: CommentThread[];
}

export interface FileDiff {
  path: string;
  status: FileStatus;
  previousFilename?: string;
  patch?: string;
  hunks: Hunk[];
}

export interface AIComment {
  path: string;
  line: number;
  severity: 'critical' | 'non-critical';
  title: string;
  body: string;
}

export interface PullRequestSummary {
  title: string;
  description: string;
  fileSummaries: Array<{
    path: string;
    summary: string;
  }>;
  changeTypes: string[];
}

export interface HiddenPayload {
  version: 1;
  reviewedCommits: string[];
  lastReviewedCommit: string;
  mode: 'full' | 'incremental';
}

export interface PullRequestFile {
  filename: string;
  status: FileStatus | string;
  previous_filename?: string;
  patch?: string;
}

export interface PullRequestCommit {
  sha: string;
}

export interface IssueCommentRecord {
  id: number;
  body: string;
  user?: {
    login: string;
  };
}

export interface PullRequestSnapshot {
  number: number;
  repoFullName: string;
  title: string;
  body?: string;
  headSha: string;
  baseRepoFullName: string;
}
