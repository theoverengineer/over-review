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

/**
 * Determines if a comment should use GitHub's suggestion block format.
 * This requires both replacementSnippet and a valid line range (startLine/endLine).
 */
function usesSuggestionBlock(comment: DraftInlineComment): boolean {
  return (
    comment.replacementSnippet !== undefined &&
    comment.startLine !== undefined &&
    comment.endLine !== undefined
  );
}

/**
 * Maps an inline comment to the GitHub API review comment format.
 * For ranged suggestions with replacement snippets, includes start_line, start_side, line, and side.
 * For single-line comments, includes only line and side.
 */
function mapToReviewComment(comment: DraftInlineComment): {
  body: string;
  path: string;
  line?: number;
  start_line?: number;
  start_side?: 'LEFT' | 'RIGHT';
  side?: 'LEFT' | 'RIGHT';
} {
  const base: {
    body: string;
    path: string;
    line?: number;
    start_line?: number;
    start_side?: 'LEFT' | 'RIGHT';
    side?: 'LEFT' | 'RIGHT';
  } = {
    body: comment.body,
    path: comment.path,
    side: 'RIGHT',
  };

  if (usesSuggestionBlock(comment)) {
    // Ranged comment with suggestion block
    base.start_line = comment.startLine;
    base.line = comment.endLine;
    base.start_side = 'RIGHT';
  } else {
    // Single-line comment
    base.line = comment.line;
  }

  return base;
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
        comments: comments.map(mapToReviewComment),
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
          comments: comments.map(mapToReviewComment),
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
        mapToReviewComment(comment)
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
