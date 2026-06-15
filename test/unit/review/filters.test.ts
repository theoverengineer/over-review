import { describe, expect, it } from 'vitest';

import type { FileDiff } from '../../../src/contracts/review';
import {
  deduplicateFindings,
  filterActionableOnly,
  filterDiffScoped,
  filterFindings,
  filterForInlinePosting,
} from '../../../src/review/filters';

const fileDiffs: FileDiff[] = [
  {
    path: 'src/file.ts',
    status: 'modified',
    patch: '@@ -1,1 +1,2 @@\n line\n+added',
    hunks: [
      {
        header: '@@ -1,1 +1,2 @@',
        startLine: 1,
        endLine: 2,
        diff: '@@ -1,1 +1,2 @@\n line\n+added',
        reviewableLines: [2],
        commentThreads: [],
      },
    ],
  },
];

describe('review/filters', () => {
  it('filters style-only findings', () => {
    expect(
      filterActionableOnly([
        {
          path: 'src/file.ts',
          line: 2,
          severity: 'non-critical',
          title: 'Formatting issue',
          body: 'This is a formatting issue.',
        },
      ])
    ).toEqual([]);
  });

  it('keeps only findings anchored to reviewable diff lines', () => {
    const filtered = filterDiffScoped(
      [
        {
          path: 'src/file.ts',
          line: 2,
          severity: 'critical',
          title: 'Valid finding',
          body: 'This line was added.',
        },
        {
          path: 'src/file.ts',
          line: 3,
          severity: 'critical',
          title: 'Invalid finding',
          body: 'This line was not added.',
        },
      ],
      fileDiffs
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0].title).toBe('Valid finding');
  });

  it('deduplicates findings by anchor and title', () => {
    const findings = deduplicateFindings([
      {
        path: 'src/file.ts',
        line: 2,
        severity: 'critical',
        title: 'Same issue',
        body: 'First copy.',
      },
      {
        path: 'src/file.ts',
        line: 2,
        severity: 'critical',
        title: 'Same issue',
        body: 'Second copy.',
      },
    ]);

    expect(findings).toHaveLength(1);
  });

  it('posts only critical findings and important typos inline', () => {
    expect(
      filterForInlinePosting([
        {
          path: 'src/file.ts',
          line: 2,
          severity: 'critical',
          title: 'Critical issue',
          body: 'This is critical.',
        },
        {
          path: 'src/file.ts',
          line: 2,
          severity: 'non-critical',
          title: 'Performance note',
          body: 'This is non-critical.',
        },
      ])
    ).toHaveLength(1);
  });

  it('runs the combined filter pipeline', () => {
    const findings = filterFindings(
      [
        {
          path: 'src/file.ts',
          line: 2,
          severity: 'critical',
          title: 'Real issue',
          body: 'This can throw.',
        },
        {
          path: 'src/file.ts',
          line: 2,
          severity: 'critical',
          title: 'Formatting note',
          body: 'Formatting only.',
        },
      ],
      fileDiffs
    );

    expect(findings).toHaveLength(1);
    expect(findings[0].title).toBe('Real issue');
  });
});
