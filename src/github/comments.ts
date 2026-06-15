/**
 * GitHub comments helpers for over-review.
 * @packageDocumentation
 */

import type { GitHubClient } from './client';
import type { HiddenPayload, IssueCommentRecord } from '../contracts/review';
import {
  decodeHiddenState,
  hasOverviewSignature,
  stripHiddenMetadata,
} from '../render/hidden-state';

export interface OverviewComment {
  id: number;
  body: string;
  cleanedBody: string;
  payload: HiddenPayload | null;
}

export async function listIssueComments(
  client: GitHubClient,
  repoFullName: string,
  issueNumber: number
): Promise<IssueCommentRecord[]> {
  return client.get<IssueCommentRecord[]>(
    `/repos/${repoFullName}/issues/${issueNumber}/comments?per_page=100`
  );
}

export function findOverviewComment(comments: IssueCommentRecord[]): OverviewComment | null {
  for (const comment of comments) {
    if (!hasOverviewSignature(comment.body)) {
      continue;
    }

    return {
      id: comment.id,
      body: comment.body,
      cleanedBody: stripHiddenMetadata(comment.body),
      payload: decodeHiddenState(comment.body),
    };
  }

  return null;
}

export async function createOverviewComment(
  client: GitHubClient,
  repoFullName: string,
  issueNumber: number,
  body: string
): Promise<number> {
  const response = await client.post<{ id: number }>(
    `/repos/${repoFullName}/issues/${issueNumber}/comments`,
    { body }
  );

  return response.id;
}

export async function updateOverviewComment(
  client: GitHubClient,
  repoFullName: string,
  commentId: number,
  body: string
): Promise<void> {
  await client.patch(`/repos/${repoFullName}/issues/comments/${commentId}`, { body });
}
