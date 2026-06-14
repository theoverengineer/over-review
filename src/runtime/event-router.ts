/**
 * Event router for over-review.
 * @packageDocumentation
 */

import { handleIssueComment } from '../events/handle-issue-comment';
import { handlePullRequest } from '../events/handle-pull-request';
import { handleReviewComment } from '../events/handle-review-comment';
import { GitHubClient } from '../github/client';
import { fetchPullRequestIdentity } from '../github/pull-requests';
import { runTrustBoundaryGuards } from './guards';
import type {
  GitHubEvent,
  IssueCommentEvent,
  PullRequestEvent,
  ReviewCommentEvent,
  RouteResult,
  SupportedEventName,
} from './types';

export function isSupportedEvent(eventName: string): eventName is SupportedEventName {
  return ['pull_request', 'issue_comment', 'pull_request_review_comment'].includes(eventName);
}

export function getPrNumberFromEvent(event: GitHubEvent): number | undefined {
  if ('pull_request' in event) {
    return event.pull_request.number;
  }

  if ('issue' in event) {
    return event.issue.number;
  }

  return undefined;
}

/**
 * Route a GitHub event to the appropriate handler.
 * For issue_comment events that require PR identity lookup, this will
 * perform an API call to determine if the PR is from a fork.
 * @param event - GitHub event
 * @param eventName - Name of the event
 * @param client - Optional GitHub client for API calls
 * @returns Route result with outcome
 */
export async function routeEvent(
  event: GitHubEvent,
  eventName: string,
  client?: GitHubClient
): Promise<RouteResult> {
  if (!isSupportedEvent(eventName)) {
    return {
      handled: false,
      outcome: {
        type: 'unsupported',
        reason: `Unsupported event type: ${eventName}`,
      },
    };
  }

  const actor =
    event.sender?.login ?? ('comment' in event ? (event.comment?.user?.login ?? null) : null);
  const commentBody = 'comment' in event ? event.comment?.body : undefined;
  const guardDecision = runTrustBoundaryGuards(event, actor, commentBody);

  if (guardDecision.skipReason === 'fork-pr') {
    return {
      handled: true,
      outcome: {
        type: 'skip',
        reason: 'Fork PR silently skipped',
        prNumber: getPrNumberFromEvent(event),
        // resolvedPrIdentity is not included in the outcome for fork PRs
      },
    };
  }

  if (!guardDecision.allow) {
    return {
      handled: true,
      outcome: {
        type: 'skip',
        reason: guardDecision.skipReason ?? 'Skipped by guard',
        prNumber: getPrNumberFromEvent(event),
      },
    };
  }

  if (eventName === 'issue_comment') {
    const issueCommentEvent = event as IssueCommentEvent;
    const initialOutcome = handleIssueComment(issueCommentEvent);

    if (initialOutcome.type !== 'review') {
      return {
        handled: true,
        outcome: initialOutcome,
      };
    }

    if (guardDecision.requiresPullRequestLookup) {
      const pullRequestUrl = issueCommentEvent.issue.pull_request?.url;

      if (!pullRequestUrl) {
        return {
          handled: true,
          outcome: {
            type: 'skip',
            reason: 'Pull request identity lookup unavailable',
            prNumber: issueCommentEvent.issue.number,
          },
        };
      }

      const resolvedPrIdentity = await fetchPullRequestIdentity(
        client || new GitHubClient(),
        pullRequestUrl,
        issueCommentEvent.repository
      );

      if (!resolvedPrIdentity) {
        return {
          handled: true,
          outcome: {
            type: 'skip',
            reason: 'Pull request identity lookup failed',
            prNumber: issueCommentEvent.issue.number,
          },
        };
      }

      if (resolvedPrIdentity.isFork) {
        return {
          handled: true,
          outcome: {
            type: 'skip',
            reason: 'Fork PR silently skipped',
            prNumber: issueCommentEvent.issue.number,
          },
        };
      }

      return {
        handled: true,
        outcome: handleIssueComment(issueCommentEvent, {
          resolvedPrIdentity,
        }),
      };
    }

    return {
      handled: true,
      outcome: initialOutcome,
    };
  }

  switch (eventName) {
    case 'pull_request':
      return {
        handled: true,
        outcome: handlePullRequest(event as PullRequestEvent),
      };
    case 'pull_request_review_comment':
      return {
        handled: true,
        outcome: handleReviewComment(event as ReviewCommentEvent),
      };
  }
}
