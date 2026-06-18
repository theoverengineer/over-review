"use strict";
/**
 * Review orchestrator for over-review.
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewOrchestrator = void 0;
const normalize_file_diffs_1 = require("../diff/normalize-file-diffs");
const comments_1 = require("../github/comments");
const pull_requests_1 = require("../github/pull-requests");
const reviews_1 = require("../github/reviews");
const schemas_1 = require("../prompts/schemas");
const review_1 = require("../prompts/review");
const summary_1 = require("../prompts/summary");
const inline_comment_1 = require("../render/inline-comment");
const hidden_state_1 = require("../render/hidden-state");
const overview_comment_1 = require("../render/overview-comment");
const review_summary_1 = require("../render/review-summary");
const filters_1 = require("./filters");
const title_regeneration_1 = require("./title-regeneration");
class ReviewOrchestrator {
    constructor(options) {
        this.options = options;
    }
    async runPullRequestReview(request) {
        const { client, logger, provider, config, dryRun } = this.options;
        const reviewData = await (0, pull_requests_1.fetchPullRequestReviewData)(client, request.repoFullName, request.pullRequestNumber);
        const issueComments = await (0, comments_1.listIssueComments)(client, request.repoFullName, request.pullRequestNumber);
        const existingOverviewComment = (0, comments_1.findOverviewComment)(issueComments);
        const currentCommitShas = reviewData.commits.map((commit) => commit.sha);
        const reviewableFileDiffs = (0, normalize_file_diffs_1.filterReviewableFileDiffs)((0, normalize_file_diffs_1.normalizeFileDiffs)(reviewData.files));
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
        const finalPayload = (0, hidden_state_1.createHiddenPayload)(reviewData.pullRequest.headSha, reviewMode, currentCommitShas);
        logger.info('Fetched review inputs', {
            reviewMode,
            commitCount,
            fileCount: fileDiffs.length,
        });
        const loadingOverviewBody = (0, overview_comment_1.renderLoadingOverviewComment)({
            payload: loadingPayload,
            reviewMode,
        });
        let overviewCommentId = existingOverviewComment?.id;
        if (!dryRun) {
            overviewCommentId =
                existingOverviewComment && overviewCommentId !== undefined
                    ? await updateExistingOverviewComment(client, request.repoFullName, overviewCommentId, loadingOverviewBody)
                    : await (0, comments_1.createOverviewComment)(client, request.repoFullName, request.pullRequestNumber, loadingOverviewBody);
        }
        if (fileDiffs.length === 0) {
            const finalOverviewBody = (0, overview_comment_1.renderNoReviewableChangesComment)({ payload: finalPayload });
            if (!dryRun) {
                if (overviewCommentId !== undefined) {
                    await updateExistingOverviewComment(client, request.repoFullName, overviewCommentId, finalOverviewBody);
                }
                else {
                    overviewCommentId = await (0, comments_1.createOverviewComment)(client, request.repoFullName, request.pullRequestNumber, finalOverviewBody);
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
            prompt: (0, summary_1.buildSummaryPrompt)({
                title: reviewData.pullRequest.title,
                description: reviewData.pullRequest.body,
                fileDiffs,
            }),
            schema: schemas_1.SummaryOutputSchema,
            schemaName: 'PullRequestSummary',
            schemaDescription: 'Structured pull request summary',
            timeoutMs: config.LLM_TIMEOUT_MS,
            maxRetries: 2,
        });
        const summary = summaryResult.output;
        let updatedTitle;
        if (!dryRun && (0, title_regeneration_1.shouldRegenerateTitle)(reviewData.pullRequest.title)) {
            await (0, pull_requests_1.updatePullRequestTitle)(client, request.repoFullName, request.pullRequestNumber, summary.title);
            updatedTitle = summary.title;
        }
        else if ((0, title_regeneration_1.shouldRegenerateTitle)(reviewData.pullRequest.title)) {
            updatedTitle = summary.title;
        }
        const reviewResult = await provider.runInference({
            prompt: (0, review_1.buildReviewPrompt)(fileDiffs, config.STYLE_GUIDE_RULES),
            schema: schemas_1.ReviewOutputSchema,
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
        const actionableFindings = (0, filters_1.filterFindings)(rawFindings, fileDiffs);
        const inlineFindings = (0, filters_1.filterForInlinePosting)(actionableFindings);
        const skippedFindingCount = rawFindings.length - actionableFindings.length;
        const reviewBody = (0, review_summary_1.renderReviewSummary)({
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
            body: (0, inline_comment_1.renderInlineComment)(finding),
        }));
        let reviewId;
        if (!dryRun) {
            const submittedReview = await (0, reviews_1.submitReview)(client, request.repoFullName, request.pullRequestNumber, reviewBody, inlineComments, reviewResult.output.needsAttention);
            reviewId = submittedReview.reviewId;
        }
        const finalOverviewBody = (0, overview_comment_1.renderFinalOverviewComment)({
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
                await updateExistingOverviewComment(client, request.repoFullName, overviewCommentId, finalOverviewBody);
            }
            else {
                overviewCommentId = await (0, comments_1.createOverviewComment)(client, request.repoFullName, request.pullRequestNumber, finalOverviewBody);
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
    async resolveReviewPlan(input) {
        const fullLoadingPayload = input.existingPayload
            ? (0, hidden_state_1.createHiddenPayload)(input.existingPayload.lastReviewedCommit, 'full', input.existingPayload.reviewedCommits)
            : (0, hidden_state_1.createHiddenPayload)('', 'full', []);
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
        const lastReviewedCommitIndex = input.currentCommitShas.indexOf(input.existingPayload.lastReviewedCommit);
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
        const incrementalLoadingPayload = (0, hidden_state_1.createHiddenPayload)(input.existingPayload.lastReviewedCommit, 'incremental', input.existingPayload.reviewedCommits);
        if (newCommitShas.length === 0) {
            return {
                reviewMode: 'incremental',
                commitCount: 0,
                fileDiffs: [],
                loadingPayload: incrementalLoadingPayload,
                skipReason: 'No new commits since last review',
            };
        }
        const changedPaths = await this.getFilesChangedSinceCommit(input.repoFullName, input.existingPayload.lastReviewedCommit, input.currentHeadSha);
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
            fileDiffs: input.fileDiffs.filter((fileDiff) => changedPaths.has(fileDiff.path) ||
                (fileDiff.previousFilename !== undefined && changedPaths.has(fileDiff.previousFilename))),
            loadingPayload: incrementalLoadingPayload,
        };
    }
    async getFilesChangedSinceCommit(repoFullName, base, head) {
        try {
            const compare = await this.options.client.get(`/repos/${repoFullName}/compare/${base}...${head}`);
            if (!Array.isArray(compare.files)) {
                return new Set();
            }
            return new Set(compare.files.flatMap((file) => file.previous_filename ? [file.filename, file.previous_filename] : [file.filename]));
        }
        catch (error) {
            this.options.logger.warn(`Failed to fetch files changed since ${base}: ${error instanceof Error ? error.message : String(error)}`);
            return null;
        }
    }
}
exports.ReviewOrchestrator = ReviewOrchestrator;
async function updateExistingOverviewComment(client, repoFullName, commentId, body) {
    await (0, comments_1.updateOverviewComment)(client, repoFullName, commentId, body);
    return commentId;
}
//# sourceMappingURL=orchestrator.js.map