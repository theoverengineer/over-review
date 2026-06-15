/**
 * Summary prompt builder for over-review.
 * @packageDocumentation
 */

import type { FileDiff } from '../contracts/review';
import { formatDiffsForPrompt } from '../diff/format-for-prompt';

export interface SummaryPromptInput {
  title?: string;
  description?: string;
  fileDiffs: FileDiff[];
}

export function buildSummaryPrompt(input: SummaryPromptInput): string {
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
    formatDiffsForPrompt(input.fileDiffs),
  ].filter((line): line is string => line !== null);

  return prompt.join('\n');
}
