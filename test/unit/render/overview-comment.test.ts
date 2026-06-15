import { describe, expect, it } from 'vitest';

import {
  renderFinalOverviewComment,
  renderLoadingOverviewComment,
} from '../../../src/render/overview-comment';
import { createHiddenPayload } from '../../../src/render/hidden-state';

describe('render/overview-comment', () => {
  it('renders a signed loading overview comment', () => {
    const comment = renderLoadingOverviewComment({
      payload: createHiddenPayload('abc123', 'full'),
      reviewMode: 'full',
    });

    expect(comment).toContain('## OverReview');
    expect(comment).toContain('Status: Running a full review.');
    expect(comment).toContain('<!-- overreview:overview -->');
  });

  it('renders the final overview comment with summary details', () => {
    const comment = renderFinalOverviewComment({
      payload: createHiddenPayload('abc123', 'full'),
      summary: {
        title: 'Add review orchestration',
        description: 'Introduces the automatic review pipeline.',
        fileSummaries: [{ path: 'src/review/orchestrator.ts', summary: 'Runs the review flow.' }],
        changeTypes: ['feature'],
      },
      review: {
        reviewSummary: 'One actionable issue was found.',
        needsAttention: true,
        findings: [],
      },
      fileCount: 1,
      commitCount: 2,
      actionableFindingCount: 1,
      inlineCommentCount: 1,
    });

    expect(comment).toContain('Add review orchestration');
    expect(comment).toContain('Needs attention: yes');
    expect(comment).toContain('`src/review/orchestrator.ts`');
    expect(comment).toContain('Change types: feature');
  });
});
