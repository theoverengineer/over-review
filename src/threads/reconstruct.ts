/**
 * Review thread reconstruction helpers.
 * @packageDocumentation
 */

import type {
  PullRequestReviewCommentRecord,
  ReviewThread,
  ThreadComment,
} from '../contracts/review';
import { INLINE_SIGNATURE, OVERVIEW_SIGNATURE, stripHiddenMetadata } from '../render/hidden-state';
import { isBotComment } from '../runtime/guards';

export function reconstructReviewThread(
  comments: PullRequestReviewCommentRecord[],
  triggeredCommentId: number
): ReviewThread | null {
  const commentMap = new Map(comments.map((comment) => [comment.id, comment]));
  const triggeredComment = commentMap.get(triggeredCommentId);

  if (!triggeredComment) {
    return null;
  }

  const rootCommentId = findRootCommentId(triggeredComment, commentMap);
  const rootComment = commentMap.get(rootCommentId) ?? triggeredComment;
  const threadRecords = comments
    .filter((comment) => findRootCommentId(comment, commentMap) === rootCommentId)
    .sort(compareComments);
  const threadComments = threadRecords.map(toThreadComment);
  const latestComment = threadComments[threadComments.length - 1];

  if (!latestComment) {
    return null;
  }

  return {
    replyToCommentId: triggeredComment.id,
    path: triggeredComment.path ?? rootComment.path,
    line:
      triggeredComment.line ??
      triggeredComment.original_line ??
      rootComment.line ??
      rootComment.original_line ??
      null,
    diffHunk: triggeredComment.diff_hunk ?? rootComment.diff_hunk,
    comments: threadComments,
    latestComment,
  };
}

function findRootCommentId(
  comment: PullRequestReviewCommentRecord,
  commentMap: Map<number, PullRequestReviewCommentRecord>
): number {
  const visited = new Set<number>();
  let current = comment;

  while (current.in_reply_to_id) {
    if (visited.has(current.id)) {
      break;
    }

    visited.add(current.id);
    const parent = commentMap.get(current.in_reply_to_id);

    if (!parent) {
      break;
    }

    current = parent;
  }

  return current.id;
}

function compareComments(
  left: PullRequestReviewCommentRecord,
  right: PullRequestReviewCommentRecord
): number {
  const leftCreatedAt = left.created_at ? Date.parse(left.created_at) : Number.NaN;
  const rightCreatedAt = right.created_at ? Date.parse(right.created_at) : Number.NaN;

  if (
    !Number.isNaN(leftCreatedAt) &&
    !Number.isNaN(rightCreatedAt) &&
    leftCreatedAt !== rightCreatedAt
  ) {
    return leftCreatedAt - rightCreatedAt;
  }

  return left.id - right.id;
}

function toThreadComment(comment: PullRequestReviewCommentRecord): ThreadComment {
  return {
    author: comment.user?.login ?? 'unknown',
    body: stripHiddenMetadata(comment.body),
    isBot: isBotComment(comment.user?.login) || hasOverReviewSignature(comment.body),
  };
}

function hasOverReviewSignature(body: string): boolean {
  return body.includes(INLINE_SIGNATURE) || body.includes(OVERVIEW_SIGNATURE);
}
