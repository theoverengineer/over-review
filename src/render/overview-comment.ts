/**
 * Overview comment renderers for over-review.
 * @packageDocumentation
 */

import type { HiddenPayload, PullRequestSummary } from '../contracts/review';
import type { ReviewOutput } from '../prompts/schemas';
import { appendOverviewMetadata } from './hidden-state';

export interface LoadingOverviewCommentInput {
  payload: HiddenPayload;
  reviewMode: 'full' | 'incremental';
}

export interface FinalOverviewCommentInput {
  payload: HiddenPayload;
  summary: PullRequestSummary;
  review: ReviewOutput;
  fileCount: number;
  commitCount: number;
  actionableFindingCount: number;
  inlineCommentCount: number;
}

export interface NoReviewableChangesCommentInput {
  payload: HiddenPayload;
}

export function renderLoadingOverviewComment(input: LoadingOverviewCommentInput): string {
  return appendOverviewMetadata(
    [
      '## OverReview',
      '',
      `Status: Running a ${input.reviewMode} review.`,
      '',
      'This comment will be updated when the review completes.',
    ].join('\n'),
    input.payload
  );
}

export function renderFinalOverviewComment(input: FinalOverviewCommentInput): string {
  const fileSummaries = input.summary.fileSummaries.length
    ? input.summary.fileSummaries.map((file) => `- \`${file.path}\`: ${file.summary}`)
    : ['- No file summaries returned.'];

  const body = [
    '## OverReview',
    '',
    `**${input.summary.title}**`,
    '',
    input.summary.description,
    '',
    `Needs attention: ${input.review.needsAttention ? 'yes' : 'no'}`,
    `Commits considered: ${input.commitCount}`,
    `Files reviewed: ${input.fileCount}`,
    `Actionable findings: ${input.actionableFindingCount}`,
    `Inline comments posted: ${input.inlineCommentCount}`,
    '',
    '### File Summaries',
    ...fileSummaries,
    '',
    `Change types: ${input.summary.changeTypes.join(', ') || 'none'}`,
  ].join('\n');

  return appendOverviewMetadata(body, input.payload);
}

export function renderNoReviewableChangesComment(input: NoReviewableChangesCommentInput): string {
  return appendOverviewMetadata(
    ['## OverReview', '', 'No reviewable diff hunks were found for this run.'].join('\n'),
    input.payload
  );
}
