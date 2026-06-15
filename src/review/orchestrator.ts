/**
 * Review orchestrator for over-review.
 * @packageDocumentation
 */

import type { AIProvider } from '../contracts/provider';
import type { Config } from '../config/schema';
import type { AIComment, PullRequestSummary } from '../contracts/review';
import { normalizeFileDiffs, filterReviewableFileDiffs } from '../diff/normalize-file-diffs';
import {
  createOverviewComment,
  findOverviewComment,
  listIssueComments,
  updateOverviewComment,
} from '../github/comments';
import { fetchPullRequestReviewData, updatePullRequestTitle } from '../github/pull-requests';
import type { GitHubClient } from '../github/client';
import { submitReview, type DraftInlineComment } from '../github/reviews';
import { SummaryOutputSchema, ReviewOutputSchema, type ReviewOutput } from '../prompts/schemas';
import { buildReviewPrompt } from '../prompts/review';
import { buildSummaryPrompt } from '../prompts/summary';
import { renderInlineComment } from '../render/inline-comment';
import { createHiddenPayload } from '../render/hidden-state';
import {
  renderFinalOverviewComment,
  renderLoadingOverviewComment,
  renderNoReviewableChangesComment,
} from '../render/overview-comment';
import { renderReviewSummary } from '../render/review-summary';
import type { Logger } from '../runtime/logger';
import { filterFindings, filterForInlinePosting } from './filters';
import { shouldRegenerateTitle } from './title-regeneration';

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

export class ReviewOrchestrator {
  constructor(private readonly options: ReviewOrchestratorOptions) {}

