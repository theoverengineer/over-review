/**
 * GitHub reactions helpers for over-review.
 * @packageDocumentation
 */

import type { GitHubClient } from './client';

export async function addReaction(
  client: GitHubClient,
  repoFullName: string,
  commentId: number,
  content: string
): Promise<void> {
  await client.post<{ id: number }>(
    `/repos/${repoFullName}/issues/comments/${commentId}/reactions`,
    {
      content,
    }
  );
}
