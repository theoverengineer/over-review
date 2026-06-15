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
});
