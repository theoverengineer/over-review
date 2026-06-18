"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const handlers_1 = require("../events/handlers");
const sameRepoPrOpenedEvent = {
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
const authorizedReviewCommentEvent = {
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
const authorizedIssueComment = authorizedReviewCommentEvent.comment;
const authorizedIssue = authorizedReviewCommentEvent.issue;
const unauthorizedReviewCommentEvent = {
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
const reviewCommentEvent = {
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
(0, vitest_1.describe)('handlePullRequest', () => {
    (0, vitest_1.it)('handles supported pull_request actions', () => {
        const result = (0, handlers_1.handlePullRequest)(sameRepoPrOpenedEvent);
        (0, vitest_1.expect)(result.type).toBe('review');
        (0, vitest_1.expect)(result.prNumber).toBe(123);
    });
    (0, vitest_1.it)('skips unsupported pull_request actions', () => {
        const result = (0, handlers_1.handlePullRequest)({ ...sameRepoPrOpenedEvent, action: 'closed' });
        (0, vitest_1.expect)(result.type).toBe('skip');
    });
});
(0, vitest_1.describe)('handleIssueComment', () => {
    (0, vitest_1.it)('handles authorized manual review commands without PR lookup', () => {
        const result = (0, handlers_1.handleIssueComment)(authorizedReviewCommentEvent);
        (0, vitest_1.expect)(result.type).toBe('review');
        (0, vitest_1.expect)(result.command).toBe('/review');
        (0, vitest_1.expect)(result.fullMode).toBe(false);
    });
    (0, vitest_1.it)('handles authorized same-repo manual review commands with resolved PR identity', () => {
        const resolvedPrIdentity = {
            number: 123,
            title: 'Test PR',
            isFork: false,
            headRepoFullName: 'owner/repo',
            baseRepoFullName: 'owner/repo',
        };
        const result = (0, handlers_1.handleIssueComment)(authorizedReviewCommentEvent, { resolvedPrIdentity });
        (0, vitest_1.expect)(result.type).toBe('review');
        (0, vitest_1.expect)(result.command).toBe('/review');
        (0, vitest_1.expect)(result.fullMode).toBe(false);
    });
    (0, vitest_1.it)('skips fork PRs when resolved PR identity indicates fork', () => {
        const resolvedPrIdentity = {
            number: 123,
            title: 'Test PR',
            isFork: true,
            headRepoFullName: 'forker/repo',
            baseRepoFullName: 'owner/repo',
        };
        const result = (0, handlers_1.handleIssueComment)(authorizedReviewCommentEvent, { resolvedPrIdentity });
        (0, vitest_1.expect)(result.type).toBe('skip');
        (0, vitest_1.expect)(result.reason).toBe('Fork PR silently skipped');
    });
    (0, vitest_1.it)('returns unauthorized for disallowed commands (no PR lookup)', () => {
        const result = (0, handlers_1.handleIssueComment)(unauthorizedReviewCommentEvent);
        (0, vitest_1.expect)(result.type).toBe('unauthorized');
        (0, vitest_1.expect)(result.command).toBe('/review');
        (0, vitest_1.expect)(result.eyesReaction).toBe(true);
    });
    (0, vitest_1.it)('skips bot comments', () => {
        const result = (0, handlers_1.handleIssueComment)({
            ...authorizedReviewCommentEvent,
            comment: {
                ...authorizedIssueComment,
                user: { login: 'github-actions[bot]' },
            },
        });
        (0, vitest_1.expect)(result.type).toBe('skip');
        (0, vitest_1.expect)(result.reason).toBe('Bot comment ignored');
    });
    (0, vitest_1.it)('skips non-command comments', () => {
        const result = (0, handlers_1.handleIssueComment)({
            ...authorizedReviewCommentEvent,
            comment: { ...authorizedIssueComment, body: 'Looks good' },
        });
        (0, vitest_1.expect)(result.type).toBe('skip');
        (0, vitest_1.expect)(result.reason).toBe('Not a manual review command');
    });
    (0, vitest_1.it)('skips non-pull-request issue comments', () => {
        const result = (0, handlers_1.handleIssueComment)({
            ...authorizedReviewCommentEvent,
            issue: { ...authorizedIssue, pull_request: undefined },
        });
        (0, vitest_1.expect)(result.type).toBe('skip');
        (0, vitest_1.expect)(result.reason).toBe('Issue comment is not on a pull request');
    });
});
(0, vitest_1.describe)('handleReviewComment', () => {
    (0, vitest_1.it)('handles supported review-comment actions', () => {
        const result = (0, handlers_1.handleReviewComment)(reviewCommentEvent);
        (0, vitest_1.expect)(result.type).toBe('review');
        (0, vitest_1.expect)(result.prNumber).toBe(123);
    });
    (0, vitest_1.it)('skips bot-authored review comments', () => {
        const result = (0, handlers_1.handleReviewComment)({
            ...reviewCommentEvent,
            comment: { ...reviewCommentEvent.comment, user: { login: 'github-actions[bot]' } },
        });
        (0, vitest_1.expect)(result.type).toBe('skip');
        (0, vitest_1.expect)(result.reason).toBe('Bot review comment ignored');
    });
});
//# sourceMappingURL=handlers.test.js.map