"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const handle_issue_comment_1 = require("../events/handle-issue-comment");
const client_1 = require("../github/client");
const event_router_1 = require("../runtime/event-router");
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
const forkPrEvent = {
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
const aiReviewCommentEvent = {
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
const unauthorizedReviewCommentEvent = {
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
const regularCommentEvent = {
    ...authorizedReviewCommentEvent,
    comment: {
        ...authorizedIssueComment,
        body: 'This is a regular comment',
    },
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
// Mock GitHub client for PR identity lookup
const createMockClient = (prData) => {
    const mockClient = new client_1.GitHubClient({ baseUrl: 'https://api.github.com' });
    mockClient.get = vitest_1.vi.fn().mockResolvedValue(prData);
    return mockClient;
};
(0, vitest_1.describe)('isSupportedEvent', () => {
    (0, vitest_1.it)('accepts the supported event matrix', () => {
        (0, vitest_1.expect)((0, event_router_1.isSupportedEvent)('pull_request')).toBe(true);
        (0, vitest_1.expect)((0, event_router_1.isSupportedEvent)('issue_comment')).toBe(true);
        (0, vitest_1.expect)((0, event_router_1.isSupportedEvent)('pull_request_review_comment')).toBe(true);
    });
    (0, vitest_1.it)('rejects unsupported event types', () => {
        (0, vitest_1.expect)((0, event_router_1.isSupportedEvent)('push')).toBe(false);
        (0, vitest_1.expect)((0, event_router_1.isSupportedEvent)('workflow_run')).toBe(false);
    });
});
(0, vitest_1.describe)('routeEvent', () => {
    (0, vitest_1.it)('routes supported pull_request events to review', async () => {
        const result = await (0, event_router_1.routeEvent)(sameRepoPrOpenedEvent, 'pull_request');
        (0, vitest_1.expect)(result.handled).toBe(true);
        (0, vitest_1.expect)(result.outcome.type).toBe('review');
        (0, vitest_1.expect)(result.outcome.prNumber).toBe(123);
    });
    (0, vitest_1.it)('silently skips fork pull_request events', async () => {
        const result = await (0, event_router_1.routeEvent)(forkPrEvent, 'pull_request');
        (0, vitest_1.expect)(result.handled).toBe(true);
        (0, vitest_1.expect)(result.outcome.type).toBe('skip');
        (0, vitest_1.expect)(result.outcome.reason).toBe('Fork PR silently skipped');
    });
    (0, vitest_1.it)('performs PR lookup for authorized same-repo manual review commands', async () => {
        const mockClient = createMockClient({
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
        });
        const result = await (0, event_router_1.routeEvent)(authorizedReviewCommentEvent, 'issue_comment', mockClient);
        (0, vitest_1.expect)(result.handled).toBe(true);
        (0, vitest_1.expect)(result.outcome.type).toBe('review');
        (0, vitest_1.expect)(result.outcome.command).toBe('/review');
        (0, vitest_1.expect)(result.outcome.prNumber).toBe(123);
        (0, vitest_1.expect)(mockClient.get).toHaveBeenCalledTimes(1);
    });
    (0, vitest_1.it)('performs PR lookup for authorized fork manual review commands and silently skips', async () => {
        const mockClient = createMockClient({
            number: 123,
            title: 'Fork PR',
            head: {
                sha: 'abc123',
                repo: { full_name: 'forker/repo', name: 'repo', owner: { login: 'forker', type: 'User' } },
            },
            base: {
                sha: 'def456',
                repo: { full_name: 'owner/repo', name: 'repo', owner: { login: 'owner', type: 'Organization' } },
            },
        });
        const result = await (0, event_router_1.routeEvent)(authorizedReviewCommentEvent, 'issue_comment', mockClient);
        (0, vitest_1.expect)(result.handled).toBe(true);
        (0, vitest_1.expect)(result.outcome.type).toBe('skip');
        (0, vitest_1.expect)(result.outcome.reason).toBe('Fork PR silently skipped');
        (0, vitest_1.expect)(mockClient.get).toHaveBeenCalledTimes(1);
    });
    (0, vitest_1.it)('preserves /ai-review alias and --full during PR lookup', async () => {
        const mockClient = createMockClient({
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
        });
        const result = await (0, event_router_1.routeEvent)(aiReviewCommentEvent, 'issue_comment', mockClient);
        (0, vitest_1.expect)(result.handled).toBe(true);
        (0, vitest_1.expect)(result.outcome.type).toBe('review');
        (0, vitest_1.expect)(result.outcome.command).toBe('/ai-review');
        (0, vitest_1.expect)(result.outcome.fullMode).toBe(true);
        (0, vitest_1.expect)(mockClient.get).toHaveBeenCalledTimes(1);
    });
    (0, vitest_1.it)('returns unauthorized for disallowed manual review commands (no PR lookup)', async () => {
        const mockClient = createMockClient({
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
        });
        const result = await (0, event_router_1.routeEvent)(unauthorizedReviewCommentEvent, 'issue_comment', mockClient);
        (0, vitest_1.expect)(result.handled).toBe(true);
        (0, vitest_1.expect)(result.outcome.type).toBe('unauthorized');
        (0, vitest_1.expect)(result.outcome.command).toBe('/review');
        (0, vitest_1.expect)(result.outcome.eyesReaction).toBe(true);
        // Unauthorized commands should not trigger PR lookup
        (0, vitest_1.expect)(mockClient.get).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)('skips non-command issue comments (no PR lookup)', async () => {
        const mockClient = createMockClient({
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
        });
        const result = await (0, event_router_1.routeEvent)(regularCommentEvent, 'issue_comment', mockClient);
        (0, vitest_1.expect)(result.handled).toBe(true);
        (0, vitest_1.expect)(result.outcome.type).toBe('skip');
        (0, vitest_1.expect)(result.outcome.reason).toBe('Not a manual review command');
        // Non-command comments should not trigger PR lookup
        (0, vitest_1.expect)(mockClient.get).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)('routes supported review-comment events', async () => {
        const result = await (0, event_router_1.routeEvent)(reviewCommentEvent, 'pull_request_review_comment');
        (0, vitest_1.expect)(result.handled).toBe(true);
        (0, vitest_1.expect)(result.outcome.type).toBe('review');
        (0, vitest_1.expect)(result.outcome.prNumber).toBe(123);
    });
    (0, vitest_1.it)('returns unsupported for unsupported events', async () => {
        const result = await (0, event_router_1.routeEvent)(sameRepoPrOpenedEvent, 'push');
        (0, vitest_1.expect)(result.handled).toBe(false);
        (0, vitest_1.expect)(result.outcome.type).toBe('unsupported');
    });
    (0, vitest_1.it)('handles PR lookup failures gracefully', async () => {
        const mockClient = new client_1.GitHubClient({ baseUrl: 'https://api.github.com' });
        mockClient.get = vitest_1.vi.fn().mockRejectedValue(new Error('API error'));
        const result = await (0, event_router_1.routeEvent)(authorizedReviewCommentEvent, 'issue_comment', mockClient);
        (0, vitest_1.expect)(result.handled).toBe(true);
        (0, vitest_1.expect)(result.outcome.type).toBe('skip');
        (0, vitest_1.expect)(result.outcome.reason).toBe('Pull request identity lookup failed');
    });
});
(0, vitest_1.describe)('parseManualReviewCommand', () => {
    (0, vitest_1.it)('parses /review', () => {
        (0, vitest_1.expect)((0, handle_issue_comment_1.parseManualReviewCommand)('/review')).toEqual({
            command: '/review',
            fullMode: false,
        });
    });
    (0, vitest_1.it)('parses /review --full', () => {
        (0, vitest_1.expect)((0, handle_issue_comment_1.parseManualReviewCommand)('/review --full')).toEqual({
            command: '/review',
            fullMode: true,
        });
    });
    (0, vitest_1.it)('parses /ai-review --full case-insensitively', () => {
        (0, vitest_1.expect)((0, handle_issue_comment_1.parseManualReviewCommand)('  /AI-REVIEW --FULL  ')).toEqual({
            command: '/ai-review',
            fullMode: true,
        });
    });
    (0, vitest_1.it)('rejects non-commands or trailing text', () => {
        (0, vitest_1.expect)((0, handle_issue_comment_1.parseManualReviewCommand)('looks good')).toBeNull();
        (0, vitest_1.expect)((0, handle_issue_comment_1.parseManualReviewCommand)('/review please')).toBeNull();
    });
});
//# sourceMappingURL=event-router.test.js.map