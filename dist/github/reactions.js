"use strict";
/**
 * GitHub reactions helpers for over-review.
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.addReaction = addReaction;
async function addReaction(client, repoFullName, commentId, content) {
    await client.post(`/repos/${repoFullName}/issues/comments/${commentId}/reactions`, {
        content,
    });
}
//# sourceMappingURL=reactions.js.map