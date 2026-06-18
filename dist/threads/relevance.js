"use strict";
/**
 * Review thread relevance rules.
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRelevantReviewThread = isRelevantReviewThread;
exports.mentionsOverReview = mentionsOverReview;
const OVER_REVIEW_MENTION_PATTERN = /(^|[^\w])@over-?review\b/i;
function isRelevantReviewThread(thread) {
    return hasBotParticipation(thread) || mentionsOverReview(thread.latestComment.body);
}
function mentionsOverReview(body) {
    return OVER_REVIEW_MENTION_PATTERN.test(body);
}
function hasBotParticipation(thread) {
    return thread.comments.some((comment) => comment.isBot);
}
//# sourceMappingURL=relevance.js.map