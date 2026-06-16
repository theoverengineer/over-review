import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  loadConfigMock: vi.fn(),
  routeEventMock: vi.fn(),
  addReactionMock: vi.fn(),
  reviewRunMock: vi.fn(),
  threadReplyRunMock: vi.fn(),
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
    DRY_RUN: false,
    FULL_REVIEW: false,
    REVIEW_MODE: 'auto',
  }),
}));

vi.mock('../../src/github/client', () => ({
  GitHubClient: vi.fn(function MockGitHubClient() {
    return {};
  }),
}));

vi.mock('../../src/github/reactions', () => ({
  addReaction: mocks.addReactionMock,
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

import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { main } from '../../src/main';

describe('main', () => {
  let tempDir: string;
  let eventPath: string;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'over-review-main-'));
    eventPath = join(tempDir, 'event.json');
    mocks.routeEventMock.mockReset();
    mocks.addReactionMock.mockReset();
    mocks.reviewRunMock.mockReset();
    mocks.threadReplyRunMock.mockReset();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('adds an eyes reaction for unauthorized manual review commands without running review', async () => {
    writeFileSync(
      eventPath,
      JSON.stringify({
        repository: { full_name: 'owner/repo' },
        issue: {
          number: 123,
          pull_request: { url: 'https://api.github.com/repos/owner/repo/pulls/123' },
        },
        comment: { id: 456, body: '/review' },
      })
    );
    process.env.GITHUB_EVENT_NAME = 'issue_comment';
    process.env.GITHUB_EVENT_PATH = eventPath;
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

    await main();

    expect(mocks.addReactionMock).toHaveBeenCalledWith({}, 'owner/repo', 456, 'eyes');
    expect(mocks.reviewRunMock).not.toHaveBeenCalled();
    expect(mocks.threadReplyRunMock).not.toHaveBeenCalled();
  });
});
