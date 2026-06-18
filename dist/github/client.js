"use strict";
/**
 * GitHub API client using Octokit with retry and throttling.
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitHubClient = void 0;
const core_1 = require("@octokit/core");
const plugin_retry_1 = require("@octokit/plugin-retry");
const plugin_throttling_1 = require("@octokit/plugin-throttling");
const OverReviewOctokit = core_1.Octokit.plugin(plugin_retry_1.retry, plugin_throttling_1.throttling);
class GitHubClient {
    constructor(options = {}) {
        this.client = new OverReviewOctokit({
            auth: options.token,
            baseUrl: options.baseUrl ?? 'https://api.github.com',
            log: options.debug ? console : undefined,
            retry: {
                doNotRetry: [400, 401, 403, 404],
            },
            throttle: {
                onRateLimit: (retryAfter, requestOptions) => {
                    console.warn(`GitHub API rate limit for ${requestOptions.method} ${requestOptions.url}; retrying after ${retryAfter}s.`);
                    return true;
                },
                onSecondaryRateLimit: (retryAfter, requestOptions) => {
                    console.warn(`GitHub API secondary rate limit for ${requestOptions.method} ${requestOptions.url}; retrying after ${retryAfter}s.`);
                    return true;
                },
            },
        });
    }
    async get(path) {
        return this.request('GET', path);
    }
    async post(path, parameters) {
        return this.request('POST', path, parameters);
    }
    async patch(path, parameters) {
        return this.request('PATCH', path, parameters);
    }
    async delete(path, parameters) {
        return this.request('DELETE', path, parameters);
    }
    async request(method, path, parameters) {
        try {
            const response = await this.client.request(`${method} ${path}`, parameters);
            return response.data;
        }
        catch (error) {
            throw createGitHubClientError(error);
        }
    }
}
exports.GitHubClient = GitHubClient;
function createGitHubClientError(error) {
    if (error instanceof Error) {
        const status = 'status' in error ? error.status : undefined;
        return new Error(`GitHub API error ${status ?? 'unknown'}: ${error.message}`);
    }
    return new Error(`GitHub API error: ${String(error)}`);
}
//# sourceMappingURL=client.js.map