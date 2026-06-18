"use strict";
/**
 * Inline comment renderer for over-review.
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderInlineComment = renderInlineComment;
const hidden_state_1 = require("./hidden-state");
function renderInlineComment(comment) {
    let content = `**${comment.title}**\n\n${comment.body}`;
    if (comment.replacementSnippet) {
        // Use GitHub suggestion block for ranged findings with replacement snippets
        if (comment.startLine !== undefined && comment.endLine !== undefined) {
            content += `\n\nSuggested replacement:\n\n\`\`\`suggestion\n${comment.replacementSnippet}\n\`\`\``;
        }
        else {
            // Fallback to plain code block for single-line or non-ranged findings
            content += `\n\nSuggested replacement:\n\n\`\`\`\n${comment.replacementSnippet}\n\`\`\``;
        }
    }
    return (0, hidden_state_1.appendInlineSignature)(content);
}
//# sourceMappingURL=inline-comment.js.map