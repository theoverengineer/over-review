import { describe, expect, it } from 'vitest';

import {
  handleIssueComment,
  handlePullRequest,
  handleReviewComment,
} from '../../../src/events/handlers';
import type {
  IssueCommentEvent,
  PullRequestEvent,
  ResolvedPullRequestIdentity,
  ReviewCommentEvent,
} from '../../../src/runtime/types';

const sameRepoPrOpenedEvent: PullRequestEvent = {
  action: 'opened',
  repository: {
    full_name: 'owner/repo',
    name: 'repo',
    owner: { login: 'owner', type: 'Organization' },
  },
  pull_request: {
    number: 123,
    title: 'Test PR',
    head: {
      sha: 'abc123',
      repo: {
        full_name: 'owner/repo',
        name: 'repo',
        owner: { login: 'owner', type: 'Organization' },
      },
    },
    base: {
      sha: 'def456',
      repo: {
        full_name: 'owner/repo',
        name: 'repo',
        owner: { login: 'owner', type: 'Organization' },
      },
    },
    user: { login: 'contributor' },
  },
  sender: { login: 'contributor', type: 'User' },
};

const authorizedReviewCommentEvent: IssueCommentEvent = {
  action: 'created',
  repository: sameRepoPrOpenedEvent.repository,
  issue: {
    number: 123,
    title: 'Test Issue',
    pull_request: { url: 'https://api.github.com/repos/owner/repo/pulls/123' },
    user: { login: 'author' },
    author_association: 'OWNER',
  },
  comment: {
    id: 789,
    body: '/review',
    user: { login: 'reviewer' },
    author_association: 'OWNER',
  },
  sender: { login: 'reviewer', type: 'User' },
};

const authorizedIssueComment = authorizedReviewCommentEvent.comment!;
const authorizedIssue = authorizedReviewCommentEvent.issue;

const unauthorizedReviewCommentEvent: IssueCommentEvent = {
  ...authorizedReviewCommentEvent,
  comment: {
    ...authorizedIssueComment,
    user: { login: 'random-user' },
    author_association: 'NONE',
  },
  issue: {
    ...authorizedIssue,
    author_association: 'NONE',
  },
  sender: { login: 'random-user', type: 'User' },
};

const reviewCommentEvent: ReviewCommentEvent = {
  action: 'created',
  repository: sameRepoPrOpenedEvent.repository,
  pull_request: sameRepoPrOpenedEvent.pull_request,
  comment: {
    id: 789,
    body: 'This is a review comment',
    user: { login: 'reviewer' },
    author_association: 'OWNER',
  },
  sender: { login: 'reviewer', type: 'User' },
};

describe('handlePullRequest', () => {
  it('handles supported pull_request actions', () => {
    const result = handlePullRequest(sameRepoPrOpenedEvent);
    expect(result.type).toBe('review');
    expect(result.prNumber).toBe(123);
  });

  it('skips unsupported pull_request actions', () => {
    const result = handlePullRequest({
      ...sameRepoPrOpenedEvent,
      action: 'closed',
    } as PullRequestEvent);
    expect(result.type).toBe('skip');
  });
});

describe('handleIssueComment', () => {
  it('handles authorized manual review commands without PR lookup', () => {
    const result = handleIssueComment(authorizedReviewCommentEvent);
    expect(result.type).toBe('review');
    expect(result.command).toBe('/review');
    expect(result.fullMode).toBe(false);
  });

  it('handles authorized same-repo manual review commands with resolved PR identity', () => {
    const resolvedPrIdentity: ResolvedPullRequestIdentity = {
      number: 123,
      title: 'Test PR',
      isFork: false,
      headRepoFullName: 'owner/repo',
      baseRepoFullName: 'owner/repo',
    };

    const result = handleIssueComment(authorizedReviewCommentEvent, { resolvedPrIdentity });
    expect(result.type).toBe('review');
    expect(result.command).toBe('/review');
    expect(result.fullMode).toBe(false);
  });

  it('skips fork PRs when resolved PR identity indicates fork', () => {
    const resolvedPrIdentity: ResolvedPullRequestIdentity = {
      number: 123,
      title: 'Test PR',
      isFork: true,
      headRepoFullName: 'forker/repo',
      baseRepoFullName: 'owner/repo',
    };

    const result = handleIssueComment(authorizedReviewCommentEvent, { resolvedPrIdentity });
    expect(result.type).toBe('skip');
    expect(result.reason).toBe('Fork PR silently skipped');
  });

  it('returns unauthorized for disallowed commands (no PR lookup)', () => {
    const result = handleIssueComment(unauthorizedReviewCommentEvent);
    expect(result.type).toBe('unauthorized');
    expect(result.command).toBe('/review');
    expect(result.eyesReaction).toBe(true);
  });

  it('skips bot comments', () => {
    const result = handleIssueComment({
      ...authorizedReviewCommentEvent,
      comment: {
        ...authorizedIssueComment,
        user: { login: 'github-actions[bot]' },
      },
    } as IssueCommentEvent);
    expect(result.type).toBe('skip');
    expect(result.reason).toBe('Bot comment ignored');
  });

  it('skips non-command comments', () => {
    const result = handleIssueComment({
      ...authorizedReviewCommentEvent,
      comment: { ...authorizedIssueComment, body: 'Looks good' },
    } as IssueCommentEvent);
    expect(result.type).toBe('skip');
    expect(result.reason).toBe('Not a manual review command');
  });

  it('skips non-pull-request issue comments', () => {
    const result = handleIssueComment({
      ...authorizedReviewCommentEvent,
      issue: { ...authorizedIssue, pull_request: undefined },
    } as IssueCommentEvent);
    expect(result.type).toBe('skip');
    expect(result.reason).toBe('Issue comment is not on a pull request');
  });
});

describe('handleReviewComment', () => {
  it('handles supported review-comment actions', () => {
    const result = handleReviewComment(reviewCommentEvent);
    expect(result.type).toBe('review');
    expect(result.prNumber).toBe(123);
  });

  it('skips bot-authored review comments', () => {
    const result = handleReviewComment({
      ...reviewCommentEvent,
      comment: { ...reviewCommentEvent.comment, user: { login: 'github-actions[bot]' } },
    } as ReviewCommentEvent);
    expect(result.type).toBe('skip');
    expect(result.reason).toBe('Bot review comment ignored');
  });
});
