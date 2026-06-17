/**
 * GitHub reviews helpers for over-review.
 * @packageDocumentation
 */

import type { GitHubClient } from './client';

export interface DraftInlineComment {
  path: string;
  line: number;
  startLine?: number;
  endLine?: number;
  replacementSnippet?: string;
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
  const reviewEvent = needsAttention ? 'REQUEST_CHANGES' : 'COMMENT';

  try {
    const response = await client.post<{ id: number; comments?: Array<{ id: number }> }>(
      `/repos/${repoFullName}/pulls/${pullRequestNumber}/reviews`,
      {
        body,
        event: reviewEvent,
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
  } catch (error) {
    const fallbackEvent = shouldDowngradeReviewEvent(error, reviewEvent) ? 'COMMENT' : reviewEvent;

    if (fallbackEvent !== reviewEvent) {
      const response = await client.post<{ id: number; comments?: Array<{ id: number }> }>(
        `/repos/${repoFullName}/pulls/${pullRequestNumber}/reviews`,
        {
          body,
          event: fallbackEvent,
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
    }

    const summaryReview = await client.post<{ id: number }>(
      `/repos/${repoFullName}/pulls/${pullRequestNumber}/reviews`,
      {
        body,
        event: fallbackEvent,
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

function shouldDowngradeReviewEvent(error: unknown, event: 'REQUEST_CHANGES' | 'COMMENT'): boolean {
  if (event !== 'REQUEST_CHANGES' || !(error instanceof Error)) {
    return false;
  }

  return error.message.toLowerCase().includes('can not request changes on your own pull request');
}
