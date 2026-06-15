/**
 * GitHub comments helpers for over-review.
 * @packageDocumentation
 */

import type { GitHubClient } from './client';
import type {
  HiddenPayload,
  IssueCommentRecord,
  PullRequestReviewCommentRecord,
} from '../contracts/review';
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

export async function listReviewComments(
  client: GitHubClient,
  repoFullName: string,
  pullRequestNumber: number
): Promise<PullRequestReviewCommentRecord[]> {
  return client.get<PullRequestReviewCommentRecord[]>(
    `/repos/${repoFullName}/pulls/${pullRequestNumber}/comments?per_page=100`
  );
}

export async function createReviewCommentReply(
  client: GitHubClient,
  repoFullName: string,
  pullRequestNumber: number,
  inReplyTo: number,
  body: string
): Promise<number> {
  const response = await client.post<{ id: number }>(
    `/repos/${repoFullName}/pulls/${pullRequestNumber}/comments`,
    {
      body,
      in_reply_to: inReplyTo,
    }
  );

  return response.id;
}
