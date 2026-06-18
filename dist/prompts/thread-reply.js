"use strict";
/**
 * Thread reply prompt builders for over-review.
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildThreadReplyPrompt = buildThreadReplyPrompt;
function buildThreadReplyPrompt(input) {
    const { thread, styleGuideRules } = input;
    const promptLines = [
        'You are replying in a pull request review thread.',
        'Return structured JSON only.',
        'Use exactly these keys: action_requested and content.',
        'action_requested must be a boolean.',
        'When action_requested is false, content may be omitted.',
        'Do not use actionRequested.',
        '',
        'Requirements:',
        '- Focus on the latest comment in the thread.',
        '- Understand the full thread as context.',
        '- Keep the reply grounded in the visible diff and thread only.',
        '- Avoid generic filler and avoid repeating points already covered.',
        '- Return action_requested = false when no reply is needed.',
        `- When replying, start content with @${thread.latestComment.author}.`,
        '',
        styleGuideRules ? `Repository-specific rules:\n${styleGuideRules}` : null,
        '',
        thread.path ? `File: ${thread.path}` : null,
        thread.line ? `Line: ${thread.line}` : null,
        thread.diffHunk ? 'Diff hunk:' : null,
        thread.diffHunk ? '```diff' : null,
        thread.diffHunk ?? null,
        thread.diffHunk ? '```' : null,
        '',
        'Existing thread:',
        ...thread.comments.flatMap((comment) => [`@${comment.author}:`, comment.body, '']),
    ].filter((line) => line !== null);
    return promptLines.join('\n');
}
//# sourceMappingURL=thread-reply.js.map