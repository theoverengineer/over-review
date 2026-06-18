"use strict";
/**
 * Review-thread reply orchestration.
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThreadReplyOrchestrator = void 0;
const comments_1 = require("../github/comments");
const schemas_1 = require("../prompts/schemas");
const thread_reply_1 = require("../prompts/thread-reply");
const hidden_state_1 = require("../render/hidden-state");
const reconstruct_1 = require("./reconstruct");
const relevance_1 = require("./relevance");
class ThreadReplyOrchestrator {
    constructor(options) {
        this.options = options;
    }
    async run(request) {
        const { client, provider, config, logger, dryRun } = this.options;
        const comments = await (0, comments_1.listReviewComments)(client, request.repoFullName, request.pullRequestNumber);
        const thread = (0, reconstruct_1.reconstructReviewThread)(comments, request.commentId);
        if (!thread) {
            logger.warn('Review thread could not be reconstructed', {
                reason: 'thread_not_found',
            });
            return {
                handled: false,
                relevant: false,
                actionRequested: false,
                reason: 'Review thread could not be reconstructed',
            };
        }
        if (!(0, relevance_1.isRelevantReviewThread)(thread)) {
            logger.info('Irrelevant review thread skipped', {
                reason: 'irrelevant_thread',
            });
            return {
                handled: true,
                relevant: false,
                actionRequested: false,
                reason: 'Irrelevant review thread',
            };
        }
        const inference = await provider.runInference({
            prompt: (0, thread_reply_1.buildThreadReplyPrompt)({
                thread,
                styleGuideRules: config.STYLE_GUIDE_RULES,
            }),
            schema: schemas_1.ThreadReplyOutputSchema,
            schemaName: 'ThreadReply',
            schemaDescription: 'Structured pull request review thread reply',
            timeoutMs: config.LLM_TIMEOUT_MS,
            maxRetries: 2,
        });
        const reply = inference.output;
        if (!shouldPostReply(reply)) {
            logger.info('No action requested for review thread', {
                reason: 'no_action_requested',
            });
            return {
                handled: true,
                relevant: true,
                actionRequested: false,
                reason: 'No action requested',
            };
        }
        const replyBody = (0, hidden_state_1.appendInlineSignature)(ensureLeadingMention(reply.content.trim(), thread.latestComment.author));
        let replyCommentId;
        if (!dryRun) {
            replyCommentId = await (0, comments_1.createReviewCommentReply)(client, request.repoFullName, request.pullRequestNumber, thread.replyToCommentId, replyBody);
        }
        logger.info('Review thread reply prepared', {
            reason: dryRun ? 'dry_run' : 'posted',
        });
        return {
            handled: true,
            relevant: true,
            actionRequested: true,
            replyBody,
            replyCommentId,
        };
    }
}
exports.ThreadReplyOrchestrator = ThreadReplyOrchestrator;
function shouldPostReply(reply) {
    return reply.action_requested && Boolean(reply.content?.trim());
}
function ensureLeadingMention(content, author) {
    const expectedMention = `@${author}`;
    return content.startsWith(expectedMention) ? content : `${expectedMention} ${content}`;
}
//# sourceMappingURL=reply-orchestrator.js.map