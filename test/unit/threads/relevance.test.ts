import { describe, expect, it } from 'vitest';

import type { ReviewThread } from '../../../src/contracts/review';
import { isRelevantReviewThread, mentionsOverReview } from '../../../src/threads/relevance';

describe('threads/relevance', () => {
  it('recognizes explicit @overreview mentions', () => {
    expect(mentionsOverReview('Could @overreview take another look?')).toBe(true);
    expect(mentionsOverReview('Could @over-review take another look?')).toBe(true);
  });

  it('treats a thread as relevant when the bot already participated', () => {
    const thread: ReviewThread = {
      replyToCommentId: 2,
      comments: [
        { author: 'over-review[bot]', body: 'Prior comment', isBot: true },
        { author: 'contributor', body: 'Can you clarify?', isBot: false },
      ],
      latestComment: { author: 'contributor', body: 'Can you clarify?', isBot: false },
    };

    expect(isRelevantReviewThread(thread)).toBe(true);
  });

  it('treats a thread as relevant when the latest comment mentions the bot', () => {
    const thread: ReviewThread = {
      replyToCommentId: 2,
      comments: [
        { author: 'reviewer', body: 'Original thread', isBot: false },
        { author: 'contributor', body: '@overreview can you confirm?', isBot: false },
      ],
      latestComment: { author: 'contributor', body: '@overreview can you confirm?', isBot: false },
    };

    expect(isRelevantReviewThread(thread)).toBe(true);
  });

  it('skips irrelevant threads', () => {
    const thread: ReviewThread = {
      replyToCommentId: 2,
      comments: [
        { author: 'reviewer', body: 'Original thread', isBot: false },
        { author: 'contributor', body: 'Thanks, fixed.', isBot: false },
      ],
      latestComment: { author: 'contributor', body: 'Thanks, fixed.', isBot: false },
    };

    expect(isRelevantReviewThread(thread)).toBe(false);
  });
});
