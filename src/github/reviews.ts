/**
 * GitHub reviews helpers for over-review.
 * @packageDocumentation
 */

import type { GitHubClient } from './client';

export interface DraftInlineComment {
  path: string;
  line: number;
  body: string;
}

export interface SubmittedReview {
  reviewId: number;
  inlineCommentIds: number[];
}

export async function submitReview(
  client: GitHubClient,
  repoFullName: string,
  pullRequestNumber: number,
  body: string,
  comments: DraftInlineComment[],
  needsAttention: boolean
): Promise<SubmittedReview> {
  try {
    const response = await client.post<{ id: number; comments?: Array<{ id: number }> }>(
      `/repos/${repoFullName}/pulls/${pullRequestNumber}/reviews`,
      {
        body,
        event: needsAttention ? 'REQUEST_CHANGES' : 'COMMENT',
        comments: comments.map((comment) => ({
          body: comment.body,
          path: comment.path,
          line: comment.line,
          side: 'RIGHT',
        })),
      }
    );

    return {
      reviewId: response.id,
      inlineCommentIds: response.comments?.map((comment) => comment.id) ?? [],
    };
  } catch {
    const summaryReview = await client.post<{ id: number }>(
      `/repos/${repoFullName}/pulls/${pullRequestNumber}/reviews`,
      {
        body,
        event: needsAttention ? 'REQUEST_CHANGES' : 'COMMENT',
      }
    );

    const inlineCommentIds: number[] = [];

    for (const comment of comments) {
      const response = await client.post<{ id: number }>(
        `/repos/${repoFullName}/pulls/${pullRequestNumber}/comments`,
        {
          body: comment.body,
          path: comment.path,
          line: comment.line,
          side: 'RIGHT',
        }
      );
      inlineCommentIds.push(response.id);
    }

    return {
      reviewId: summaryReview.id,
      inlineCommentIds,
    };
  }
}
