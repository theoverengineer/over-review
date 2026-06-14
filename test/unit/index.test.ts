import { describe, expect, it } from 'vitest';

import * as overReview from '../../src/index';

describe('index exports', () => {
  it('exposes the main milestone entrypoints', () => {
    expect(overReview.routeEvent).toBeTypeOf('function');
    expect(overReview.main).toBeTypeOf('function');
    expect(overReview.handleIssueComment).toBeTypeOf('function');
  });
});
