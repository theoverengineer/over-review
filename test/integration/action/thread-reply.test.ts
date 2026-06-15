import { describe, expect, it, vi } from 'vitest';

import type { AIProvider } from '../../../src/contracts/provider';
import type { GitHubClient } from '../../../src/github/client';
import { createLogger } from '../../../src/runtime/logger';
import { ThreadReplyOrchestrator } from '../../../src/threads/reply-orchestrator';

describe('integration/action thread reply', () => {
  it('replies only for relevant threads when the model requests action', async () => {
    const operations: string[] = [];
    const client = {
      get: vi.fn(async (path: string) => {
        operations.push(`GET ${path}`);

        if (path === '/repos/owner/repo/pulls/123/comments?per_page=100') {
          return [
            {
              id: 10,
              body: '**Missing null guard**\n\nPlease guard the input.\n\n<!-- overreview:inline -->',
              user: { login: 'github-actions[bot]' },
              path: 'src/main.ts',
              line: 8,
              diff_hunk: '@@ -7,0 +8,1 @@\n+const parsed = input.trim();',
              created_at: '2026-01-01T00:00:00Z',
            },
            {
              id: 11,
              body: '@overreview can you confirm the failure mode?',
              user: { login: 'contributor' },
              in_reply_to_id: 10,
              created_at: '2026-01-01T00:01:00Z',
            },
          ];
        }

        throw new Error(`Unexpected GET ${path}`);
      }),
      post: vi.fn(async (path: string, parameters?: Record<string, unknown>) => {
        operations.push(`POST ${path}`);

        expect(parameters).toEqual({
          body: '@contributor The current line still calls trim() without proving the input is non-null.\n\n<!-- overreview:inline -->',
          in_reply_to: 11,
        });

        return { id: 12 };
      }),
    } as unknown as GitHubClient;

    const provider: AIProvider = {
      name: 'ai-sdk',
      model: 'test-model',
      runInference: vi.fn().mockResolvedValue({
        output: {
          action_requested: true,
          content: 'The current line still calls trim() without proving the input is non-null.',
        },
        attempts: 1,
        provider: 'ai-sdk',
        model: 'test-model',
      }),
    };

    const orchestrator = new ThreadReplyOrchestrator({
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

    const result = await orchestrator.run({
      repoFullName: 'owner/repo',
      pullRequestNumber: 123,
      commentId: 11,
    });

    expect(result).toMatchObject({
      handled: true,
      relevant: true,
      actionRequested: true,
      replyCommentId: 12,
    });
    expect(operations).toEqual([
      'GET /repos/owner/repo/pulls/123/comments?per_page=100',
      'POST /repos/owner/repo/pulls/123/comments',
    ]);
  });

  it('skips irrelevant threads without posting', async () => {
    const client = {
      get: vi.fn().mockResolvedValue([
        {
          id: 20,
          body: 'Can you take another look?',
          user: { login: 'reviewer' },
          path: 'src/main.ts',
          line: 8,
          created_at: '2026-01-01T00:00:00Z',
        },
      ]),
      post: vi.fn(),
    } as unknown as GitHubClient;

    const provider: AIProvider = {
      name: 'ai-sdk',
      model: 'test-model',
      runInference: vi.fn(),
    };

    const orchestrator = new ThreadReplyOrchestrator({
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

    const result = await orchestrator.run({
      repoFullName: 'owner/repo',
      pullRequestNumber: 123,
      commentId: 20,
    });

    expect(result).toMatchObject({
      handled: true,
      relevant: false,
      actionRequested: false,
    });
    expect(provider.runInference).not.toHaveBeenCalled();
    expect(client.post).not.toHaveBeenCalled();
  });
});
