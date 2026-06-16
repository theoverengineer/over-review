import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  routeEventMock: vi.fn(),
  reviewRunMock: vi.fn(),
  threadReplyRunMock: vi.fn(),
  loadConfigMock: vi.fn(),
}));

vi.mock('../../src/config', () => ({
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
}));

vi.mock('../../src/github/client', () => ({
  GitHubClient: vi.fn(function MockGitHubClient() {
    return {};
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

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { runCli } from '../../src/cli';

describe('cli', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'over-review-cli-'));
    originalCwd = process.cwd();
    process.chdir(tempDir);
    mocks.routeEventMock.mockReset();
    mocks.reviewRunMock.mockReset();
    mocks.threadReplyRunMock.mockReset();
  });

  afterEach(() => {
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

    expect(mocks.loadConfigMock).toHaveBeenCalledWith({
      cli: {
        GITHUB_TOKEN: undefined,
        LLM_MODEL: undefined,
        LLM_API_KEY: undefined,
        LLM_BASE_URL: undefined,
        LLM_TIMEOUT_MS: 60000,
        GITHUB_API_URL: undefined,
        GITHUB_SERVER_URL: undefined,
        FULL_REVIEW: undefined,
        REVIEW_MODE: 'cli',
        DEBUG: undefined,
        DRY_RUN: true,
      },
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
});
