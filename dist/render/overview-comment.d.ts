/**
 * Overview comment renderers for over-review.
 * @packageDocumentation
 */
import type { HiddenPayload, PullRequestSummary } from '../contracts/review';
import type { ReviewOutput } from '../prompts/schemas';
export interface LoadingOverviewCommentInput {
    payload: HiddenPayload;
    reviewMode: 'full' | 'incremental';
}
export interface FinalOverviewCommentInput {
    payload: HiddenPayload;
    summary: PullRequestSummary;
    review: ReviewOutput;
    fileCount: number;
    commitCount: number;
    actionableFindingCount: number;
    inlineCommentCount: number;
}
export interface NoReviewableChangesCommentInput {
    payload: HiddenPayload;
}
export declare function renderLoadingOverviewComment(input: LoadingOverviewCommentInput): string;
export declare function renderFinalOverviewComment(input: FinalOverviewCommentInput): string;
export declare function renderNoReviewableChangesComment(input: NoReviewableChangesCommentInput): string;
//# sourceMappingURL=overview-comment.d.ts.map