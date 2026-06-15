/**
 * GitHub Pull Request API helpers.
 * @packageDocumentation
 */

import { GitHubClient } from './client';
import type { PullRequestCommit, PullRequestFile, PullRequestSnapshot } from '../contracts/review';
import type { PullRequestInfo, RepositoryInfo } from '../runtime/types';

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
export function extractPullRequestIdentity(
  pr: {
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
  },
  repository: RepositoryInfo
): PullRequestIdentity {
  const headRepoFullName = pr.head.repo?.full_name ?? null;
  const baseRepoFullName = pr.base?.repo?.full_name ?? null;

  // Determine if PR is from a fork by comparing head and base repo full names
  // eslint-disable-next-line no-useless-assignment
  let isFork = true; // Default to true for safety when repo info is missing
  if (headRepoFullName && baseRepoFullName) {
    isFork = headRepoFullName !== baseRepoFullName;
  } else if (headRepoFullName) {
    // If we only have head repo, compare with the issue's repository
    isFork = headRepoFullName !== repository.full_name;
  } else {
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
export async function fetchPullRequestIdentity(
  client: GitHubClient,
  pullRequestUrl: string,
  repository: RepositoryInfo
): Promise<PullRequestIdentity | null> {
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

    const pr = await client.get<{
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
    }>(path);

    return extractPullRequestIdentity(pr, repository);
  } catch (error) {
    // Log a minimal message without exposing secrets
    console.warn(
      `Failed to fetch PR identity from ${pullRequestUrl}: ${error instanceof Error ? error.message : String(error)}`
    );
    return null;
  }
}

/**
 * Get PR identity from a full pull request event (no API call needed).
 * @param event - Pull request event
 * @returns PR identity information
 */
export function getPullRequestIdentityFromEvent(event: {
  repository: RepositoryInfo;
  pull_request: PullRequestInfo;
}): PullRequestIdentity {
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

export async function fetchPullRequestReviewData(
  client: GitHubClient,
  repoFullName: string,
  pullRequestNumber: number
): Promise<PullRequestReviewData> {
  const pullRequest = await client.get<{
    number: number;
    title: string;
    body?: string;
    head: {
      sha: string;
      repo?: { full_name?: string | null };
    };
    base: {
      repo?: { full_name?: string | null };
    };
  }>(`/repos/${repoFullName}/pulls/${pullRequestNumber}`);

  const [files, commits] = await Promise.all([
    client.get<PullRequestFile[]>(
      `/repos/${repoFullName}/pulls/${pullRequestNumber}/files?per_page=100`
    ),
    client.get<PullRequestCommit[]>(
      `/repos/${repoFullName}/pulls/${pullRequestNumber}/commits?per_page=100`
    ),
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

export async function updatePullRequestTitle(
  client: GitHubClient,
  repoFullName: string,
  pullRequestNumber: number,
  title: string
): Promise<void> {
  await client.patch(`/repos/${repoFullName}/pulls/${pullRequestNumber}`, {
    title,
  });
}
