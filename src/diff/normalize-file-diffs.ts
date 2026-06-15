/**
 * Diff normalization for over-review.
 * @packageDocumentation
 */

import type { FileDiff, FileStatus, PullRequestFile } from '../contracts/review';
import { parseDiffPatch } from './parse-patch';

const REVIEWABLE_STATUSES: ReadonlySet<FileStatus> = new Set([
  'added',
  'modified',
  'renamed',
  'copied',
]);

export function normalizeFileDiffs(files: PullRequestFile[]): FileDiff[] {
  return files.map((file) => ({
    path: file.filename,
    status: normalizeFileStatus(file.status),
    previousFilename: file.previous_filename,
    patch: file.patch,
    hunks: parseDiffPatch(file.patch),
  }));
}

export function filterReviewableFileDiffs(fileDiffs: FileDiff[]): FileDiff[] {
  return fileDiffs.filter(
    (fileDiff) => REVIEWABLE_STATUSES.has(fileDiff.status) && fileDiff.hunks.length > 0
  );
}

export function hasReviewableLine(fileDiff: FileDiff, line: number): boolean {
  return fileDiff.hunks.some((hunk) => hunk.reviewableLines.includes(line));
}

function normalizeFileStatus(status: string): FileStatus {
  switch (status) {
    case 'added':
    case 'modified':
    case 'removed':
    case 'renamed':
    case 'copied':
      return status;
    default:
      return 'modified';
  }
}
