/**
 * Review orchestrator for over-review.
 * @packageDocumentation
 */
import type { AIProvider } from '../contracts/provider';
import type { Config } from '../config/schema';
import type { AIComment, PullRequestSummary } from '../contracts/review';
import type { GitHubClient } from '../github/client';
import { type DraftInlineComment } from '../github/reviews';
import { type ReviewOutput } from '../prompts/schemas';
import type { Logger } from '../runtime/logger';
export interface ReviewOrchestratorOptions {
    client: GitHubClient;
    provider: AIProvider;
    config: Config;
    logger: Logger;
    dryRun?: boolean;
}
export interface ReviewRequest {
    repoFullName: string;
    pullRequestNumber: number;
    forceFullReview?: boolean;
}
export interface ReviewArtifacts {
    loadingOverviewBody?: string;
    finalOverviewBody?: string;
    reviewBody?: string;
    inlineComments: DraftInlineComment[];
    updatedTitle?: string;
}
export interface ReviewRunResult {
    handled: boolean;
    reason?: string;
    reviewMode: 'full' | 'incremental';
    summary?: PullRequestSummary;
    review?: ReviewOutput;
    actionableFindings: AIComment[];
    inlineFindings: AIComment[];
    skippedFindingCount: number;
    commitCount: number;
    fileCount: number;
    overviewCommentId?: number;
    reviewId?: number;
    artifacts: ReviewArtifacts;
}
export declare class ReviewOrchestrator {
    private readonly options;
    constructor(options: ReviewOrchestratorOptions);
    runPullRequestReview(request: ReviewRequest): Promise<ReviewRunResult>;
    private resolveReviewPlan;
    private getFilesChangedSinceCommit;
}
//# sourceMappingURL=orchestrator.d.ts.map