"use strict";
/**
 * GitHub Pull Request API helpers.
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractPullRequestIdentity = extractPullRequestIdentity;
exports.fetchPullRequestIdentity = fetchPullRequestIdentity;
exports.getPullRequestIdentityFromEvent = getPullRequestIdentityFromEvent;
exports.fetchPullRequestReviewData = fetchPullRequestReviewData;
exports.updatePullRequestTitle = updatePullRequestTitle;
exports.listPullRequests = listPullRequests;
exports.fetchPullRequestIdentityByNumber = fetchPullRequestIdentityByNumber;
/**
 * Extract PR identity from a minimal PR response.
 * @param pr - Minimal PR data from GitHub API
 * @param repository - The repository context from the GitHub event
 * @returns PR identity information
 */
function extractPullRequestIdentity(pr, repository) {
    const headRepoFullName = pr.head.repo?.full_name ?? null;
    const baseRepoFullName = pr.base?.repo?.full_name ?? null;
    // Determine if PR is from a fork by comparing head and base repo full names
    // eslint-disable-next-line no-useless-assignment
    let isFork = true; // Default to true for safety when repo info is missing
    if (headRepoFullName && baseRepoFullName) {
        isFork = headRepoFullName !== baseRepoFullName;
    }
    else if (headRepoFullName) {
        // If we only have head repo, compare with the issue's repository
        isFork = headRepoFullName !== repository.full_name;
    }
    else {
        // No repo info available - treat as unknown/fork to be safe
        isFork = true;
    }
    return {
        number: pr.number,
        title: pr.title,
        isFork,
        headRepoFullName,
        baseRepoFullName,
        headSha: pr.head.sha,
    };
}
/**
 * Fetch PR identity from the GitHub API using the pull_request.url from an issue_comment event.
 * @param client - GitHub client instance
 * @param pullRequestUrl - The URL from event.issue.pull_request.url
 * @param repository - The repository context from the GitHub event
 * @returns PR identity information, or null if the lookup fails
 */
async function fetchPullRequestIdentity(client, pullRequestUrl, repository) {
    try {
        // Extract the path from the URL (e.g., '/repos/owner/repo/pulls/123')
        // The URL format is: https://api.github.com/repos/owner/repo/pulls/123
        const urlObj = new URL(pullRequestUrl);
        const path = urlObj.pathname;
        const expectedPrefix = `/repos/${repository.full_name}/pulls/`;
        if (!path.startsWith(expectedPrefix)) {
            console.warn(`Rejected PR identity lookup for unexpected repository path: ${path}`);
            return null;
        }
        const pr = await client.get(path);
        return extractPullRequestIdentity(pr, repository);
    }
    catch (error) {
        // Log a minimal message without exposing secrets
        console.warn(`Failed to fetch PR identity from ${pullRequestUrl}: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
}
/**
 * Get PR identity from a full pull request event (no API call needed).
 * @param event - Pull request event
 * @returns PR identity information
 */
function getPullRequestIdentityFromEvent(event) {
    const headRepoFullName = event.pull_request.head.repo?.full_name ?? null;
    const baseRepoFullName = event.pull_request.base.repo?.full_name ?? null;
    return {
        number: event.pull_request.number,
        title: event.pull_request.title,
        isFork: headRepoFullName !== baseRepoFullName,
        headRepoFullName,
        baseRepoFullName,
        headSha: event.pull_request.head.sha,
    };
}
async function fetchPullRequestReviewData(client, repoFullName, pullRequestNumber) {
    const pullRequest = await client.get(`/repos/${repoFullName}/pulls/${pullRequestNumber}`);
    const [files, commits] = await Promise.all([
        client.get(`/repos/${repoFullName}/pulls/${pullRequestNumber}/files?per_page=100`),
        client.get(`/repos/${repoFullName}/pulls/${pullRequestNumber}/commits?per_page=100`),
    ]);
    return {
        pullRequest: {
            number: pullRequest.number,
            repoFullName,
            title: pullRequest.title,
            body: pullRequest.body,
            headSha: pullRequest.head.sha,
            baseRepoFullName: pullRequest.base.repo?.full_name ?? repoFullName,
        },
        files,
        commits,
    };
}
async function updatePullRequestTitle(client, repoFullName, pullRequestNumber, title) {
    await client.patch(`/repos/${repoFullName}/pulls/${pullRequestNumber}`, {
        title,
    });
}
/**
 * Fetch list of pull requests for a repository.
 * @param client - GitHub client instance
 * @param options - List PRs options
 * @returns Array of PR information
 */
async function listPullRequests(client, options) {
    const state = options.state || 'open';
    const limit = options.limit || 10;
    const response = await client.get(`/repos/${options.owner}/${options.repo}/pulls?state=${encodeURIComponent(state)}&per_page=${limit}`);
    return response.map((pr) => {
        const headRepo = pr.head.repo?.full_name ?? null;
        const baseRepo = pr.base.repo?.full_name ?? null;
        const isFork = headRepo !== null && baseRepo !== null && headRepo !== baseRepo;
        return {
            number: pr.number,
            title: pr.title,
            state: pr.state,
            isFork,
        };
    });
}
/**
 * Fetch a single pull request's identity information.
 * @param client - GitHub client instance
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param prNumber - PR number
 * @returns PR identity information or null if not found
 */
async function fetchPullRequestIdentityByNumber(client, owner, repo, prNumber) {
    try {
        const prResponse = await client.get(`/repos/${owner}/${repo}/pulls/${prNumber}`);
        const headRepoFullName = prResponse.head.repo?.full_name ?? null;
        const baseRepoFullName = prResponse.base.repo?.full_name ?? null;
        const isFork = headRepoFullName !== null &&
            baseRepoFullName !== null &&
            headRepoFullName !== baseRepoFullName;
        return {
            number: prResponse.number,
            title: prResponse.title,
            isFork,
            headRepoFullName,
            baseRepoFullName,
            headSha: prResponse.head.sha,
        };
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=pull-requests.js.map