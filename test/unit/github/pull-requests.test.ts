import { describe, expect, it, vi } from 'vitest';

import {
  extractPullRequestIdentity,
  fetchPullRequestIdentity,
} from '../../../src/github/pull-requests';
import type { GitHubClient } from '../../../src/github/client';
import type { RepositoryInfo } from '../../../src/runtime/types';

const repository: RepositoryInfo = {
  full_name: 'owner/repo',
  name: 'repo',
  owner: { login: 'owner', type: 'Organization' },
};

describe('extractPullRequestIdentity', () => {
  it('defaults to fork when only the base repo is available', () => {
    const identity = extractPullRequestIdentity(
      {
        number: 123,
        title: 'Test PR',
        head: { sha: 'abc123' },
        base: {
          sha: 'def456',
          repo: {
            full_name: 'owner/repo',
            name: 'repo',
            owner: { login: 'owner', type: 'Organization' },
          },
        },
      },
      repository
    );

    expect(identity.isFork).toBe(true);
  });
});

describe('fetchPullRequestIdentity', () => {
  it('rejects PR URLs outside the event repository path', async () => {
    // Create a mock client without triggering the throttling plugin
    const mockClient = {
      get: vi.fn().mockResolvedValue(null),
    } as unknown as GitHubClient;

    const identity = await fetchPullRequestIdentity(
      mockClient,
      'https://api.github.com/repos/other/repo/pulls/123',
      repository
    );

    expect(identity).toBeNull();
    expect(mockClient.get).not.toHaveBeenCalled();
  });
});
