"use strict";
/**
 * Review prompt builders for over-review.
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildReviewPrompt = buildReviewPrompt;
const format_for_prompt_1 = require("../diff/format-for-prompt");
function buildReviewPrompt(fileDiffs, styleGuideRules) {
    const promptLines = [
        'You are reviewing a pull request diff for actionable issues.',
        'Return structured JSON only.',
        'Use exactly these top-level keys: reviewSummary, needsAttention, findings.',
        'Each findings entry must include path, line, severity, title, and body.',
        'Findings may also include startLine, endLine, and replacementSnippet when the diff supports them.',
        'severity must be either critical or non-critical.',
        'line must be a single positive integer line number that points to the most relevant added line.',
        'Include startLine and endLine only when the issue spans multiple added lines, and keep line within that range.',
        'Include replacementSnippet only when you can show the concrete replacement code visible from the diff; return code only, without markdown fences.',
        'Do not nest the response under review, metadata, or any other wrapper object.',
        'Do not use snake_case keys.',
        '',
        'Core rules:',
        '- Focus on newly added code.',
        '- Use diff-scoped reasoning only.',
        '- Avoid style-only and formatting-only comments.',
        '- Avoid duplicating an issue that already appears in an existing thread.',
        '- Produce line-anchored findings only when the evidence is visible in the diff.',
        '- Return review metadata even if there are no actionable findings.',
        '- Do not speculate about repository-wide behavior that is not shown here.',
        '',
        'Good findings include runtime bugs, regressions, missing validation, security issues, dangerous edge cases, and important user-facing typos.',
        '',
        styleGuideRules ? `Repository-specific rules:\n${styleGuideRules}` : null,
        '',
        'Normalized diff:',
        (0, format_for_prompt_1.formatDiffsForPrompt)(fileDiffs),
    ].filter((line) => line !== null);
    return promptLines.join('\n');
}
//# sourceMappingURL=review.js.map