/**
 * Handle pull_request_review_comment events
 * @packageDocumentation
 */

import { isBotComment } from '../runtime/guards';
import type { EventOutcome, ReviewCommentEvent } from '../runtime/types';

/**
 * Handle pull_request_review_comment event for thread replies.
 */
export function handleReviewComment(event: ReviewCommentEvent): EventOutcome {
  // Only handle 'created' actions per docs/spec
  if (event.action !== 'created') {
    return {
      type: 'skip',
      reason: `Unsupported pull_request_review_comment action: ${event.action}`,
      prNumber: event.pull_request.number,
    };
  }

  if (isBotComment(event.comment.user?.login)) {
    return {
      type: 'skip',
      reason: 'Bot review comment ignored',
      prNumber: event.pull_request.number,
    };
  }

  return {
    type: 'review',
    reason: 'Review comment thread reply',
    prNumber: event.pull_request.number,
    actor: event.sender?.login || undefined,
  };
}
