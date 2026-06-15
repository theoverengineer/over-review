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
});
