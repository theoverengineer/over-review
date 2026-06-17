/**
 * Review summary renderer for over-review.
 * @packageDocumentation
 */

import type { AIComment } from '../contracts/review';
import type { ReviewOutput } from '../prompts/schemas';

export interface ReviewSummaryInput {
  review: ReviewOutput;
  actionableFindings: AIComment[];
  inlineFindings: AIComment[];
  commitCount: number;
  fileCount: number;
  skippedFindingCount: number;
}

export function renderReviewSummary(input: ReviewSummaryInput): string {
  const nonInlineFindings = input.actionableFindings.filter(
    (finding) =>
      !input.inlineFindings.some(
        (inlineFinding) =>
          inlineFinding.path === finding.path && inlineFinding.line === finding.line
      )
  );

  const lines = [
    '## OverReview Summary',
    '',
    input.review.reviewSummary,
    '',
    `Needs attention: ${input.review.needsAttention ? 'yes' : 'no'}`,
    `Commits considered: ${input.commitCount}`,
    `Files processed: ${input.fileCount}`,
    `Actionable findings: ${input.actionableFindings.length}`,
    `Inline comments posted: ${input.inlineFindings.length}`,
    `Skipped findings: ${input.skippedFindingCount}`,
  ];

  if (nonInlineFindings.length > 0) {
    lines.push('', '### Additional Findings');

    for (const finding of nonInlineFindings) {
      lines.push(
        `- [${finding.severity}] \`${finding.path}:${renderLineRange(finding)}\` ${finding.title}: ${finding.body}`
      );

      if (finding.replacementSnippet) {
        lines.push('', 'Suggested replacement:', '```', finding.replacementSnippet, '```');
      }
    }
  }

  return lines.join('\n');
}

function renderLineRange(finding: { line: number; startLine?: number; endLine?: number }): string {
  if (finding.startLine !== undefined && finding.endLine !== undefined) {
    if (finding.startLine === finding.endLine) {
      return `${finding.startLine}`;
    }
    return `${finding.startLine}-${finding.endLine}`;
  }
  return `${finding.line}`;
}
