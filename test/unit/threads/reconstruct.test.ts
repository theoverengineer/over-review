import { describe, expect, it } from 'vitest';

import type { PullRequestReviewCommentRecord } from '../../../src/contracts/review';
import { reconstructReviewThread } from '../../../src/threads/reconstruct';

describe('threads/reconstruct', () => {
  it('rebuilds a thread around the triggered comment', () => {
    const comments: PullRequestReviewCommentRecord[] = [
      {
        id: 10,
        body: 'Initial bot comment\n\n<!-- overreview:inline -->',
        user: { login: 'github-actions[bot]' },
        path: 'src/main.ts',
        line: 8,
        diff_hunk: '@@ -7,0 +8,1 @@',
        created_at: '2026-01-01T00:00:00Z',
      },
      {
        id: 11,
        body: '@overreview can you explain why this matters?',
        user: { login: 'contributor' },
        in_reply_to_id: 10,
        created_at: '2026-01-01T00:01:00Z',
      },
    ];

    const thread = reconstructReviewThread(comments, 11);

    expect(thread).not.toBeNull();
    expect(thread?.replyToCommentId).toBe(11);
    expect(thread?.path).toBe('src/main.ts');
    expect(thread?.line).toBe(8);
    expect(thread?.comments).toHaveLength(2);
    expect(thread?.comments[0]?.isBot).toBe(true);
    expect(thread?.latestComment.author).toBe('contributor');
  });

  it('returns null when the triggered comment is missing', () => {
    expect(reconstructReviewThread([], 999)).toBeNull();
  });
});
