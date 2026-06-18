"use strict";
/**
 * Summary prompt builder for over-review.
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSummaryPrompt = buildSummaryPrompt;
const format_for_prompt_1 = require("../diff/format-for-prompt");
function buildSummaryPrompt(input) {
    const prompt = [
        'You are reviewing a pull request summary.',
        'Return structured JSON only.',
        'Use exactly these top-level keys: title, description, fileSummaries, changeTypes.',
        'Each fileSummaries entry must use exactly these keys: path, summary.',
        'changeTypes must only contain values from: feature, bugfix, refactor, docs, test, chore.',
        'Do not use snake_case keys.',
        '',
        'Requirements:',
        '- Generate a concise, implementation-relevant title.',
        '- Generate a PR description grounded in the visible diff.',
        '- Return one file summary entry for every changed file shown in the diff.',
        '- Classify the change into one or more of: feature, bugfix, refactor, docs, test, chore.',
        '- Treat the current title and description as hints, not truth.',
        '- Do not assume behavior outside the diff.',
        '',
        input.title ? `Current PR title hint: ${input.title}` : null,
        input.description ? `Current PR description hint: ${input.description}` : null,
        '',
        'Normalized diff:',
        (0, format_for_prompt_1.formatDiffsForPrompt)(input.fileDiffs),
    ].filter((line) => line !== null);
    return prompt.join('\n');
}
//# sourceMappingURL=summary.js.map