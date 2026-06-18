import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  routeEventMock: vi.fn(),
  reviewRunMock: vi.fn(),
  threadReplyRunMock: vi.fn(),
  loadConfigMock: vi.fn(),
  loadConfigWithMetadataMock: vi.fn(),
  execSyncMock: vi.fn(),
  clientGetMock: vi.fn(),
  githubClientConstructorCalls: [] as Array<{ token: string; baseUrl?: string; debug?: boolean }>,
}));

vi.mock('../../src/config', async () => {
  const actual = await vi.importActual<typeof import('../../src/config')>('../../src/config');

  return {
    ...actual,
    loadConfig: mocks.loadConfigMock.mockReturnValue({
      GITHUB_TOKEN: 'token',
      LLM_MODEL: 'test-model',
      LLM_API_KEY: 'key',
      LLM_PROVIDER: 'ai-sdk',
      GITHUB_API_URL: 'https://api.github.com',
      GITHUB_SERVER_URL: 'https://github.com',
      DEBUG: false,
      DRY_RUN: true,
      FULL_REVIEW: false,
      REVIEW_MODE: 'cli',
    }),
    loadConfigWithMetadata: mocks.loadConfigWithMetadataMock.mockReturnValue({
      config: {
        GITHUB_TOKEN: 'token',
        LLM_MODEL: 'test-model',
        LLM_API_KEY: 'key',
        LLM_PROVIDER: 'ai-sdk',
        GITHUB_API_URL: 'https://api.github.com',
        GITHUB_SERVER_URL: 'https://github.com',
        DEBUG: false,
        DRY_RUN: true,
        FULL_REVIEW: false,
        REVIEW_MODE: 'cli',
      },
      metadata: {
        envFile: {
          status: 'skipped',
        },
        sources: {
          GITHUB_TOKEN: 'default',
          LLM_MODEL: 'default',
          LLM_API_KEY: 'default',
          LLM_PROVIDER: 'default',
          LLM_BASE_URL: 'default',
          STYLE_GUIDE_RULES: 'default',
          LLM_TIMEOUT_MS: 'default',
          LLM_STRUCTURED_OUTPUTS: 'default',
          GITHUB_API_URL: 'default',
          GITHUB_SERVER_URL: 'default',
          DEBUG: 'default',
          DRY_RUN: 'default',
          FULL_REVIEW: 'default',
          REVIEW_MODE: 'cli',
        },
      },
    }),
  };
});

vi.mock('../../src/github/client', () => ({
  GitHubClient: vi.fn(function MockGitHubClient(options: {
    token: string;
    baseUrl?: string;
    debug?: boolean;
  }) {
    mocks.githubClientConstructorCalls.push(options);
    return {
      get: mocks.clientGetMock,
      post: vi.fn(),
      patch: vi.fn(),
    };
  }),
}));

vi.mock('../../src/providers', () => ({
  createProvider: vi.fn(() => ({ name: 'ai-sdk', model: 'test-model' })),
}));

vi.mock('../../src/runtime/event-router', () => ({
  routeEvent: mocks.routeEventMock,
}));

vi.mock('../../src/review/orchestrator', () => ({
  ReviewOrchestrator: vi.fn(function MockReviewOrchestrator() {
    return {
      runPullRequestReview: mocks.reviewRunMock,
    };
  }),
}));

vi.mock('../../src/threads/reply-orchestrator', () => ({
  ThreadReplyOrchestrator: vi.fn(function MockThreadReplyOrchestrator() {
    return {
      run: mocks.threadReplyRunMock,
    };
  }),
}));

vi.mock('child_process', () => ({
  execSync: mocks.execSyncMock,
}));

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runCli } from '../../src/cli';

