/**
 * Review summary renderer for over-review.
 * @packageDocumentation
 */
import type { AIComment } from '../contracts/review';
import type { ReviewOutput } from '../prompts/schemas';
export interface ReviewSummaryInput {
    review: ReviewOutput;
    actionableFindings: AIComment[];
    inlineFindings: AIComment[];
    commitCount: number;
    fileCount: number;
    skippedFindingCount: number;
}
export declare function renderReviewSummary(input: ReviewSummaryInput): string;
//# sourceMappingURL=review-summary.d.ts.map