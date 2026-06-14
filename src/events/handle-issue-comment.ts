/**
 * Handle issue_comment events.
 * @packageDocumentation
 */

import { isAuthorizedAssociation, isBotComment } from '../runtime/guards';
import type {
  EventOutcome,
  IssueCommentEvent,
  ManualReviewCommandName,
  ResolvedPullRequestIdentity,
} from '../runtime/types';

export interface ManualReviewCommand {
  command: ManualReviewCommandName;
  fullMode: boolean;
}

export interface IssueCommentHandlerOptions {
  resolvedPrIdentity?: ResolvedPullRequestIdentity;
}

export function parseManualReviewCommand(commentBody: string): ManualReviewCommand | null {
  const trimmed = commentBody.trim();
  const match = trimmed.match(/^\/(review|ai-review)(?:\s+(--full))?\s*$/i);

  if (!match) {
    return null;
  }

  return {
    command: `/${match[1].toLowerCase()}` as ManualReviewCommandName,
    fullMode: Boolean(match[2]),
  };
}

export function handleIssueComment(
  event: IssueCommentEvent,
  options: IssueCommentHandlerOptions = {}
): EventOutcome {
  if (event.action !== 'created') {
    return {
      type: 'skip',
      reason: `Unsupported issue_comment action: ${event.action}`,
      prNumber: event.issue.number,
    };
  }

  if (!event.issue.pull_request) {
    return {
      type: 'skip',
      reason: 'Issue comment is not on a pull request',
      prNumber: event.issue.number,
    };
  }

  if (isBotComment(event.comment?.user?.login)) {
    return {
      type: 'skip',
      reason: 'Bot comment ignored',
      prNumber: event.issue.number,
    };
  }

  const command = parseManualReviewCommand(event.comment?.body ?? '');

  if (!command) {
    return {
      type: 'skip',
      reason: 'Not a manual review command',
      prNumber: event.issue.number,
    };
  }

  const authorAssociation =
    event.comment?.author_association || event.issue.author_association || null;

  if (!isAuthorizedAssociation(authorAssociation)) {
    return {
      type: 'unauthorized',
      reason: `Unauthorized manual review command: ${command.command}`,
      prNumber: event.issue.number,
      actor: event.sender?.login || undefined,
      command: command.command,
      fullMode: command.fullMode,
      eyesReaction: true,
    };
  }

  // Check if PR is from a fork using resolved identity
  if (options.resolvedPrIdentity?.isFork) {
    return {
      type: 'skip',
      reason: 'Fork PR silently skipped',
      prNumber: event.issue.number,
    };
  }

  return {
    type: 'review',
    reason: `${command.command}${command.fullMode ? ' --full' : ''}`,
    prNumber: event.issue.number,
    actor: event.sender?.login || undefined,
    command: command.command,
    fullMode: command.fullMode,
  };
}
