import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  clientGet: vi.fn(),
  clientPost: vi.fn(),
  clientPatch: vi.fn(),
  providerRunInference: vi.fn(),
}));

vi.mock('../../../src/github/client', () => ({
  GitHubClient: vi.fn(function MockGitHubClient() {
    return {
      get: mocks.clientGet,
      post: mocks.clientPost,
      patch: mocks.clientPatch,
    };
  }),
}));

vi.mock('../../../src/providers', () => ({
  createProvider: vi.fn(() => ({
    name: 'ai-sdk',
    model: 'test-model',
    runInference: mocks.providerRunInference,
  })),
}));

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runCli } from '../../../src/cli';

describe('integration/cli dry-run review', () => {
  let tempDir: string;
  let originalCwd: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'over-review-cli-integration-'));
    originalCwd = process.cwd();
    originalEnv = { ...process.env };
    process.chdir(tempDir);
    process.env.GITHUB_TOKEN = 'token';
    process.env.LLM_MODEL = 'test-model';
    process.env.LLM_API_KEY = 'key';

    mocks.clientGet.mockReset();
    mocks.clientPost.mockReset();
    mocks.clientPatch.mockReset();
    mocks.providerRunInference.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
    process.chdir(originalCwd);
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('performs fetch and prompt steps but skips GitHub writes', async () => {
    writeFileSync(
      join(tempDir, 'event.json'),
      JSON.stringify({
        action: 'opened',
        repository: {
          full_name: 'owner/repo',
          name: 'repo',
          owner: { login: 'owner', type: 'Organization' },
        },
        pull_request: {
          number: 123,
          title: 'feat: add validation',
          head: {
            sha: 'abc123',
            repo: {
              full_name: 'owner/repo',
              name: 'repo',
              owner: { login: 'owner', type: 'Organization' },
            },
          },
          base: {
            sha: 'def456',
            repo: {
              full_name: 'owner/repo',
              name: 'repo',
              owner: { login: 'owner', type: 'Organization' },
            },
          },
        },
      }),
      'utf8'
    );

    mocks.clientGet.mockImplementation(async (path: string) => {
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
    });

    mocks.providerRunInference
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
      });

    await runCli([
      '--event',
      'pull_request',
      '--payload',
      'event.json',
      '--dry-run',
      '--out',
      'out.json',
    ]);

    const output = JSON.parse(readFileSync(join(tempDir, 'out.json'), 'utf8'));
    expect(output.reviewMode).toBe('full');
    expect(mocks.providerRunInference).toHaveBeenCalledTimes(2);
    expect(mocks.clientPost).not.toHaveBeenCalled();
    expect(mocks.clientPatch).not.toHaveBeenCalled();
  });
});
