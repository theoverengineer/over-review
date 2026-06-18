/**
 * GitHub API client using Octokit with retry and throttling.
 * @packageDocumentation
 */
export interface GitHubClientOptions {
    baseUrl?: string;
    token?: string;
    debug?: boolean;
}
export declare class GitHubClient {
    private readonly client;
    constructor(options?: GitHubClientOptions);
    get<T>(path: string): Promise<T>;
    post<T>(path: string, parameters?: Record<string, unknown>): Promise<T>;
    patch<T>(path: string, parameters?: Record<string, unknown>): Promise<T>;
    delete<T>(path: string, parameters?: Record<string, unknown>): Promise<T>;
    private request;
}
//# sourceMappingURL=client.d.ts.map