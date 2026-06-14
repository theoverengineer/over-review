/**
 * Trust boundary guards for over-review.
 * @packageDocumentation
 */

import type { GitHubEvent, PullRequestEvent, ReviewCommentEvent } from './types';

export const AUTHORIZED_ASSOCIATIONS = ['OWNER', 'MEMBER', 'COLLABORATOR'] as const;
export type AuthorizedAssociation = (typeof AUTHORIZED_ASSOCIATIONS)[number];
export type PullRequestSource = 'same-repo' | 'fork' | 'unknown' | 'not-pull-request';

export interface GuardDecision {
  allow: boolean;
  skipReason?: 'bot-actor' | 'ignore-marker' | 'fork-pr';
  requiresPullRequestLookup?: boolean;
}

export function isBotActor(actor: string | null | undefined): boolean {
  return Boolean(actor && actor.toLowerCase().includes('[bot]'));
}

export function isBotComment(userLogin: string | null | undefined): boolean {
  return Boolean(userLogin && userLogin.toLowerCase().includes('[bot]'));
}

export function hasIgnoreMarker(content: string): boolean {
  const markers = ['@overreview skip', '@overreview ignore', '<!-- overreview:ignore -->'];
  return markers.some((marker) => content.includes(marker));
}

function getPullRequestSourceFromPullRequest(
  event: PullRequestEvent | ReviewCommentEvent
): PullRequestSource {
  const headRepo = event.pull_request.head.repo?.full_name;
  const baseRepo = event.pull_request.base.repo?.full_name;

  if (!headRepo || !baseRepo) {
    return 'unknown';
  }

  return headRepo === baseRepo ? 'same-repo' : 'fork';
}

export function getPullRequestSource(event: GitHubEvent): PullRequestSource {
  if ('issue' in event) {
    return event.issue.pull_request ? 'unknown' : 'not-pull-request';
  }

  if ('pull_request' in event) {
    return getPullRequestSourceFromPullRequest(event as PullRequestEvent | ReviewCommentEvent);
  }

  return 'not-pull-request';
}

export function isForkPr(event: GitHubEvent): boolean {
  return getPullRequestSource(event) === 'fork';
}

export function isSameRepoPr(event: GitHubEvent): boolean {
  return getPullRequestSource(event) === 'same-repo';
}

export function isAuthorizedAssociation(
  authorAssociation: string | null | undefined
): authorAssociation is AuthorizedAssociation {
  if (!authorAssociation) {
    return false;
  }

  return AUTHORIZED_ASSOCIATIONS.includes(authorAssociation as AuthorizedAssociation);
}

export function runTrustBoundaryGuards(
  event: GitHubEvent,
  actor: string | null | undefined,
  commentBody?: string
): GuardDecision {
  if (isBotActor(actor)) {
    return { allow: false, skipReason: 'bot-actor' };
  }

  if (commentBody && hasIgnoreMarker(commentBody)) {
    return { allow: false, skipReason: 'ignore-marker' };
  }

  const source = getPullRequestSource(event);

  if (source === 'fork') {
    return { allow: false, skipReason: 'fork-pr' };
  }

  if (source === 'unknown') {
    return { allow: true, requiresPullRequestLookup: true };
  }

  return { allow: true };
}
