import { describe, expect, it, vi } from 'vitest';

import type { GitHubClient } from '../../../src/github/client';
import { submitReview } from '../../../src/github/reviews';

describe('submitReview', () => {
  it('downgrades own-PR request-changes reviews to comment reviews', async () => {
    const post = vi
      .fn()
      .mockRejectedValueOnce(
        new Error(
          'GitHub API error 422: Unprocessable Entity: "Review Can not request changes on your own pull request"'
        )
      )
      .mockResolvedValueOnce({ id: 10, comments: [{ id: 20 }] });

    const client = { post } as unknown as GitHubClient;

    const result = await submitReview(
      client,
      'owner/repo',
      123,
      'body',
      [
        {
          body: 'inline',
          path: 'src/main.ts',
          line: 2,
        },
      ],
      true
    );

    expect(result).toEqual({
      reviewId: 10,
      inlineCommentIds: [20],
    });

    expect(post).toHaveBeenNthCalledWith(
      1,
      '/repos/owner/repo/pulls/123/reviews',
      expect.objectContaining({
        event: 'REQUEST_CHANGES',
      })
    );
    expect(post).toHaveBeenNthCalledWith(2, '/repos/owner/repo/pulls/123/reviews', {
      body: 'body',
      event: 'COMMENT',
      comments: [
        {
          body: 'inline',
          path: 'src/main.ts',
          line: 2,
          side: 'RIGHT',
        },
      ],
    });
  });
});
