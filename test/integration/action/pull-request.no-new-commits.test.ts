import { describe, expect, it, vi } from 'vitest';

import type { AIProvider } from '../../../src/contracts/provider';
import type { GitHubClient } from '../../../src/github/client';
import { appendOverviewMetadata, createHiddenPayload } from '../../../src/render/hidden-state';
import { ReviewOrchestrator } from '../../../src/review/orchestrator';
import { createLogger } from '../../../src/runtime/logger';

describe('integration/action pull_request no new commits', () => {
  it('exits without writing when the latest commit was already reviewed', async () => {
    const client = {
      get: vi.fn(async (path: string) => {
        if (path === '/repos/owner/repo/pulls/123') {
          return {
            number: 123,
            title: 'feat: add validation',
            body: 'Adds validation.',
            head: { sha: 'abc123', repo: { full_name: 'owner/repo' } },
            base: { repo: { full_name: 'owner/repo' } },
          };
        }

        if (path === '/repos/owner/repo/pulls/123/files?per_page=100') {
          return [
            {
              filename: 'src/main.ts',
              status: 'modified',
              patch: '@@ -1,1 +1,2 @@\n export const value = input;\n+const parsed = value.trim();',
            },
          ];
        }

        if (path === '/repos/owner/repo/pulls/123/commits?per_page=100') {
          return [{ sha: 'abc123' }];
        }

        if (path === '/repos/owner/repo/issues/123/comments?per_page=100') {
          return [
            {
              id: 10,
              body: appendOverviewMetadata(
                'Existing overview',
                createHiddenPayload('abc123', 'full', ['abc123'])
              ),
            },
          ];
        }

        throw new Error(`Unexpected GET ${path}`);
      }),
      post: vi.fn(),
      patch: vi.fn(),
    } as unknown as GitHubClient;

    const provider: AIProvider = {
      name: 'ai-sdk',
      model: 'test-model',
      runInference: vi.fn(),
    };

    const orchestrator = new ReviewOrchestrator({
      client,
      provider,
      config: {
        GITHUB_TOKEN: 'token',
        LLM_MODEL: 'test-model',
        LLM_API_KEY: 'key',
        LLM_PROVIDER: 'ai-sdk',
        GITHUB_API_URL: 'https://api.github.com',
        GITHUB_SERVER_URL: 'https://github.com',
        DEBUG: false,
        DRY_RUN: false,
        FULL_REVIEW: false,
        REVIEW_MODE: 'auto',
      },
      logger: createLogger({}, 'error'),
    });

    const result = await orchestrator.runPullRequestReview({
      repoFullName: 'owner/repo',
      pullRequestNumber: 123,
    });

    expect(result).toMatchObject({
      handled: true,
      reason: 'No new commits since last review',
      reviewMode: 'incremental',
      commitCount: 0,
      fileCount: 0,
    });
    expect(provider.runInference).not.toHaveBeenCalled();
    expect(client.post).not.toHaveBeenCalled();
    expect(client.patch).not.toHaveBeenCalled();
  });
});
