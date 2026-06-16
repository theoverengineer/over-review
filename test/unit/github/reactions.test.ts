import { describe, expect, it, vi } from 'vitest';

import { GitHubClient } from '../../../src/github/client';
import { addReaction } from '../../../src/github/reactions';

describe('addReaction', () => {
  it('posts a reaction to the issue comment', async () => {
    const mockClient = {
      post: vi.fn().mockResolvedValue({ id: 1 }),
    } as unknown as GitHubClient;

    await addReaction(mockClient, 'owner/repo', 456, 'eyes');

    expect(mockClient.post).toHaveBeenCalledWith(
      '/repos/owner/repo/issues/comments/456/reactions',
      {
        content: 'eyes',
      }
    );
  });
});
