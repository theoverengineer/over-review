/**
 * Runtime context for CLI execution.
 * @packageDocumentation
 */

import type { GitHubEvent, SupportedEventName } from './types';

export interface CliContext {
  runtime: 'cli';
  eventName: SupportedEventName | string;
  event: GitHubEvent;
  repo: string;
  prNumber?: number;
  actor: string | null;
  authorAssociation: string | null;
  commentBody?: string;
  isDryRun: boolean;
  outputPath?: string;
}

export function createCliContext(options: {
  eventName: SupportedEventName | string;
  event: GitHubEvent;
  dryRun?: boolean;
  outputPath?: string;
}): CliContext {
  const { eventName, event } = options;

  return {
    runtime: 'cli',
    eventName,
    event,
    repo: event.repository.full_name,
    prNumber: getPullRequestNumber(eventName, event),
    actor:
      event.sender?.login ?? ('comment' in event ? (event.comment?.user?.login ?? null) : null),
    authorAssociation: getAuthorAssociation(eventName, event),
    commentBody:
      eventName === 'issue_comment' || eventName === 'pull_request_review_comment'
        ? 'comment' in event
          ? event.comment?.body
          : undefined
        : undefined,
    isDryRun: options.dryRun ?? false,
    outputPath: options.outputPath,
  };
}

function getPullRequestNumber(
  eventName: SupportedEventName | string,
  event: GitHubEvent
): number | undefined {
  if (eventName === 'issue_comment') {
    return 'issue' in event ? event.issue.number : undefined;
  }

  return 'pull_request' in event ? event.pull_request.number : undefined;
}

function getAuthorAssociation(
  eventName: SupportedEventName | string,
  event: GitHubEvent
): string | null {
  if (eventName === 'issue_comment') {
    return 'issue' in event
      ? (event.comment?.author_association ?? event.issue.author_association ?? null)
      : null;
  }

  return 'comment' in event ? (event.comment?.author_association ?? null) : null;
}
