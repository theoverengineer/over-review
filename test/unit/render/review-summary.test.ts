import { describe, expect, it } from 'vitest';

import { renderReviewSummary } from '../../../src/render/review-summary';

describe('render/review-summary', () => {
  it('renders review metadata and non-inline findings', () => {
    const summary = renderReviewSummary({
      review: {
        reviewSummary: 'One actionable issue was found.',
        needsAttention: true,
        findings: [],
      },
      actionableFindings: [
        {
          path: 'src/main.ts',
          line: 42,
          severity: 'non-critical',
          title: 'Guard missing before property access',
          body: 'The code dereferences a nullable value.',
        },
      ],
      inlineFindings: [],
      commitCount: 3,
      fileCount: 2,
      skippedFindingCount: 1,
    });

    expect(summary).toContain('Needs attention: yes');
    expect(summary).toContain('Commits considered: 3');
    expect(summary).toContain('### Additional Findings');
  });

  it('renders line ranges when startLine and endLine are present', () => {
    const summary = renderReviewSummary({
      review: {
        reviewSummary: 'One actionable issue was found.',
        needsAttention: true,
        findings: [],
      },
      actionableFindings: [
        {
          path: 'src/main.ts',
          line: 42,
          startLine: 40,
          endLine: 45,
          severity: 'non-critical',
          title: 'Guard missing before property access',
          body: 'The code dereferences a nullable value.',
        },
      ],
      inlineFindings: [],
      commitCount: 3,
      fileCount: 2,
      skippedFindingCount: 1,
    });

    expect(summary).toContain('src/main.ts:40-45');
  });

  it('renders single line range when startLine equals endLine', () => {
    const summary = renderReviewSummary({
      review: {
        reviewSummary: 'One actionable issue was found.',
        needsAttention: true,
        findings: [],
      },
      actionableFindings: [
        {
          path: 'src/main.ts',
          line: 42,
          startLine: 42,
          endLine: 42,
          severity: 'non-critical',
          title: 'Guard missing before property access',
          body: 'The code dereferences a nullable value.',
        },
      ],
      inlineFindings: [],
      commitCount: 3,
      fileCount: 2,
      skippedFindingCount: 1,
    });

    expect(summary).toContain('src/main.ts:42');
  });

  it('renders replacement snippets when present', () => {
    const summary = renderReviewSummary({
      review: {
        reviewSummary: 'One actionable issue was found.',
        needsAttention: true,
        findings: [],
      },
      actionableFindings: [
        {
          path: 'src/main.ts',
          line: 42,
          startLine: 40,
          endLine: 45,
          replacementSnippet: '-const value = input;\n+const value = input?.trim() ?? "";',
          severity: 'non-critical',
          title: 'Guard missing before property access',
          body: 'The code dereferences a nullable value.',
        },
      ],
      inlineFindings: [],
      commitCount: 3,
      fileCount: 2,
      skippedFindingCount: 1,
    });

    expect(summary).toContain('src/main.ts:40-45');
    expect(summary).toContain('Suggested replacement:');
    expect(summary).toContain('const value = input?.trim() ?? "";');
  });
});
