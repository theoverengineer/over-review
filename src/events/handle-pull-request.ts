/**
 * Handle pull_request events
 * @packageDocumentation
 */

import type { EventOutcome, PullRequestEvent } from '../runtime/types';

/**
 * Handle pull_request event for automatic review.
 */
export function handlePullRequest(event: PullRequestEvent): EventOutcome {
  const supportedActions = new Set(['opened', 'synchronize']);

  if (!supportedActions.has(event.action)) {
    return {
      type: 'skip',
      reason: `Unsupported pull_request action: ${event.action}`,
      prNumber: event.pull_request.number,
    };
  }

  return {
    type: 'review',
    reason: 'Automatic review from pull_request event',
    prNumber: event.pull_request.number,
    actor: event.sender?.login || undefined,
  };
}
