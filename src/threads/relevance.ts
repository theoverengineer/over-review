/**
 * Review thread relevance rules.
 * @packageDocumentation
 */

import type { ReviewThread } from '../contracts/review';

const OVER_REVIEW_MENTION_PATTERN = /(^|[^\w])@over-?review\b/i;

export function isRelevantReviewThread(thread: ReviewThread): boolean {
  return hasBotParticipation(thread) || mentionsOverReview(thread.latestComment.body);
}

export function mentionsOverReview(body: string): boolean {
  return OVER_REVIEW_MENTION_PATTERN.test(body);
}

function hasBotParticipation(thread: ReviewThread): boolean {
  return thread.comments.some((comment) => comment.isBot);
}