  async runPullRequestReview(request: ReviewRequest): Promise<ReviewRunResult> {
    const { client, logger, provider, config, dryRun } = this.options;
    const reviewData = await fetchPullRequestReviewData(
      client,
      request.repoFullName,
      request.pullRequestNumber
    );
    const issueComments = await listIssueComments(
      client,
      request.repoFullName,
      request.pullRequestNumber
    );
    const existingOverviewComment = findOverviewComment(issueComments);
    const reviewMode: 'full' | 'incremental' = request.forceFullReview ? 'full' : 'full';
    const fileDiffs = filterReviewableFileDiffs(normalizeFileDiffs(reviewData.files));

    logger.info('Fetched review inputs', {
      reviewMode,
      commitCount: reviewData.commits.length,
      fileCount: fileDiffs.length,
    });

    const loadingPayload = createHiddenPayload(reviewData.pullRequest.headSha, reviewMode);
    const loadingOverviewBody = renderLoadingOverviewComment({
      payload: loadingPayload,
      reviewMode,
    });

    let overviewCommentId = existingOverviewComment?.id;

    if (!dryRun) {
      overviewCommentId =
        existingOverviewComment && overviewCommentId !== undefined
          ? await updateExistingOverviewComment(
              client,
              request.repoFullName,
              overviewCommentId,
              loadingOverviewBody
            )
          : await createOverviewComment(
              client,
              request.repoFullName,
              request.pullRequestNumber,
              loadingOverviewBody
            );
    }

    if (fileDiffs.length === 0) {
      const finalOverviewBody = renderNoReviewableChangesComment({ payload: loadingPayload });

      if (!dryRun) {
        if (overviewCommentId !== undefined) {
          await updateExistingOverviewComment(
            client,
            request.repoFullName,
            overviewCommentId,
            finalOverviewBody
          );
        } else {
          overviewCommentId = await createOverviewComment(
            client,
            request.repoFullName,
            request.pullRequestNumber,
            finalOverviewBody
          );
        }
      }

      return {
        handled: true,
        reason: 'No reviewable hunks found',
        reviewMode,
        actionableFindings: [],
        inlineFindings: [],
        skippedFindingCount: 0,
        commitCount: reviewData.commits.length,
        fileCount: 0,
        overviewCommentId,
        artifacts: {
          loadingOverviewBody,
          finalOverviewBody,
          inlineComments: [],
        },
      };
    }

    const summaryResult = await provider.runInference({
      prompt: buildSummaryPrompt({
        title: reviewData.pullRequest.title,
        description: reviewData.pullRequest.body,
        fileDiffs,
      }),
      schema: SummaryOutputSchema,
      schemaName: 'PullRequestSummary',
      schemaDescription: 'Structured pull request summary',
      timeoutMs: config.LLM_TIMEOUT_MS,
      maxRetries: 2,
    });
    const summary: PullRequestSummary = summaryResult.output;

    let updatedTitle: string | undefined;

    if (!dryRun && shouldRegenerateTitle(reviewData.pullRequest.title)) {
      await updatePullRequestTitle(
        client,
        request.repoFullName,
        request.pullRequestNumber,
        summary.title
      );
      updatedTitle = summary.title;
    } else if (shouldRegenerateTitle(reviewData.pullRequest.title)) {
      updatedTitle = summary.title;
    }

    const reviewResult = await provider.runInference({
      prompt: buildReviewPrompt(fileDiffs, config.STYLE_GUIDE_RULES),
      schema: ReviewOutputSchema,
      schemaName: 'PullRequestReview',
      schemaDescription: 'Structured pull request review',
      timeoutMs: config.LLM_TIMEOUT_MS,
      maxRetries: 2,
    });
    const rawFindings = reviewResult.output.findings.map((finding) => ({
      path: finding.path,
      line: finding.line,
      severity: finding.severity,
      title: finding.title,
      body: finding.body,
    }));
    const actionableFindings = filterFindings(rawFindings, fileDiffs);
    const inlineFindings = filterForInlinePosting(actionableFindings);
    const skippedFindingCount = rawFindings.length - actionableFindings.length;
    const reviewBody = renderReviewSummary({
      review: reviewResult.output,
      actionableFindings,
      inlineFindings,
      commitCount: reviewData.commits.length,
      fileCount: fileDiffs.length,
      skippedFindingCount,
    });
    const inlineComments = inlineFindings.map((finding) => ({
      path: finding.path,
      line: finding.line,
      body: renderInlineComment(finding),
    }));

    let reviewId: number | undefined;

    if (!dryRun) {
      const submittedReview = await submitReview(
        client,
        request.repoFullName,
        request.pullRequestNumber,
        reviewBody,
        inlineComments,
        reviewResult.output.needsAttention
      );
      reviewId = submittedReview.reviewId;
    }

    const finalPayload = createHiddenPayload(reviewData.pullRequest.headSha, reviewMode);
    const finalOverviewBody = renderFinalOverviewComment({
      payload: finalPayload,
      summary,
      review: reviewResult.output,
      fileCount: fileDiffs.length,
      commitCount: reviewData.commits.length,
      actionableFindingCount: actionableFindings.length,
      inlineCommentCount: inlineComments.length,
    });

    if (!dryRun) {
      if (overviewCommentId) {
        await updateExistingOverviewComment(
          client,
          request.repoFullName,
          overviewCommentId,
          finalOverviewBody
        );
      } else {
        overviewCommentId = await createOverviewComment(
          client,
          request.repoFullName,
          request.pullRequestNumber,
          finalOverviewBody
        );
      }
    }

    return {
      handled: true,
      reviewMode,
      summary,
      review: reviewResult.output,
      actionableFindings,
      inlineFindings,
      skippedFindingCount,
      commitCount: reviewData.commits.length,
      fileCount: fileDiffs.length,
      overviewCommentId,
      reviewId,
      artifacts: {
        loadingOverviewBody,
        finalOverviewBody,
        reviewBody,
        inlineComments,
        updatedTitle,
      },
    };
  }
}

async function updateExistingOverviewComment(
  client: GitHubClient,
  repoFullName: string,
  commentId: number,
  body: string
): Promise<number> {
  await updateOverviewComment(client, repoFullName, commentId, body);
  return commentId;
}
