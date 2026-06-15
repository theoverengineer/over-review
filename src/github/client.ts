/**
 * GitHub API client using Octokit with retry and throttling.
 * @packageDocumentation
 */

import { Octokit } from '@octokit/core';
import { retry } from '@octokit/plugin-retry';
import { throttling } from '@octokit/plugin-throttling';

export interface GitHubClientOptions {
  baseUrl?: string;
  token?: string;
  debug?: boolean;
}

interface ThrottledRequestOptions {
  method: string;
  url: string;
}

const OverReviewOctokit = Octokit.plugin(retry, throttling);

export class GitHubClient {
  private readonly client: InstanceType<typeof OverReviewOctokit>;

  constructor(options: GitHubClientOptions = {}) {
    this.client = new OverReviewOctokit({
      auth: options.token,
      baseUrl: options.baseUrl ?? 'https://api.github.com',
      log: options.debug ? console : undefined,
      retry: {
        doNotRetry: [400, 401, 403, 404],
      },
      throttling: {
        onRateLimit: (retryAfter: number, requestOptions: ThrottledRequestOptions) => {
          console.warn(
            `GitHub API rate limit for ${requestOptions.method} ${requestOptions.url}; retrying after ${retryAfter}s.`
          );
          return true;
        },
        onSecondaryRateLimit: (retryAfter: number, requestOptions: ThrottledRequestOptions) => {
          console.warn(
            `GitHub API secondary rate limit for ${requestOptions.method} ${requestOptions.url}; retrying after ${retryAfter}s.`
          );
          return true;
        },
      },
    });
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  async post<T>(path: string, parameters?: Record<string, unknown>): Promise<T> {
    return this.request<T>('POST', path, parameters);
  }

  async patch<T>(path: string, parameters?: Record<string, unknown>): Promise<T> {
    return this.request<T>('PATCH', path, parameters);
  }

  async delete<T>(path: string, parameters?: Record<string, unknown>): Promise<T> {
    return this.request<T>('DELETE', path, parameters);
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    parameters?: Record<string, unknown>
  ): Promise<T> {
    try {
      const response = await this.client.request(`${method} ${path}`, parameters);
      return response.data as T;
    } catch (error) {
      throw createGitHubClientError(error);
    }
  }
}

function createGitHubClientError(error: unknown): Error {
  if (error instanceof Error) {
    const status = 'status' in error ? error.status : undefined;
    return new Error(`GitHub API error ${status ?? 'unknown'}: ${error.message}`);
  }

  return new Error(`GitHub API error: ${String(error)}`);
}
