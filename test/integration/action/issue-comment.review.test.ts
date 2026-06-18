import { describe, expect, it, vi } from 'vitest';

import type { AIProvider } from '../../../src/contracts/provider';
import type { GitHubClient } from '../../../src/github/client';
import { ReviewOrchestrator } from '../../../src/review/orchestrator';
import { routeEvent } from '../../../src/runtime/event-router';
import { createLogger } from '../../../src/runtime/logger';
import type { IssueCommentEvent } from '../../../src/runtime/types';

describe('integration/action issue_comment review', () => {
  it('routes an authorized /review command through the shared review flow', async () => {
    const operations: string[] = [];
    const event: IssueCommentEvent = {
      action: 'created',
      repository: {
        full_name: 'owner/repo',
        name: 'repo',
        owner: { login: 'owner', type: 'Organization' },
      },
      issue: {
        number: 123,
        title: 'PR title',
        pull_request: { url: 'https://api.github.com/repos/owner/repo/pulls/123' },
        author_association: 'OWNER',
      },
      comment: {
        id: 456,
        body: '/review',
        user: { login: 'reviewer' },
        author_association: 'OWNER',
      },
      sender: { login: 'reviewer', type: 'User' },
    };

    const client = {
      get: vi.fn(async (path: string) => {
        operations.push(`GET ${path}`);

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
          return [];
        }

        throw new Error(`Unexpected GET ${path}`);
      }),
      post: vi.fn(async (path: string) => {
        operations.push(`POST ${path}`);

        if (path === '/repos/owner/repo/issues/123/comments') {
          return { id: 10 };
        }

        if (path === '/repos/owner/repo/pulls/123/reviews') {
          return { id: 20, comments: [] };
        }

        throw new Error(`Unexpected POST ${path}`);
      }),
      patch: vi.fn(async (path: string) => {
        operations.push(`PATCH ${path}`);

        if (path === '/repos/owner/repo/issues/comments/10') {
          return { id: 10 };
        }

        throw new Error(`Unexpected PATCH ${path}`);
      }),
    } as unknown as GitHubClient;

    const outcome = await routeEvent(event, 'issue_comment', client);

    expect(outcome.outcome).toMatchObject({
      type: 'review',
      command: '/review',
      fullMode: false,
    });

    const provider: AIProvider = {
      name: 'ai-sdk',
      model: 'test-model',
      runInference: vi
        .fn()
        .mockResolvedValueOnce({
          output: {
            title: 'Add validation',
            description: 'Adds validation to the input path.',
            fileSummaries: [{ path: 'src/main.ts', summary: 'Trims the new value.' }],
            changeTypes: ['feature'],
          },
          attempts: 1,
          provider: 'ai-sdk',
          model: 'test-model',
        })
        .mockResolvedValueOnce({
          output: {
            reviewSummary: 'No actionable issues found.',
            needsAttention: false,
            findings: [],
          },
          attempts: 1,
          provider: 'ai-sdk',
          model: 'test-model',
        }),
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
        REVIEW_MODE: 'manual',
      },
      logger: createLogger({}, 'error'),
    });

    const result = await orchestrator.runPullRequestReview({
      repoFullName: event.repository.full_name,
      pullRequestNumber: event.issue.number,
      forceFullReview: outcome.outcome.fullMode,
    });

    expect(result.handled).toBe(true);
    expect(result.reviewMode).toBe('full');
    expect(operations).toContain('POST /repos/owner/repo/pulls/123/reviews');
  });
});
