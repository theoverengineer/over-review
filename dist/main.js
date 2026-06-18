"use strict";
/**
 * over-review GitHub Action entrypoint.
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const node_fs_1 = require("node:fs");
const config_1 = require("./config");
const client_1 = require("./github/client");
const reactions_1 = require("./github/reactions");
const providers_1 = require("./providers");
const orchestrator_1 = require("./review/orchestrator");
const reply_orchestrator_1 = require("./threads/reply-orchestrator");
const action_context_1 = require("./runtime/action-context");
const event_router_1 = require("./runtime/event-router");
const logger_1 = require("./runtime/logger");
async function main() {
    const eventName = process.env.GITHUB_EVENT_NAME;
    const eventPath = process.env.GITHUB_EVENT_PATH;
    if (!eventName) {
        throw new Error('GITHUB_EVENT_NAME is not set.');
    }
    if (!eventPath) {
        throw new Error('GITHUB_EVENT_PATH is not set.');
    }
    const config = (0, config_1.loadConfig)();
    const event = loadEventPayload(eventPath);
    const context = (0, action_context_1.createActionContext)(eventName, event);
    const logger = (0, logger_1.createLogger)({
        eventName,
        repo: context.repo,
        prNumber: context.prNumber,
        dryRun: config.DRY_RUN,
        provider: config.LLM_PROVIDER,
        model: config.LLM_MODEL,
    }, config.DEBUG ? 'debug' : 'info');
    logger.info('Starting action run');
    const client = new client_1.GitHubClient({
        token: config.GITHUB_TOKEN,
        baseUrl: config.GITHUB_API_URL,
        debug: config.DEBUG,
    });
    const provider = (0, providers_1.createProvider)({
        provider: config.LLM_PROVIDER,
        model: config.LLM_MODEL,
        apiKey: config.LLM_API_KEY,
        baseUrl: config.LLM_BASE_URL,
        structuredOutputs: config.LLM_STRUCTURED_OUTPUTS,
    });
    const result = await (0, event_router_1.routeEvent)(event, eventName, client);
    if (result.outcome.type === 'unauthorized' && result.outcome.eyesReaction) {
        if (eventName === 'issue_comment' && 'comment' in event && event.comment) {
            await (0, reactions_1.addReaction)(client, event.repository.full_name, event.comment.id, 'eyes');
        }
    }
    if (result.outcome.type === 'review') {
        if (eventName === 'pull_request' && 'pull_request' in event) {
            const orchestrator = new orchestrator_1.ReviewOrchestrator({
                client,
                provider,
                config,
                logger,
                dryRun: config.DRY_RUN,
            });
            const reviewResult = await orchestrator.runPullRequestReview({
                repoFullName: event.repository.full_name,
                pullRequestNumber: event.pull_request.number,
                forceFullReview: result.outcome.fullMode || config.FULL_REVIEW,
            });
            logger.info('Automatic review finished', {
                reviewMode: reviewResult.reviewMode,
                commitCount: reviewResult.commitCount,
                fileCount: reviewResult.fileCount,
                submittedCommentCount: reviewResult.inlineFindings.length,
                skippedCommentCount: reviewResult.skippedFindingCount,
                summarySuccess: Boolean(reviewResult.summary),
            });
        }
        else if (eventName === 'issue_comment' && 'issue' in event) {
            const orchestrator = new orchestrator_1.ReviewOrchestrator({
                client,
                provider,
                config,
                logger,
                dryRun: config.DRY_RUN,
            });
            const reviewResult = await orchestrator.runPullRequestReview({
                repoFullName: event.repository.full_name,
                pullRequestNumber: event.issue.number,
                forceFullReview: result.outcome.fullMode || config.FULL_REVIEW,
            });
            logger.info('Manual review finished', {
                reviewMode: reviewResult.reviewMode,
                commitCount: reviewResult.commitCount,
                fileCount: reviewResult.fileCount,
                submittedCommentCount: reviewResult.inlineFindings.length,
                skippedCommentCount: reviewResult.skippedFindingCount,
                summarySuccess: Boolean(reviewResult.summary),
            });
        }
        else if (eventName === 'pull_request_review_comment' && 'comment' in event) {
            const orchestrator = new reply_orchestrator_1.ThreadReplyOrchestrator({
                client,
                provider,
                config,
                logger,
                dryRun: config.DRY_RUN,
            });
            const replyResult = await orchestrator.run({
                repoFullName: event.repository.full_name,
                pullRequestNumber: event.pull_request.number,
                commentId: event.comment.id,
            });
            logger.info('Thread reply finished', {
                outcome: replyResult.actionRequested ? 'reply_posted' : 'reply_skipped',
                reason: replyResult.reason,
            });
        }
    }
    logger.info('Action run completed', {
        outcome: result.outcome.type,
        reason: result.outcome.reason,
    });
    if (!result.handled) {
        logger.warn('Event was not handled', {
            outcome: result.outcome.type,
            reason: result.outcome.reason,
        });
    }
}
function loadEventPayload(eventPath) {
    try {
        return JSON.parse((0, node_fs_1.readFileSync)(eventPath, 'utf8'));
    }
    catch (error) {
        throw Object.assign(new Error(`Failed to read GitHub event payload from ${eventPath}: ${error instanceof Error ? error.message : String(error)}`), { cause: error });
    }
}
if (require.main === module) {
    void main().catch((error) => {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
    });
}
//# sourceMappingURL=main.js.map