/**
 * Hidden state encoding/decoding for over-review.
 * @packageDocumentation
 */

import type { HiddenPayload } from '../contracts/review';

export const OVERVIEW_SIGNATURE = '<!-- overreview:overview -->';
export const INLINE_SIGNATURE = '<!-- overreview:inline -->';
const STATE_PREFIX = '<!-- overreview:state ';
const STATE_SUFFIX = ' -->';

export function createHiddenPayload(headSha: string, mode: 'full' | 'incremental'): HiddenPayload {
  return {
    version: 1,
    reviewedCommits: headSha ? [headSha] : [],
    lastReviewedCommit: headSha,
    mode,
  };
}

export function encodeHiddenState(payload: HiddenPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
  return `${STATE_PREFIX}${encoded}${STATE_SUFFIX}`;
}

export function appendOverviewMetadata(body: string, payload: HiddenPayload): string {
  return `${body.trim()}\n\n${OVERVIEW_SIGNATURE}\n${encodeHiddenState(payload)}`;
}

export function decodeHiddenState(commentBody: string): HiddenPayload | null {
  const match = commentBody.match(/<!-- overreview:state ([A-Za-z0-9+/=]+) -->/);

  if (!match) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(match[1], 'base64').toString('utf8')) as HiddenPayload;

    if (
      parsed.version !== 1 ||
      !Array.isArray(parsed.reviewedCommits) ||
      typeof parsed.lastReviewedCommit !== 'string' ||
      (parsed.mode !== 'full' && parsed.mode !== 'incremental')
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function hasOverviewSignature(commentBody: string): boolean {
  return commentBody.includes(OVERVIEW_SIGNATURE);
}

export function appendInlineSignature(body: string): string {
  return `${body.trim()}\n\n${INLINE_SIGNATURE}`;
}

export function stripHiddenMetadata(commentBody: string): string {
  return commentBody
    .replace(/\n?<!-- overreview:overview -->/g, '')
    .replace(/\n?<!-- overreview:state [A-Za-z0-9+/=]+ -->/g, '')
    .replace(/\n?<!-- overreview:inline -->/g, '')
    .trim();
}
