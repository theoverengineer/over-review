import { describe, expect, it, vi } from 'vitest';

import type { AIProvider } from '../../../src/contracts/provider';
import { ReviewOrchestrator } from '../../../src/review/orchestrator';
import { createLogger } from '../../../src/runtime/logger';
import type { GitHubClient } from '../../../src/github/client';

describe('integration/action pull_request full review', () => {
  it('creates a loading overview comment, submits the review, and updates the overview comment', async () => {
    const operations: string[] = [];
    const client = {
      get: vi.fn(async (path: string) => {
        operations.push(`GET ${path}`);

        if (path === '/repos/owner/repo/pulls/123') {
          return {
            number: 123,
            title: 'feat: add validation',
            body: 'Adds a validation guard.',
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
      post: vi.fn(async (path: string, parameters?: Record<string, unknown>) => {
        operations.push(`POST ${path}`);

        if (path === '/repos/owner/repo/issues/123/comments') {
          return { id: 10, body: parameters?.body };
        }

        if (path === '/repos/owner/repo/pulls/123/reviews') {
          return { id: 20, comments: [{ id: 30 }] };
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

    const provider: AIProvider = {
      name: 'ai-sdk',
      model: 'test-model',
      runInference: vi
        .fn()
        .mockResolvedValueOnce({
          output: {
            title: 'Add validation guard',
            description: 'Adds a validation guard for the new input path.',
            fileSummaries: [{ path: 'src/main.ts', summary: 'Adds a parsed value guard.' }],
            changeTypes: ['feature'],
          },
          attempts: 1,
          provider: 'ai-sdk',
          model: 'test-model',
        })
        .mockResolvedValueOnce({
          output: {
            reviewSummary: 'One actionable issue was found.',
            needsAttention: true,
            findings: [
              {
                path: 'src/main.ts',
                line: 2,
                startLine: 2,
                endLine: 2,
                replacementSnippet: 'const parsed = (value ?? "").trim();',
                severity: 'critical',
                title: 'Missing empty-input guard',
                body: 'Calling trim() on an unchecked value can still throw when the input is null.',
              },
            ],
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
        REVIEW_MODE: 'auto',
      },
      logger: createLogger({}, 'error'),
    });

    const result = await orchestrator.runPullRequestReview({
      repoFullName: 'owner/repo',
      pullRequestNumber: 123,
    });

    expect(result.handled).toBe(true);
    expect(result.summary?.title).toBe('Add validation guard');
    expect(result.inlineFindings).toHaveLength(1);
    expect(result.inlineFindings[0]).toMatchObject({
      startLine: 2,
      endLine: 2,
      replacementSnippet: 'const parsed = (value ?? "").trim();',
    });
    expect(result.artifacts.loadingOverviewBody).toContain('<!-- overreview:overview -->');
    expect(result.artifacts.finalOverviewBody).toContain('Add validation guard');
    expect(result.artifacts.reviewBody).toContain('One actionable issue was found.');
    expect(result.artifacts.inlineComments[0]).toMatchObject({
      path: 'src/main.ts',
      line: 2,
      startLine: 2,
      endLine: 2,
      replacementSnippet: 'const parsed = (value ?? "").trim();',
    });
    expect(result.artifacts.inlineComments[0].body).toContain('Suggested replacement:');
    expect(operations).toEqual([
      'GET /repos/owner/repo/pulls/123',
      'GET /repos/owner/repo/pulls/123/files?per_page=100',
      'GET /repos/owner/repo/pulls/123/commits?per_page=100',
      'GET /repos/owner/repo/issues/123/comments?per_page=100',
      'POST /repos/owner/repo/issues/123/comments',
      'POST /repos/owner/repo/pulls/123/reviews',
      'PATCH /repos/owner/repo/issues/comments/10',
    ]);
  });
});
