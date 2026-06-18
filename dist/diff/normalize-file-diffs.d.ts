/**
 * Diff normalization for over-review.
 * @packageDocumentation
 */
import type { FileDiff, PullRequestFile } from '../contracts/review';
export declare function normalizeFileDiffs(files: PullRequestFile[]): FileDiff[];
export declare function filterReviewableFileDiffs(fileDiffs: FileDiff[]): FileDiff[];
export declare function hasReviewableLine(fileDiff: FileDiff, line: number): boolean;
//# sourceMappingURL=normalize-file-diffs.d.ts.map