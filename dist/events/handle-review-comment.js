"use strict";
/**
 * Handle pull_request_review_comment events
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleReviewComment = handleReviewComment;
const guards_1 = require("../runtime/guards");
/**
 * Handle pull_request_review_comment event for thread replies.
 */
function handleReviewComment(event) {
    // Only handle 'created' actions per docs/spec
    if (event.action !== 'created') {
        return {
            type: 'skip',
            reason: `Unsupported pull_request_review_comment action: ${event.action}`,
            prNumber: event.pull_request.number,
        };
    }
    if ((0, guards_1.isBotComment)(event.comment.user?.login)) {
        return {
            type: 'skip',
            reason: 'Bot review comment ignored',
            prNumber: event.pull_request.number,
        };
    }
    return {
        type: 'review',
        reason: 'Review comment thread reply',
        prNumber: event.pull_request.number,
        actor: event.sender?.login || undefined,
    };
}
//# sourceMappingURL=handle-review-comment.js.map