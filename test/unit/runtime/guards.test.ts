import { describe, expect, it } from 'vitest';

import {
  AUTHORIZED_ASSOCIATIONS,
  getPullRequestSource,
  isAuthorizedAssociation,
  isBotActor,
  isForkPr,
  isSameRepoPr,
  runTrustBoundaryGuards,
} from '../../../src/runtime/guards';
import type { IssueCommentEvent, PullRequestEvent } from '../../../src/runtime/types';

const sameRepoPrEvent: PullRequestEvent = {
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
  action: 'opened',
  repository: {
    full_name: 'owner/repo',
    name: 'repo',
    owner: { login: 'owner', type: 'Organization' },
  },
  pull_request: {
    number: 456,
    title: 'Fork PR',
    head: {
      sha: 'xyz789',
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
    user: { login: 'forker' },
  },
  sender: { login: 'forker', type: 'User' },
};

const issueCommentEvent: IssueCommentEvent = {
  action: 'created',
  repository: {
    full_name: 'owner/repo',
    name: 'repo',
    owner: { login: 'owner', type: 'Organization' },
  },
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

describe('AUTHORIZED_ASSOCIATIONS', () => {
  it('contains the manual-review allowlist', () => {
    expect(AUTHORIZED_ASSOCIATIONS).toEqual(['OWNER', 'MEMBER', 'COLLABORATOR']);
  });
});

describe('isBotActor', () => {
  it('returns true for bot actors', () => {
    expect(isBotActor('github-actions[bot]')).toBe(true);
    expect(isBotActor('dependabot[bot]')).toBe(true);
  });

  it('returns false for human actors', () => {
    expect(isBotActor('contributor')).toBe(false);
    expect(isBotActor(null)).toBe(false);
  });
});

describe('pull request source detection', () => {
  it('detects same-repo pull requests', () => {
    expect(getPullRequestSource(sameRepoPrEvent)).toBe('same-repo');
    expect(isSameRepoPr(sameRepoPrEvent)).toBe(true);
    expect(isForkPr(sameRepoPrEvent)).toBe(false);
  });

  it('detects fork pull requests', () => {
    expect(getPullRequestSource(forkPrEvent)).toBe('fork');
    expect(isSameRepoPr(forkPrEvent)).toBe(false);
    expect(isForkPr(forkPrEvent)).toBe(true);
  });

  it('marks issue_comment pull requests as unresolved until PR lookup', () => {
    expect(getPullRequestSource(issueCommentEvent)).toBe('unknown');
    expect(isSameRepoPr(issueCommentEvent)).toBe(false);
    expect(isForkPr(issueCommentEvent)).toBe(false);
  });
});

describe('isAuthorizedAssociation', () => {
  it('accepts allowed associations only', () => {
    expect(isAuthorizedAssociation('OWNER')).toBe(true);
    expect(isAuthorizedAssociation('MEMBER')).toBe(true);
    expect(isAuthorizedAssociation('COLLABORATOR')).toBe(true);
    expect(isAuthorizedAssociation('CONTRIBUTOR')).toBe(false);
    expect(isAuthorizedAssociation('NONE')).toBe(false);
  });
});

describe('runTrustBoundaryGuards', () => {
  it('skips bot actors', () => {
    expect(runTrustBoundaryGuards(sameRepoPrEvent, 'github-actions[bot]')).toEqual({
      allow: false,
      skipReason: 'bot-actor',
    });
  });

  it('skips fork pull requests', () => {
    expect(runTrustBoundaryGuards(forkPrEvent, 'forker')).toEqual({
      allow: false,
      skipReason: 'fork-pr',
    });
  });

  it('requests PR lookup for issue_comment pull requests', () => {
    expect(runTrustBoundaryGuards(issueCommentEvent, 'reviewer')).toEqual({
      allow: true,
      requiresPullRequestLookup: true,
    });
  });

  it('skips ignore markers', () => {
    expect(runTrustBoundaryGuards(sameRepoPrEvent, 'contributor', '@overreview skip')).toEqual({
      allow: false,
      skipReason: 'ignore-marker',
    });
  });
});
