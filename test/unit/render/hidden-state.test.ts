import { describe, expect, it } from 'vitest';

import {
  appendInlineSignature,
  appendOverviewMetadata,
  createHiddenPayload,
  decodeHiddenState,
  hasOverviewSignature,
  stripHiddenMetadata,
} from '../../../src/render/hidden-state';

describe('render/hidden-state', () => {
  it('appends overview metadata and decodes it again', () => {
    const payload = createHiddenPayload('abc123', 'full');
    const body = appendOverviewMetadata('Summary body', payload);

    expect(hasOverviewSignature(body)).toBe(true);
    expect(decodeHiddenState(body)).toEqual(payload);
  });

  it('strips hidden metadata from rendered content', () => {
    const body = appendOverviewMetadata('Summary body', createHiddenPayload('abc123', 'full'));

    expect(stripHiddenMetadata(body)).toBe('Summary body');
  });

  it('appends an inline signature marker', () => {
    expect(appendInlineSignature('Inline body')).toContain('<!-- overreview:inline -->');
  });

  it('creates fresh payload for full review with no prior state', () => {
    const payload = createHiddenPayload('abc123', 'full');

    expect(payload).toEqual({
      version: 1,
      reviewedCommits: ['abc123'],
      lastReviewedCommit: 'abc123',
      mode: 'full',
    });
  });

  it('uses explicit reviewed commits when provided', () => {
    const payload = createHiddenPayload('def456', 'incremental', ['abc123', 'bcd234', 'def456']);

    expect(payload).toEqual({
      version: 1,
      reviewedCommits: ['abc123', 'bcd234', 'def456'],
      lastReviewedCommit: 'def456',
      mode: 'incremental',
    });
  });

  it('allows empty loading-state payloads without marking any commit reviewed', () => {
    const payload = createHiddenPayload('', 'full', []);

    expect(payload).toEqual({
      version: 1,
      reviewedCommits: [],
      lastReviewedCommit: '',
      mode: 'full',
    });
  });
});
