/**
 * GitHub reviews helpers for over-review.
 * @packageDocumentation
 */
import type { GitHubClient } from './client';
export interface DraftInlineComment {
    path: string;
    line: number;
    startLine?: number;
    endLine?: number;
    replacementSnippet?: string;
    body: string;
}
export interface SubmittedReview {
    reviewId: number;
    inlineCommentIds: number[];
}
export declare function submitReview(client: GitHubClient, repoFullName: string, pullRequestNumber: number, body: string, comments: DraftInlineComment[], needsAttention: boolean): Promise<SubmittedReview>;
//# sourceMappingURL=reviews.d.ts.map