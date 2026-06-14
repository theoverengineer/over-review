/**
 * Minimal GitHub API client using fetch.
 * @packageDocumentation
 */

/**
 * Options for the GitHub client.
 */
export interface GitHubClientOptions {
  /** GitHub API base URL (default: https://api.github.com) */
  baseUrl?: string;
  /** GitHub personal access token (optional, for authenticated requests) */
  token?: string;
}

/**
 * GitHub client for making API requests.
 */
export class GitHubClient {
  private readonly baseUrl: string;
  private readonly token?: string;

  constructor(options: GitHubClientOptions = {}) {
    this.baseUrl = options.baseUrl || 'https://api.github.com';
    this.token = options.token;
  }

  /**
   * Make a GET request to the GitHub API.
   * @param path - API path (e.g., '/repos/owner/repo/pulls/123')
   * @returns Parsed JSON response
   */
  async get<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'over-review',
    };

    if (this.token) {
      headers['Authorization'] = `token ${this.token}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      let errorBody = '';
      try {
        errorBody = await response.text();
      } catch {
        // Ignore text parsing errors
      }

      throw new Error(
        `GitHub API error ${response.status}: ${response.statusText} (${errorBody || 'No body'})`
      );
    }

    return (await response.json()) as T;
  }
}
