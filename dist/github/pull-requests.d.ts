/**
 * GitHub Pull Request API helpers.
 * @packageDocumentation
 */
import { GitHubClient } from './client';
import type { PullRequestCommit, PullRequestFile, PullRequestSnapshot } from '../contracts/review';
import type { PullRequestInfo, RepositoryInfo } from '../runtime/types';
export interface ListPullRequestsOptions {
    owner: string;
    repo: string;
    state?: 'open' | 'closed' | 'all';
    limit?: number;
}
export interface ListPullRequestResult {
    number: number;
    title: string;
    state: string;
    isFork: boolean;
}
/**
 * Information about whether a PR is from a fork or same repo.
 */
export interface PullRequestIdentity {
    /** The PR number */
    number: number;
    /** The PR title */
    title: string;
    /** Whether the PR is from a fork (head repo differs from base repo) */
    isFork: boolean;
    /** The full name of the head repository (where the changes come from) */
    headRepoFullName: string | null;
    /** The full name of the base repository (where changes are merged into) */
    baseRepoFullName: string | null;
    /** The head commit SHA */
    headSha: string;
}
export interface PullRequestReviewData {
    pullRequest: PullRequestSnapshot;
    files: PullRequestFile[];
    commits: PullRequestCommit[];
}
/**
 * Extract PR identity from a minimal PR response.
 * @param pr - Minimal PR data from GitHub API
 * @param repository - The repository context from the GitHub event
 * @returns PR identity information
 */
export declare function extractPullRequestIdentity(pr: {
    number: number;
    title: string;
    head: {
        sha: string;
        repo?: {
            full_name?: string | null;
            name?: string;
            owner?: {
                login?: string;
                type?: 'User' | 'Organization';
            };
        };
    };
    base: {
        sha: string;
        repo?: {
            full_name?: string | null;
            name?: string;
            owner?: {
                login?: string;
                type?: 'User' | 'Organization';
            };
        };
    };
}, repository: RepositoryInfo): PullRequestIdentity;
/**
 * Fetch PR identity from the GitHub API using the pull_request.url from an issue_comment event.
 * @param client - GitHub client instance
 * @param pullRequestUrl - The URL from event.issue.pull_request.url
 * @param repository - The repository context from the GitHub event
 * @returns PR identity information, or null if the lookup fails
 */
export declare function fetchPullRequestIdentity(client: GitHubClient, pullRequestUrl: string, repository: RepositoryInfo): Promise<PullRequestIdentity | null>;
/**
 * Get PR identity from a full pull request event (no API call needed).
 * @param event - Pull request event
 * @returns PR identity information
 */
export declare function getPullRequestIdentityFromEvent(event: {
    repository: RepositoryInfo;
    pull_request: PullRequestInfo;
}): PullRequestIdentity;
export declare function fetchPullRequestReviewData(client: GitHubClient, repoFullName: string, pullRequestNumber: number): Promise<PullRequestReviewData>;
export declare function updatePullRequestTitle(client: GitHubClient, repoFullName: string, pullRequestNumber: number, title: string): Promise<void>;
/**
 * Fetch list of pull requests for a repository.
 * @param client - GitHub client instance
 * @param options - List PRs options
 * @returns Array of PR information
 */
export declare function listPullRequests(client: GitHubClient, options: ListPullRequestsOptions): Promise<ListPullRequestResult[]>;
/**
 * Fetch a single pull request's identity information.
 * @param client - GitHub client instance
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param prNumber - PR number
 * @returns PR identity information or null if not found
 */
export declare function fetchPullRequestIdentityByNumber(client: GitHubClient, owner: string, repo: string, prNumber: number): Promise<PullRequestIdentity | null>;
//# sourceMappingURL=pull-requests.d.ts.map