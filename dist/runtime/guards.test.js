"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const guards_1 = require("../runtime/guards");
const sameRepoPrEvent = {
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
            repo: { full_name: 'owner/repo', name: 'repo', owner: { login: 'owner', type: 'Organization' } },
        },
        base: {
            sha: 'def456',
            repo: { full_name: 'owner/repo', name: 'repo', owner: { login: 'owner', type: 'Organization' } },
        },
        user: { login: 'contributor' },
    },
    sender: { login: 'contributor', type: 'User' },
};
const forkPrEvent = {
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
            repo: { full_name: 'owner/repo', name: 'repo', owner: { login: 'owner', type: 'Organization' } },
        },
        user: { login: 'forker' },
    },
    sender: { login: 'forker', type: 'User' },
};
const issueCommentEvent = {
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
(0, vitest_1.describe)('AUTHORIZED_ASSOCIATIONS', () => {
    (0, vitest_1.it)('contains the manual-review allowlist', () => {
        (0, vitest_1.expect)(guards_1.AUTHORIZED_ASSOCIATIONS).toEqual(['OWNER', 'MEMBER', 'COLLABORATOR']);
    });
});
(0, vitest_1.describe)('isBotActor', () => {
    (0, vitest_1.it)('returns true for bot actors', () => {
        (0, vitest_1.expect)((0, guards_1.isBotActor)('github-actions[bot]')).toBe(true);
        (0, vitest_1.expect)((0, guards_1.isBotActor)('dependabot[bot]')).toBe(true);
    });
    (0, vitest_1.it)('returns false for human actors', () => {
        (0, vitest_1.expect)((0, guards_1.isBotActor)('contributor')).toBe(false);
        (0, vitest_1.expect)((0, guards_1.isBotActor)(null)).toBe(false);
    });
});
(0, vitest_1.describe)('pull request source detection', () => {
    (0, vitest_1.it)('detects same-repo pull requests', () => {
        (0, vitest_1.expect)((0, guards_1.getPullRequestSource)(sameRepoPrEvent)).toBe('same-repo');
        (0, vitest_1.expect)((0, guards_1.isSameRepoPr)(sameRepoPrEvent)).toBe(true);
        (0, vitest_1.expect)((0, guards_1.isForkPr)(sameRepoPrEvent)).toBe(false);
    });
    (0, vitest_1.it)('detects fork pull requests', () => {
        (0, vitest_1.expect)((0, guards_1.getPullRequestSource)(forkPrEvent)).toBe('fork');
        (0, vitest_1.expect)((0, guards_1.isSameRepoPr)(forkPrEvent)).toBe(false);
        (0, vitest_1.expect)((0, guards_1.isForkPr)(forkPrEvent)).toBe(true);
    });
    (0, vitest_1.it)('marks issue_comment pull requests as unresolved until PR lookup', () => {
        (0, vitest_1.expect)((0, guards_1.getPullRequestSource)(issueCommentEvent)).toBe('unknown');
        (0, vitest_1.expect)((0, guards_1.isSameRepoPr)(issueCommentEvent)).toBe(false);
        (0, vitest_1.expect)((0, guards_1.isForkPr)(issueCommentEvent)).toBe(false);
    });
});
(0, vitest_1.describe)('isAuthorizedAssociation', () => {
    (0, vitest_1.it)('accepts allowed associations only', () => {
        (0, vitest_1.expect)((0, guards_1.isAuthorizedAssociation)('OWNER')).toBe(true);
        (0, vitest_1.expect)((0, guards_1.isAuthorizedAssociation)('MEMBER')).toBe(true);
        (0, vitest_1.expect)((0, guards_1.isAuthorizedAssociation)('COLLABORATOR')).toBe(true);
        (0, vitest_1.expect)((0, guards_1.isAuthorizedAssociation)('CONTRIBUTOR')).toBe(false);
        (0, vitest_1.expect)((0, guards_1.isAuthorizedAssociation)('NONE')).toBe(false);
    });
});
(0, vitest_1.describe)('runTrustBoundaryGuards', () => {
    (0, vitest_1.it)('skips bot actors', () => {
        (0, vitest_1.expect)((0, guards_1.runTrustBoundaryGuards)(sameRepoPrEvent, 'github-actions[bot]')).toEqual({
            allow: false,
            skipReason: 'bot-actor',
        });
    });
    (0, vitest_1.it)('skips fork pull requests', () => {
        (0, vitest_1.expect)((0, guards_1.runTrustBoundaryGuards)(forkPrEvent, 'forker')).toEqual({
            allow: false,
            skipReason: 'fork-pr',
        });
    });
    (0, vitest_1.it)('requests PR lookup for issue_comment pull requests', () => {
        (0, vitest_1.expect)((0, guards_1.runTrustBoundaryGuards)(issueCommentEvent, 'reviewer')).toEqual({
            allow: true,
            requiresPullRequestLookup: true,
        });
    });
    (0, vitest_1.it)('skips ignore markers', () => {
        (0, vitest_1.expect)((0, guards_1.runTrustBoundaryGuards)(sameRepoPrEvent, 'contributor', '@overreview skip')).toEqual({
            allow: false,
            skipReason: 'ignore-marker',
        });
    });
});
//# sourceMappingURL=guards.test.js.map