describe('cli', () => {
  let tempDir: string;
  let originalCwd: string;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'over-review-cli-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    originalEnv = { ...process.env };
    mocks.routeEventMock.mockReset();
    mocks.reviewRunMock.mockReset();
    mocks.threadReplyRunMock.mockReset();
    mocks.loadConfigMock.mockReset();
    mocks.loadConfigMock.mockReturnValue({
      GITHUB_TOKEN: 'token',
      LLM_MODEL: 'test-model',
      LLM_API_KEY: 'key',
      LLM_PROVIDER: 'ai-sdk',
      GITHUB_API_URL: 'https://api.github.com',
      GITHUB_SERVER_URL: 'https://github.com',
      DEBUG: false,
      DRY_RUN: true,
      FULL_REVIEW: false,
      REVIEW_MODE: 'cli',
    });
    mocks.loadConfigWithMetadataMock.mockReset();
    mocks.loadConfigWithMetadataMock.mockReturnValue({
      config: {
        GITHUB_TOKEN: 'token',
        LLM_MODEL: 'test-model',
        LLM_API_KEY: 'key',
        LLM_PROVIDER: 'ai-sdk',
        GITHUB_API_URL: 'https://api.github.com',
        GITHUB_SERVER_URL: 'https://github.com',
        DEBUG: false,
        DRY_RUN: true,
        FULL_REVIEW: false,
        REVIEW_MODE: 'cli',
      },
      metadata: {
        envFile: {
          status: 'skipped',
        },
        sources: {
          GITHUB_TOKEN: 'default',
          LLM_MODEL: 'default',
          LLM_API_KEY: 'default',
          LLM_PROVIDER: 'default',
          LLM_BASE_URL: 'default',
          STYLE_GUIDE_RULES: 'default',
          LLM_TIMEOUT_MS: 'default',
          LLM_STRUCTURED_OUTPUTS: 'default',
          GITHUB_API_URL: 'default',
          GITHUB_SERVER_URL: 'default',
          DEBUG: 'default',
          DRY_RUN: 'default',
          FULL_REVIEW: 'default',
          REVIEW_MODE: 'cli',
        },
      },
    });
    mocks.execSyncMock.mockReset();
    mocks.clientGetMock.mockReset();
    mocks.githubClientConstructorCalls.length = 0;
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    process.env = originalEnv;
    process.chdir(originalCwd);
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('captures dry-run review output for pull_request events', async () => {
    writeFileSync(
      join(tempDir, 'event.json'),
      JSON.stringify({
        repository: { full_name: 'owner/repo' },
        pull_request: { number: 123 },
      })
    );
    mocks.routeEventMock.mockResolvedValue({
      handled: true,
      outcome: { type: 'review', fullMode: false },
    });
    mocks.reviewRunMock.mockResolvedValue({ handled: true, reviewMode: 'full' });

    await runCli([
      '--event',
      'pull_request',
      '--payload',
      'event.json',
      '--dry-run',
      '--out',
      'out.json',
    ]);

    expect(mocks.reviewRunMock).toHaveBeenCalledWith({
      repoFullName: 'owner/repo',
      pullRequestNumber: 123,
      forceFullReview: false,
    });
    expect(JSON.parse(readFileSync(join(tempDir, 'out.json'), 'utf8'))).toEqual({
      handled: true,
      reviewMode: 'full',
    });
  });

  it('exits quietly for fork PR skips', async () => {
    writeFileSync(
      join(tempDir, 'event.json'),
      JSON.stringify({
        repository: { full_name: 'owner/repo' },
        pull_request: { number: 123 },
      })
    );
    mocks.routeEventMock.mockResolvedValue({
      handled: true,
      outcome: { type: 'skip', reason: 'Fork PR silently skipped', prNumber: 123 },
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

    expect(mocks.reviewRunMock).not.toHaveBeenCalled();
    expect(mocks.threadReplyRunMock).not.toHaveBeenCalled();
    expect(() => readFileSync(join(tempDir, 'out.json'), 'utf8')).toThrow();
  });

  it('runs thread replies through the dedicated orchestrator', async () => {
    writeFileSync(
      join(tempDir, 'event.json'),
      JSON.stringify({
        repository: { full_name: 'owner/repo' },
        pull_request: { number: 123 },
        comment: { id: 55, body: '@overreview can you clarify?' },
      })
    );
    mocks.routeEventMock.mockResolvedValue({
      handled: true,
      outcome: { type: 'review' },
    });
    mocks.threadReplyRunMock.mockResolvedValue({
      handled: true,
      relevant: true,
      actionRequested: true,
    });

    await runCli([
      '--event',
      'pull_request_review_comment',
      '--payload',
      'event.json',
      '--dry-run',
    ]);

    expect(mocks.threadReplyRunMock).toHaveBeenCalledWith({
      repoFullName: 'owner/repo',
      pullRequestNumber: 123,
      commentId: 55,
    });
  });

  it('accepts --llm-timeout-ms flag', async () => {
    writeFileSync(
      join(tempDir, 'event.json'),
      JSON.stringify({
        repository: { full_name: 'owner/repo' },
        pull_request: { number: 123 },
      })
    );
    mocks.routeEventMock.mockResolvedValue({
      handled: true,
      outcome: { type: 'review', fullMode: false },
    });
    mocks.reviewRunMock.mockResolvedValue({ handled: true, reviewMode: 'full' });

    await runCli([
      '--event',
      'pull_request',
      '--payload',
      'event.json',
      '--dry-run',
      '--llm-timeout-ms',
      '60000',
    ]);

    // Verify loadConfigWithMetadata was called
    expect(mocks.loadConfigWithMetadataMock).toHaveBeenCalled();
    expect(mocks.reviewRunMock).toHaveBeenCalled();
  });

  it('honors config FULL_REVIEW for event-driven PR reviews', async () => {
    writeFileSync(
      join(tempDir, 'event.json'),
      JSON.stringify({
        repository: { full_name: 'owner/repo' },
        pull_request: { number: 123 },
      })
    );
    mocks.loadConfigWithMetadataMock.mockReturnValueOnce({
      config: {
        GITHUB_TOKEN: 'token',
        LLM_MODEL: 'test-model',
        LLM_API_KEY: 'key',
        LLM_PROVIDER: 'ai-sdk',
        GITHUB_API_URL: 'https://api.github.com',
        GITHUB_SERVER_URL: 'https://github.com',
        DEBUG: false,
        DRY_RUN: true,
        FULL_REVIEW: true,
        REVIEW_MODE: 'cli',
      },
      metadata: {
        envFile: { status: 'skipped' },
        sources: {
          GITHUB_TOKEN: 'default',
          LLM_MODEL: 'default',
          LLM_API_KEY: 'default',
          LLM_PROVIDER: 'default',
          LLM_BASE_URL: 'default',
          STYLE_GUIDE_RULES: 'default',
          LLM_TIMEOUT_MS: 'default',
          LLM_STRUCTURED_OUTPUTS: 'default',
          GITHUB_API_URL: 'default',
          GITHUB_SERVER_URL: 'default',
          DEBUG: 'default',
          DRY_RUN: 'default',
          FULL_REVIEW: 'cli',
          REVIEW_MODE: 'cli',
        },
      },
    });
    mocks.routeEventMock.mockResolvedValue({
      handled: true,
      outcome: { type: 'review', fullMode: false },
    });
    mocks.reviewRunMock.mockResolvedValue({ handled: true, reviewMode: 'full' });

    await runCli(['--event', 'pull_request', '--payload', 'event.json', '--dry-run']);

    expect(mocks.reviewRunMock).toHaveBeenCalledWith({
      repoFullName: 'owner/repo',
      pullRequestNumber: 123,
      forceFullReview: true,
    });
  });

  it('does not run orchestrator for unauthorized manual review commands', async () => {
    writeFileSync(
      join(tempDir, 'event.json'),
      JSON.stringify({
        repository: { full_name: 'owner/repo' },
        issue: { number: 123 },
        comment: { id: 456, body: '/review' },
      })
    );
    mocks.routeEventMock.mockResolvedValue({
      handled: true,
      outcome: {
        type: 'unauthorized',
        reason: 'Unauthorized manual review command: /review',
        prNumber: 123,
        command: '/review',
        eyesReaction: true,
      },
    });

    await runCli([
      '--event',
      'issue_comment',
      '--payload',
      'event.json',
      '--dry-run',
      '--out',
      'out.json',
    ]);

    expect(mocks.reviewRunMock).not.toHaveBeenCalled();
    expect(mocks.threadReplyRunMock).not.toHaveBeenCalled();
    // Output should contain the unauthorized outcome
    const output = JSON.parse(readFileSync(join(tempDir, 'out.json'), 'utf8'));
    expect(output.outcome.type).toBe('unauthorized');
    expect(output.outcome.eyesReaction).toBe(true);
  });

  it('uses default output path when --out is provided without a path', async () => {
    writeFileSync(
      join(tempDir, 'event.json'),
      JSON.stringify({
        repository: { full_name: 'owner/repo' },
        pull_request: { number: 123 },
      })
    );
    mocks.routeEventMock.mockResolvedValue({
      handled: true,
      outcome: { type: 'review', fullMode: false },
    });
    mocks.reviewRunMock.mockResolvedValue({ handled: true, reviewMode: 'full' });

    await runCli(['--event', 'pull_request', '--payload', 'event.json', '--dry-run', '--out']);

    // Check that the default output file was created
    const defaultPath = join(tempDir, 'over-review-owner-repo-pr-123.json');
    expect(() => readFileSync(defaultPath, 'utf8')).not.toThrow();
  });

  it('runs direct PR dry-run through the shared review orchestrator', async () => {
    mocks.clientGetMock.mockResolvedValue({
      number: 123,
      title: 'Feature work',
      head: { sha: 'abc123', repo: { full_name: 'owner/repo' } },
      base: { sha: 'def456', repo: { full_name: 'owner/repo' } },
    });
    mocks.reviewRunMock.mockResolvedValue({ handled: true, reviewMode: 'full' });

    await runCli([
      '--pr',
      '123',
      '--owner',
      'owner',
      '--repo',
      'repo',
      '--dry-run',
      '--github-token',
      'token123',
    ]);

    expect(mocks.clientGetMock).toHaveBeenCalledWith('/repos/owner/repo/pulls/123');
    expect(mocks.reviewRunMock).toHaveBeenCalledWith({
      repoFullName: 'owner/repo',
      pullRequestNumber: 123,
      forceFullReview: false,
    });
    expect(() =>
      readFileSync(join(tempDir, 'over-review-owner-repo-pr-123.json'), 'utf8')
    ).toThrow();
  });

  it('exits quietly for fork PR direct CLI review without writing output', async () => {
    mocks.clientGetMock.mockResolvedValue({
      number: 123,
      title: 'Forked work',
      head: { sha: 'abc123', repo: { full_name: 'fork/repo' } },
      base: { sha: 'def456', repo: { full_name: 'owner/repo' } },
    });

    await runCli([
      '--pr',
      '123',
      '--owner',
      'owner',
      '--repo',
      'repo',
      '--dry-run',
      '--github-token',
      'token123',
      '--out',
    ]);

    expect(mocks.reviewRunMock).not.toHaveBeenCalled();
    expect(mocks.loadConfigMock).not.toHaveBeenCalled();
    expect(() =>
      readFileSync(join(tempDir, 'over-review-owner-repo-pr-123.json'), 'utf8')
    ).toThrow();
  });

  it('lists pull requests without requiring LLM config', async () => {
    mocks.clientGetMock.mockResolvedValue([
      {
        number: 12,
        title: 'Same repo change',
        state: 'open',
        head: { repo: { full_name: 'owner/repo' } },
        base: { repo: { full_name: 'owner/repo' } },
      },
      {
        number: 13,
        title: 'Fork contribution',
        state: 'open',
        head: { repo: { full_name: 'fork/repo' } },
        base: { repo: { full_name: 'owner/repo' } },
      },
    ]);

    await runCli([
      '--list-prs',
      '--owner',
      'owner',
      '--repo',
      'repo',
      '--github-token',
      'token123',
    ]);

    expect(mocks.loadConfigMock).not.toHaveBeenCalled();
    expect(mocks.clientGetMock).toHaveBeenCalledWith(
      '/repos/owner/repo/pulls?state=open&per_page=10'
    );
    expect(consoleLogSpy.mock.calls.map(([line]) => String(line))).toEqual(
      expect.arrayContaining([
        'Pull requests for owner/repo (state: open, limit: 10):',
        '  #12: Same repo change',
        '  #13: Fork contribution [fork]',
      ])
    );
  });

  it('does not use .env by default for --list-prs when process.env.GITHUB_TOKEN is absent', async () => {
    mocks.clientGetMock.mockResolvedValue([
      {
        number: 12,
        title: 'PR from env',
        state: 'open',
        head: { repo: { full_name: 'owner/repo' } },
        base: { repo: { full_name: 'owner/repo' } },
      },
    ]);
    delete process.env.GITHUB_TOKEN;
    writeFileSync(join(tempDir, '.env'), 'GITHUB_TOKEN=env-file-token\n');

    await runCli(['--list-prs', '--owner', 'owner', '--repo', 'repo']);

    expect(mocks.clientGetMock).toHaveBeenCalledWith(
      '/repos/owner/repo/pulls?state=open&per_page=10'
    );
    const clientOptions = mocks.githubClientConstructorCalls[0];
    // Token should come from gh auth token fallback, not .env
    expect(clientOptions.token).toBeUndefined();
  });

  it('uses --env to load token for --list-prs', async () => {
    mocks.clientGetMock.mockResolvedValue([
      {
        number: 12,
        title: 'PR from env',
        state: 'open',
        head: { repo: { full_name: 'owner/repo' } },
        base: { repo: { full_name: 'owner/repo' } },
      },
    ]);
    delete process.env.GITHUB_TOKEN;
    writeFileSync(join(tempDir, '.env'), 'GITHUB_TOKEN=env-file-token\n');

    await runCli(['--list-prs', '--owner', 'owner', '--repo', 'repo', '--env', '.env']);

    expect(mocks.clientGetMock).toHaveBeenCalledWith(
      '/repos/owner/repo/pulls?state=open&per_page=10'
    );
    const clientOptions = mocks.githubClientConstructorCalls[0];
    expect(clientOptions.token).toBe('env-file-token');
  });

  it('does not use .env by default for --pr token resolution', async () => {
    mocks.clientGetMock.mockResolvedValue({
      number: 123,
      title: 'PR from env',
      head: { sha: 'abc123', repo: { full_name: 'owner/repo' } },
      base: { sha: 'def456', repo: { full_name: 'owner/repo' } },
    });
    delete process.env.GITHUB_TOKEN;
    writeFileSync(join(tempDir, '.env'), 'GITHUB_TOKEN=env-file-token\n');
    mocks.execSyncMock.mockReturnValue(''); // gh auth token returns empty
    mocks.reviewRunMock.mockResolvedValue({ handled: true, reviewMode: 'full' });

    await runCli(['--pr', '123', '--owner', 'owner', '--repo', 'repo', '--dry-run']);

    expect(mocks.clientGetMock).toHaveBeenCalledWith('/repos/owner/repo/pulls/123');
    const clientOptions = mocks.githubClientConstructorCalls[0];
    // Token should come from gh auth token (empty), not .env
    // Since gh auth token returns empty, token is undefined
    expect(clientOptions.token).toBeUndefined();
    // Orchestrator is still called because the PR is not a fork
    // The test was checking that .env is NOT loaded, which is now the default behavior
    // The orchestrator being called is expected - we just verify .env is not used for token
    expect(mocks.reviewRunMock).toHaveBeenCalled();
  });

  it('uses --env for --pr token resolution before PR fetch', async () => {
    mocks.clientGetMock.mockResolvedValue({
      number: 123,
      title: 'PR from env',
      head: { sha: 'abc123', repo: { full_name: 'owner/repo' } },
      base: { sha: 'def456', repo: { full_name: 'owner/repo' } },
    });
    delete process.env.GITHUB_TOKEN;
    writeFileSync(join(tempDir, '.env'), 'GITHUB_TOKEN=env-file-token\n');
    mocks.reviewRunMock.mockResolvedValue({ handled: true, reviewMode: 'full' });

    await runCli([
      '--pr',
      '123',
      '--owner',
      'owner',
      '--repo',
      'repo',
      '--dry-run',
      '--env',
      '.env',
    ]);

    expect(mocks.clientGetMock).toHaveBeenCalledWith('/repos/owner/repo/pulls/123');
    const clientOptions = mocks.githubClientConstructorCalls[0];
    expect(clientOptions.token).toBe('env-file-token');
    expect(mocks.reviewRunMock).toHaveBeenCalled();
  });

  it('process.env.GITHUB_TOKEN still wins over .env when using --env', async () => {
    mocks.clientGetMock.mockResolvedValue({
      number: 123,
      title: 'PR from env',
      head: { sha: 'abc123', repo: { full_name: 'owner/repo' } },
      base: { sha: 'def456', repo: { full_name: 'owner/repo' } },
    });
    process.env.GITHUB_TOKEN = 'process-env-token';
    writeFileSync(join(tempDir, '.env'), 'GITHUB_TOKEN=env-file-token\n');
    mocks.reviewRunMock.mockResolvedValue({ handled: true, reviewMode: 'full' });

    await runCli([
      '--pr',
      '123',
      '--owner',
      'owner',
      '--repo',
      'repo',
      '--dry-run',
      '--env',
      '.env',
    ]);

    expect(mocks.clientGetMock).toHaveBeenCalledWith('/repos/owner/repo/pulls/123');
    const clientOptions = mocks.githubClientConstructorCalls[0];
    expect(clientOptions.token).toBe('process-env-token');
  });

  it('falls back to gh auth token when neither process.env nor .env has GITHUB_TOKEN', async () => {
    mocks.clientGetMock.mockResolvedValue({
      number: 123,
      title: 'PR from gh',
      head: { sha: 'abc123', repo: { full_name: 'owner/repo' } },
      base: { sha: 'def456', repo: { full_name: 'owner/repo' } },
    });
    delete process.env.GITHUB_TOKEN;
    mocks.execSyncMock.mockReturnValue('gh-auth-token\n');
    mocks.reviewRunMock.mockResolvedValue({ handled: true, reviewMode: 'full' });

    await runCli([
      '--pr',
      '123',
      '--owner',
      'owner',
      '--repo',
      'repo',
      '--dry-run',
      '--env',
      '.env',
    ]);

    expect(mocks.clientGetMock).toHaveBeenCalledWith('/repos/owner/repo/pulls/123');
    const clientOptions = mocks.githubClientConstructorCalls[0];
    expect(clientOptions.token).toBe('gh-auth-token');
  });

  it('CLI --github-token flag takes precedence over .env when using --env', async () => {
    mocks.clientGetMock.mockResolvedValue({
      number: 123,
      title: 'PR from cli',
      head: { sha: 'abc123', repo: { full_name: 'owner/repo' } },
      base: { sha: 'def456', repo: { full_name: 'owner/repo' } },
    });
    writeFileSync(join(tempDir, '.env'), 'GITHUB_TOKEN=env-file-token\n');
    mocks.reviewRunMock.mockResolvedValue({ handled: true, reviewMode: 'full' });

    await runCli([
      '--pr',
      '123',
      '--owner',
      'owner',
      '--repo',
      'repo',
      '--dry-run',
      '--env',
      '.env',
      '--github-token',
      'cli-flag-token',
    ]);

    expect(mocks.clientGetMock).toHaveBeenCalledWith('/repos/owner/repo/pulls/123');
    const clientOptions = mocks.githubClientConstructorCalls[0];
    expect(clientOptions.token).toBe('cli-flag-token');
  });

  it('logs config sources with debug flag for event CLI', async () => {
    mocks.loadConfigWithMetadataMock.mockReturnValue({
      config: {
        GITHUB_TOKEN: 'token',
        LLM_MODEL: 'test-model',
        LLM_API_KEY: 'key',
        LLM_PROVIDER: 'ai-sdk',
        GITHUB_API_URL: 'https://api.github.com',
        GITHUB_SERVER_URL: 'https://github.com',
        DEBUG: true,
        DRY_RUN: false,
        FULL_REVIEW: false,
        REVIEW_MODE: 'cli',
      },
      metadata: {
        envFile: {
          status: 'loaded',
          path: 'C:/repo/.env',
        },
        sources: {
          GITHUB_TOKEN: 'env-file',
          LLM_MODEL: 'cli',
          LLM_API_KEY: 'env-file',
          LLM_PROVIDER: 'default',
          LLM_BASE_URL: 'default',
          STYLE_GUIDE_RULES: 'default',
          LLM_TIMEOUT_MS: 'default',
          LLM_STRUCTURED_OUTPUTS: 'default',
          GITHUB_API_URL: 'default',
          GITHUB_SERVER_URL: 'default',
          DEBUG: 'cli',
          DRY_RUN: 'default',
          FULL_REVIEW: 'default',
          REVIEW_MODE: 'cli',
        },
      },
    });

    const debugLogSpy = vi.spyOn(console, 'debug').mockImplementation(() => undefined);

    writeFileSync(
      join(tempDir, 'event.json'),
      JSON.stringify({
        repository: { full_name: 'owner/repo' },
        pull_request: { number: 123 },
      })
    );
    mocks.routeEventMock.mockResolvedValue({
      handled: true,
      outcome: { type: 'review', fullMode: false },
    });
    mocks.reviewRunMock.mockResolvedValue({ handled: true, reviewMode: 'full' });

    await runCli([
      '--event',
      'pull_request',
      '--payload',
      'event.json',
      '--debug',
      '--llm-model',
      'my-model',
    ]);

    // Verify debug log was called (config sources are logged)
    const debugLogs = debugLogSpy.mock.calls;
    const configLog = debugLogs.find((call) => String(call).includes('Config resolved'));
    expect(configLog).toBeUndefined();
    const resolvedLog = debugLogs.find((call) =>
      String(call).includes('Resolved CLI config sources')
    );
    expect(resolvedLog).toBeDefined();
    const resolvedLogEntry = JSON.parse(String(resolvedLog?.[0])) as { message: string };
    expect(resolvedLogEntry.message).toContain('Resolved CLI config sources');
    expect(resolvedLogEntry.message).toContain('"status":"loaded"');
    expect(resolvedLogEntry.message).toContain('"path":"C:/repo/.env"');
    expect(resolvedLogEntry.message).toContain('"LLM_MODEL":"cli"');
    expect(resolvedLogEntry.message).toContain('"GITHUB_TOKEN":"env-file"');
    expect(resolvedLogEntry.message).not.toContain('gh-auth-token');
    expect(resolvedLogEntry.message).not.toContain('"GITHUB_TOKEN":"token"');
    expect(resolvedLogEntry.message).not.toContain('"LLM_API_KEY":"key"');

    debugLogSpy.mockRestore();
  });

  it('logs config sources with debug flag for direct --pr CLI', async () => {
    mocks.clientGetMock.mockResolvedValue({
      number: 123,
      title: 'PR',
      head: { sha: 'abc123', repo: { full_name: 'owner/repo' } },
      base: { sha: 'def456', repo: { full_name: 'owner/repo' } },
    });
    mocks.reviewRunMock.mockResolvedValue({ handled: true, reviewMode: 'full' });

    mocks.execSyncMock.mockReturnValue('gh-auth-token\n');
    mocks.loadConfigWithMetadataMock.mockReturnValue({
      config: {
        GITHUB_TOKEN: 'gh-auth-token',
        LLM_MODEL: 'test-model',
        LLM_API_KEY: 'key',
        LLM_PROVIDER: 'ai-sdk',
        GITHUB_API_URL: 'https://api.github.com',
        GITHUB_SERVER_URL: 'https://github.com',
        DEBUG: true,
        DRY_RUN: true,
        FULL_REVIEW: false,
        REVIEW_MODE: 'cli',
      },
      metadata: {
        envFile: {
          status: 'skipped',
        },
        sources: {
          GITHUB_TOKEN: 'cli',
          LLM_MODEL: 'default',
          LLM_API_KEY: 'default',
          LLM_PROVIDER: 'default',
          LLM_BASE_URL: 'default',
          STYLE_GUIDE_RULES: 'default',
          LLM_TIMEOUT_MS: 'default',
          LLM_STRUCTURED_OUTPUTS: 'default',
          GITHUB_API_URL: 'default',
          GITHUB_SERVER_URL: 'default',
          DEBUG: 'cli',
          DRY_RUN: 'cli',
          FULL_REVIEW: 'default',
          REVIEW_MODE: 'cli',
        },
      },
    });

    const debugLogSpy = vi.spyOn(console, 'debug').mockImplementation(() => undefined);

    await runCli(['--pr', '123', '--owner', 'owner', '--repo', 'repo', '--debug']);

    const debugLogs = debugLogSpy.mock.calls;
    const resolvedLog = debugLogs.find((call) =>
      String(call).includes('Resolved CLI config sources')
    );
    expect(resolvedLog).toBeDefined();
    const resolvedLogEntry = JSON.parse(String(resolvedLog?.[0])) as { message: string };
    expect(resolvedLogEntry.message).toContain('"GITHUB_TOKEN":"gh-auth"');
    expect(resolvedLogEntry.message).not.toContain('gh-auth-token');

    debugLogSpy.mockRestore();
  });
});
