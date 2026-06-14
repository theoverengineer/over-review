import { describe, expect, it, vi } from 'vitest';

import { parseManualReviewCommand } from '../../../src/events/handle-issue-comment';
import { GitHubClient } from '../../../src/github/client';
import { isSupportedEvent, routeEvent } from '../../../src/runtime/event-router';
import type {
  IssueCommentEvent,
  PullRequestEvent,
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

const forkPrEvent: PullRequestEvent = {
  ...sameRepoPrOpenedEvent,
  pull_request: {
    ...sameRepoPrOpenedEvent.pull_request,
    number: 456,
    head: {
      sha: 'xyz789',
      repo: { full_name: 'forker/repo', name: 'repo', owner: { login: 'forker', type: 'User' } },
    },
  },
  sender: { login: 'forker', type: 'User' },
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

const aiReviewCommentEvent: IssueCommentEvent = {
  ...authorizedReviewCommentEvent,
  comment: {
    ...authorizedIssueComment,
    body: '/ai-review --full',
    author_association: 'MEMBER',
  },
  issue: {
    ...authorizedIssue,
    author_association: 'MEMBER',
  },
};

const unauthorizedReviewCommentEvent: IssueCommentEvent = {
  ...authorizedReviewCommentEvent,
  comment: {
    ...authorizedIssueComment,
    body: '/review',
    user: { login: 'random-user' },
    author_association: 'NONE',
  },
  issue: {
    ...authorizedIssue,
    author_association: 'NONE',
  },
  sender: { login: 'random-user', type: 'User' },
};

const regularCommentEvent: IssueCommentEvent = {
  ...authorizedReviewCommentEvent,
  comment: {
    ...authorizedIssueComment,
    body: 'This is a regular comment',
  },
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

const createMockClient = (prData: unknown) => {
  const mockClient = new GitHubClient({ baseUrl: 'https://api.github.com' });
  mockClient.get = vi.fn().mockResolvedValue(prData);
  return mockClient;
};

describe('isSupportedEvent', () => {
  it('accepts the supported event matrix', () => {
    expect(isSupportedEvent('pull_request')).toBe(true);
    expect(isSupportedEvent('issue_comment')).toBe(true);
    expect(isSupportedEvent('pull_request_review_comment')).toBe(true);
  });

  it('rejects unsupported event types', () => {
    expect(isSupportedEvent('push')).toBe(false);
    expect(isSupportedEvent('workflow_run')).toBe(false);
  });
});

describe('routeEvent', () => {
  it('routes supported pull_request events to review', async () => {
    const result = await routeEvent(sameRepoPrOpenedEvent, 'pull_request');
    expect(result.handled).toBe(true);
    expect(result.outcome.type).toBe('review');
    expect(result.outcome.prNumber).toBe(123);
  });

  it('silently skips fork pull_request events', async () => {
    const result = await routeEvent(forkPrEvent, 'pull_request');
    expect(result.handled).toBe(true);
    expect(result.outcome.type).toBe('skip');
    expect(result.outcome.reason).toBe('Fork PR silently skipped');
  });

  it('performs PR lookup for authorized same-repo manual review commands', async () => {
    const mockClient = createMockClient({
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
    });

    const result = await routeEvent(authorizedReviewCommentEvent, 'issue_comment', mockClient);
    expect(result.handled).toBe(true);
    expect(result.outcome.type).toBe('review');
    expect(result.outcome.command).toBe('/review');
    expect(result.outcome.prNumber).toBe(123);
    expect(mockClient.get).toHaveBeenCalledTimes(1);
  });

  it('performs PR lookup for authorized fork manual review commands and silently skips', async () => {
    const mockClient = createMockClient({
      number: 123,
      title: 'Fork PR',
      head: {
        sha: 'abc123',
        repo: { full_name: 'forker/repo', name: 'repo', owner: { login: 'forker', type: 'User' } },
      },
      base: {
        sha: 'def456',
        repo: {
          full_name: 'owner/repo',
          name: 'repo',
          owner: { login: 'owner', type: 'Organization' },
        },
      },
    });

    const result = await routeEvent(authorizedReviewCommentEvent, 'issue_comment', mockClient);
    expect(result.handled).toBe(true);
    expect(result.outcome.type).toBe('skip');
    expect(result.outcome.reason).toBe('Fork PR silently skipped');
    expect(mockClient.get).toHaveBeenCalledTimes(1);
  });

  it('preserves /ai-review alias and --full during PR lookup', async () => {
    const mockClient = createMockClient({
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
    });

    const result = await routeEvent(aiReviewCommentEvent, 'issue_comment', mockClient);
    expect(result.handled).toBe(true);
    expect(result.outcome.type).toBe('review');
    expect(result.outcome.command).toBe('/ai-review');
    expect(result.outcome.fullMode).toBe(true);
    expect(mockClient.get).toHaveBeenCalledTimes(1);
  });

  it('returns unauthorized for disallowed manual review commands (no PR lookup)', async () => {
    const mockClient = createMockClient({
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
    });

    const result = await routeEvent(unauthorizedReviewCommentEvent, 'issue_comment', mockClient);
    expect(result.handled).toBe(true);
    expect(result.outcome.type).toBe('unauthorized');
    expect(result.outcome.command).toBe('/review');
    expect(result.outcome.eyesReaction).toBe(true);
    expect(mockClient.get).not.toHaveBeenCalled();
  });

  it('skips non-command issue comments (no PR lookup)', async () => {
    const mockClient = createMockClient({
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
    });

    const result = await routeEvent(regularCommentEvent, 'issue_comment', mockClient);
    expect(result.handled).toBe(true);
    expect(result.outcome.type).toBe('skip');
    expect(result.outcome.reason).toBe('Not a manual review command');
    expect(mockClient.get).not.toHaveBeenCalled();
  });

  it('routes review comments to review handling', async () => {
    const result = await routeEvent(reviewCommentEvent, 'pull_request_review_comment');
    expect(result.handled).toBe(true);
    expect(result.outcome.type).toBe('review');
    expect(result.outcome.prNumber).toBe(123);
  });

  it('ignores unsupported event names', async () => {
    const result = await routeEvent(sameRepoPrOpenedEvent, 'push');
    expect(result.handled).toBe(false);
    expect(result.outcome.type).toBe('unsupported');
    expect(result.outcome.reason).toBe('Unsupported event type: push');
  });
});

describe('parseManualReviewCommand', () => {
  it('parses /review without full mode', () => {
    expect(parseManualReviewCommand('/review')).toEqual({
      command: '/review',
      fullMode: false,
    });
  });

  it('parses /ai-review with full mode', () => {
    expect(parseManualReviewCommand('/ai-review --full')).toEqual({
      command: '/ai-review',
      fullMode: true,
    });
  });

  it('returns null for unsupported comments', () => {
    expect(parseManualReviewCommand('looks good')).toBeNull();
  });
});
