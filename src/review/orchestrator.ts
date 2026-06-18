/**
 * Review orchestrator for over-review.
 * @packageDocumentation
 */

import type { AIProvider } from '../contracts/provider';
import type { Config } from '../config/schema';
import type { AIComment, FileDiff, HiddenPayload, PullRequestSummary } from '../contracts/review';
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

interface ReviewPlan {
  reviewMode: 'full' | 'incremental';
  commitCount: number;
  fileDiffs: FileDiff[];
  loadingPayload: HiddenPayload;
  skipReason?: string;
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
    const currentCommitShas = reviewData.commits.map((commit) => commit.sha);
    const reviewableFileDiffs = filterReviewableFileDiffs(normalizeFileDiffs(reviewData.files));
    const reviewPlan = await this.resolveReviewPlan({
      repoFullName: request.repoFullName,
      currentHeadSha: reviewData.pullRequest.headSha,
      currentCommitShas,
      fileDiffs: reviewableFileDiffs,
      existingPayload: existingOverviewComment?.payload ?? null,
      forceFullReview: Boolean(request.forceFullReview),
    });

    if (reviewPlan.skipReason) {
      logger.info(reviewPlan.skipReason, {
        reviewMode: reviewPlan.reviewMode,
      });

      return {
        handled: true,
        reason: reviewPlan.skipReason,
        reviewMode: reviewPlan.reviewMode,
        actionableFindings: [],
        inlineFindings: [],
        skippedFindingCount: 0,
        commitCount: 0,
        fileCount: 0,
        overviewCommentId: existingOverviewComment?.id,
        artifacts: {
          loadingOverviewBody: existingOverviewComment?.body,
          finalOverviewBody: existingOverviewComment?.body,
          inlineComments: [],
        },
      };
    }

    const { reviewMode, commitCount, fileDiffs, loadingPayload } = reviewPlan;
    const finalPayload = createHiddenPayload(
      reviewData.pullRequest.headSha,
      reviewMode,
      currentCommitShas
    );

    logger.info('Fetched review inputs', {
      reviewMode,
      commitCount,
      fileCount: fileDiffs.length,
    });

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
      const finalOverviewBody = renderNoReviewableChangesComment({ payload: finalPayload });

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
        commitCount,
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
      startLine: finding.startLine,
      endLine: finding.endLine,
      replacementSnippet: finding.replacementSnippet,
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
      commitCount,
      fileCount: fileDiffs.length,
      skippedFindingCount,
    });
    const inlineComments = inlineFindings.map((finding) => ({
      path: finding.path,
      line: finding.line,
      startLine: finding.startLine,
      endLine: finding.endLine,
      replacementSnippet: finding.replacementSnippet,
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

    const finalOverviewBody = renderFinalOverviewComment({
      payload: finalPayload,
      summary,
      review: reviewResult.output,
      fileCount: fileDiffs.length,
      commitCount,
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
      commitCount,
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

  private async resolveReviewPlan(input: {
    repoFullName: string;
    currentHeadSha: string;
    currentCommitShas: string[];
    fileDiffs: FileDiff[];
    existingPayload: HiddenPayload | null;
    forceFullReview: boolean;
  }): Promise<ReviewPlan> {
    const fullLoadingPayload = input.existingPayload
      ? createHiddenPayload(
          input.existingPayload.lastReviewedCommit,
          'full',
          input.existingPayload.reviewedCommits
        )
      : createHiddenPayload('', 'full', []);

    if (input.forceFullReview) {
      return {
        reviewMode: 'full',
        commitCount: input.currentCommitShas.length,
        fileDiffs: input.fileDiffs,
        loadingPayload: fullLoadingPayload,
      };
    }

    if (!input.existingPayload) {
      return {
        reviewMode: 'full',
        commitCount: input.currentCommitShas.length,
        fileDiffs: input.fileDiffs,
        loadingPayload: fullLoadingPayload,
      };
    }

    const lastReviewedCommitIndex = input.currentCommitShas.indexOf(
      input.existingPayload.lastReviewedCommit
    );

    if (lastReviewedCommitIndex === -1) {
      this.options.logger.info('Incremental state unavailable, falling back to full review', {
        reason: 'last_reviewed_commit_missing',
      });

      return {
        reviewMode: 'full',
        commitCount: input.currentCommitShas.length,
        fileDiffs: input.fileDiffs,
        loadingPayload: fullLoadingPayload,
      };
    }

    const newCommitShas = input.currentCommitShas.slice(lastReviewedCommitIndex + 1);
    const incrementalLoadingPayload = createHiddenPayload(
      input.existingPayload.lastReviewedCommit,
      'incremental',
      input.existingPayload.reviewedCommits
    );

    if (newCommitShas.length === 0) {
      return {
        reviewMode: 'incremental',
        commitCount: 0,
        fileDiffs: [],
        loadingPayload: incrementalLoadingPayload,
        skipReason: 'No new commits since last review',
      };
    }

    const changedPaths = await this.getFilesChangedSinceCommit(
      input.repoFullName,
      input.existingPayload.lastReviewedCommit,
      input.currentHeadSha
    );

    if (changedPaths === null) {
      this.options.logger.info('Incremental file selection failed, falling back to full review', {
        reason: 'compare_lookup_failed',
      });

      return {
        reviewMode: 'full',
        commitCount: input.currentCommitShas.length,
        fileDiffs: input.fileDiffs,
        loadingPayload: fullLoadingPayload,
      };
    }

    return {
      reviewMode: 'incremental',
      commitCount: newCommitShas.length,
      fileDiffs: input.fileDiffs.filter(
        (fileDiff) =>
          changedPaths.has(fileDiff.path) ||
          (fileDiff.previousFilename !== undefined && changedPaths.has(fileDiff.previousFilename))
      ),
      loadingPayload: incrementalLoadingPayload,
    };
  }

  private async getFilesChangedSinceCommit(
    repoFullName: string,
    base: string,
    head: string
  ): Promise<Set<string> | null> {
    try {
      const compare = await this.options.client.get<{
        files?: Array<{
          filename: string;
          previous_filename?: string;
        }>;
      }>(`/repos/${repoFullName}/compare/${base}...${head}`);

      if (!Array.isArray(compare.files)) {
        return new Set();
      }

      return new Set(
        compare.files.flatMap((file) =>
          file.previous_filename ? [file.filename, file.previous_filename] : [file.filename]
        )
      );
    } catch (error) {
      this.options.logger.warn(
        `Failed to fetch files changed since ${base}: ${error instanceof Error ? error.message : String(error)}`
      );
      return null;
    }
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
