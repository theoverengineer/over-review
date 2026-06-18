import { describe, expect, it, vi } from 'vitest';

import type { AIProvider } from '../../../src/contracts/provider';
import type { GitHubClient } from '../../../src/github/client';
import { appendOverviewMetadata, createHiddenPayload } from '../../../src/render/hidden-state';
import { ReviewOrchestrator } from '../../../src/review/orchestrator';
import { createLogger } from '../../../src/runtime/logger';

describe('integration/action pull_request incremental review', () => {
  it('reviews only files changed since the last reviewed commit', async () => {
    const operations: string[] = [];
    const client = {
      get: vi.fn(async (path: string) => {
        operations.push(`GET ${path}`);

        if (path === '/repos/owner/repo/pulls/123') {
          return {
            number: 123,
            title: 'feat: update validation flow',
            body: 'Adds a safer input path.',
            head: { sha: 'new456', repo: { full_name: 'owner/repo' } },
            base: { repo: { full_name: 'owner/repo' } },
          };
        }

        if (path === '/repos/owner/repo/pulls/123/files?per_page=100') {
          return [
            {
              filename: 'src/changed.ts',
              status: 'modified',
              patch: '@@ -1,1 +1,2 @@\n export const value = input;\n+const parsed = value.trim();',
            },
            {
              filename: 'src/unchanged.ts',
              status: 'modified',
              patch: '@@ -2,1 +2,2 @@\n export const other = data;\n+const cached = other.id;',
            },
          ];
        }

        if (path === '/repos/owner/repo/pulls/123/commits?per_page=100') {
          return [{ sha: 'old123' }, { sha: 'new456' }];
        }

        if (path === '/repos/owner/repo/issues/123/comments?per_page=100') {
          return [
            {
              id: 10,
              body: appendOverviewMetadata(
                'Existing overview',
                createHiddenPayload('old123', 'full', ['old123'])
              ),
            },
          ];
        }

        if (path === '/repos/owner/repo/compare/old123...new456') {
          return {
            files: [{ filename: 'src/changed.ts' }],
          };
        }

        throw new Error(`Unexpected GET ${path}`);
      }),
      post: vi.fn(async (path: string) => {
        operations.push(`POST ${path}`);

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
            title: 'Update validation flow',
            description: 'Updates the changed file only.',
            fileSummaries: [{ path: 'src/changed.ts', summary: 'Adds trimmed parsing.' }],
            changeTypes: ['bugfix'],
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
                path: 'src/changed.ts',
                line: 2,
                severity: 'critical',
                title: 'Missing null guard',
                body: 'The new code still trims an unchecked value.',
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

    expect(result.reviewMode).toBe('incremental');
    expect(result.commitCount).toBe(1);
    expect(result.fileCount).toBe(1);
    expect(result.artifacts.finalOverviewBody).toContain('Commits considered: 1');
    const summaryPrompt = vi.mocked(provider.runInference).mock.calls[0]?.[0]?.prompt;
    expect(summaryPrompt).toContain('src/changed.ts');
    expect(summaryPrompt).not.toContain('src/unchanged.ts');
    expect(operations).toContain('GET /repos/owner/repo/compare/old123...new456');
  });
});
