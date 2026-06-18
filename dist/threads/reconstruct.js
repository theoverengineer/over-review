"use strict";
/**
 * Review thread reconstruction helpers.
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.reconstructReviewThread = reconstructReviewThread;
const hidden_state_1 = require("../render/hidden-state");
const guards_1 = require("../runtime/guards");
function reconstructReviewThread(comments, triggeredCommentId) {
    const commentMap = new Map(comments.map((comment) => [comment.id, comment]));
    const triggeredComment = commentMap.get(triggeredCommentId);
    if (!triggeredComment) {
        return null;
    }
    const rootCommentId = findRootCommentId(triggeredComment, commentMap);
    const rootComment = commentMap.get(rootCommentId) ?? triggeredComment;
    const threadRecords = comments
        .filter((comment) => findRootCommentId(comment, commentMap) === rootCommentId)
        .sort(compareComments);
    const threadComments = threadRecords.map(toThreadComment);
    const latestComment = threadComments[threadComments.length - 1];
    if (!latestComment) {
        return null;
    }
    return {
        replyToCommentId: triggeredComment.id,
        path: triggeredComment.path ?? rootComment.path,
        line: triggeredComment.line ??
            triggeredComment.original_line ??
            rootComment.line ??
            rootComment.original_line ??
            null,
        diffHunk: triggeredComment.diff_hunk ?? rootComment.diff_hunk,
        comments: threadComments,
        latestComment,
    };
}
function findRootCommentId(comment, commentMap) {
    const visited = new Set();
    let current = comment;
    while (current.in_reply_to_id) {
        if (visited.has(current.id)) {
            break;
        }
        visited.add(current.id);
        const parent = commentMap.get(current.in_reply_to_id);
        if (!parent) {
            break;
        }
        current = parent;
    }
    return current.id;
}
function compareComments(left, right) {
    const leftCreatedAt = left.created_at ? Date.parse(left.created_at) : Number.NaN;
    const rightCreatedAt = right.created_at ? Date.parse(right.created_at) : Number.NaN;
    if (!Number.isNaN(leftCreatedAt) &&
        !Number.isNaN(rightCreatedAt) &&
        leftCreatedAt !== rightCreatedAt) {
        return leftCreatedAt - rightCreatedAt;
    }
    return left.id - right.id;
}
function toThreadComment(comment) {
    return {
        author: comment.user?.login ?? 'unknown',
        body: (0, hidden_state_1.stripHiddenMetadata)(comment.body),
        isBot: (0, guards_1.isBotComment)(comment.user?.login) || hasOverReviewSignature(comment.body),
    };
}
function hasOverReviewSignature(body) {
    return body.includes(hidden_state_1.INLINE_SIGNATURE) || body.includes(hidden_state_1.OVERVIEW_SIGNATURE);
}
//# sourceMappingURL=reconstruct.js.map