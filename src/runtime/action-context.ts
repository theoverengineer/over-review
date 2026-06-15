/**
 * Runtime context for GitHub Actions execution.
 * @packageDocumentation
 */

import type { GitHubEvent, SupportedEventName } from './types';

export interface ActionContext {
  runtime: 'action';
  eventName: SupportedEventName | string;
  event: GitHubEvent;
  repo: string;
  prNumber?: number;
  actor: string | null;
  authorAssociation: string | null;
  commentBody?: string;
  isDryRun: false;
}

export function createActionContext(
  eventName: SupportedEventName | string,
  event: GitHubEvent
): ActionContext {
  return {
    runtime: 'action',
    eventName,
    event,
    repo: event.repository.full_name,
    prNumber: getPullRequestNumber(event, eventName),
    actor: getActor(event),
    authorAssociation: getAuthorAssociation(event, eventName),
    commentBody: getCommentBody(event, eventName),
    isDryRun: false,
  };
}

function getPullRequestNumber(
  event: GitHubEvent,
  eventName: SupportedEventName | string
): number | undefined {
  switch (eventName) {
    case 'pull_request':
    case 'pull_request_review_comment':
      return 'pull_request' in event ? event.pull_request.number : undefined;
    case 'issue_comment':
      return 'issue' in event ? event.issue.number : undefined;
    default:
      return 'pull_request' in event ? event.pull_request.number : undefined;
  }
}

function getActor(event: GitHubEvent): string | null {
  return event.sender?.login ?? ('comment' in event ? (event.comment?.user?.login ?? null) : null);
}

function getAuthorAssociation(
  event: GitHubEvent,
  eventName: SupportedEventName | string
): string | null {
  switch (eventName) {
    case 'issue_comment':
      return 'issue' in event
        ? (event.comment?.author_association ?? event.issue.author_association ?? null)
        : null;
    case 'pull_request_review_comment':
      return 'comment' in event ? (event.comment?.author_association ?? null) : null;
    default:
      return null;
  }
}

function getCommentBody(
  event: GitHubEvent,
  eventName: SupportedEventName | string
): string | undefined {
  if (eventName === 'issue_comment' || eventName === 'pull_request_review_comment') {
    return 'comment' in event ? event.comment?.body : undefined;
  }

  return undefined;
}
