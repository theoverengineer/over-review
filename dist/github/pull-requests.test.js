"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const client_1 = require("../github/client");
const pull_requests_1 = require("../github/pull-requests");
const repository = {
    full_name: 'owner/repo',
    name: 'repo',
    owner: { login: 'owner', type: 'Organization' },
};
(0, vitest_1.describe)('extractPullRequestIdentity', () => {
    (0, vitest_1.it)('defaults to fork when only the base repo is available', () => {
        const identity = (0, pull_requests_1.extractPullRequestIdentity)({
            number: 123,
            title: 'Test PR',
            head: { sha: 'abc123' },
            base: {
                sha: 'def456',
                repo: { full_name: 'owner/repo', name: 'repo', owner: { login: 'owner', type: 'Organization' } },
            },
        }, repository);
        (0, vitest_1.expect)(identity.isFork).toBe(true);
    });
});
(0, vitest_1.describe)('fetchPullRequestIdentity', () => {
    (0, vitest_1.it)('rejects PR URLs outside the event repository path', async () => {
        const client = new client_1.GitHubClient({ baseUrl: 'https://api.github.com' });
        client.get = vitest_1.vi.fn();
        const identity = await (0, pull_requests_1.fetchPullRequestIdentity)(client, 'https://api.github.com/repos/other/repo/pulls/123', repository);
        (0, vitest_1.expect)(identity).toBeNull();
        (0, vitest_1.expect)(client.get).not.toHaveBeenCalled();
    });
});
//# sourceMappingURL=pull-requests.test.js.map