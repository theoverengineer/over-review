"use strict";
/**
 * GitHub comments helpers for over-review.
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.listIssueComments = listIssueComments;
exports.findOverviewComment = findOverviewComment;
exports.createOverviewComment = createOverviewComment;
exports.updateOverviewComment = updateOverviewComment;
exports.listReviewComments = listReviewComments;
exports.createReviewCommentReply = createReviewCommentReply;
const hidden_state_1 = require("../render/hidden-state");
async function listIssueComments(client, repoFullName, issueNumber) {
    return client.get(`/repos/${repoFullName}/issues/${issueNumber}/comments?per_page=100`);
}
function findOverviewComment(comments) {
    for (const comment of comments) {
        if (!(0, hidden_state_1.hasOverviewSignature)(comment.body)) {
            continue;
        }
        return {
            id: comment.id,
            body: comment.body,
            cleanedBody: (0, hidden_state_1.stripHiddenMetadata)(comment.body),
            payload: (0, hidden_state_1.decodeHiddenState)(comment.body),
        };
    }
    return null;
}
async function createOverviewComment(client, repoFullName, issueNumber, body) {
    const response = await client.post(`/repos/${repoFullName}/issues/${issueNumber}/comments`, { body });
    return response.id;
}
async function updateOverviewComment(client, repoFullName, commentId, body) {
    await client.patch(`/repos/${repoFullName}/issues/comments/${commentId}`, { body });
}
async function listReviewComments(client, repoFullName, pullRequestNumber) {
    return client.get(`/repos/${repoFullName}/pulls/${pullRequestNumber}/comments?per_page=100`);
}
async function createReviewCommentReply(client, repoFullName, pullRequestNumber, inReplyTo, body) {
    const response = await client.post(`/repos/${repoFullName}/pulls/${pullRequestNumber}/comments`, {
        body,
        in_reply_to: inReplyTo,
    });
    return response.id;
}
//# sourceMappingURL=comments.js.map