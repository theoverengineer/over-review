/**
 * Hidden state encoding/decoding for over-review.
 * @packageDocumentation
 */
import type { HiddenPayload } from '../contracts/review';
export declare const OVERVIEW_SIGNATURE = "<!-- overreview:overview -->";
export declare const INLINE_SIGNATURE = "<!-- overreview:inline -->";
export declare function createHiddenPayload(lastReviewedCommit: string, mode: 'full' | 'incremental', reviewedCommits?: string[]): HiddenPayload;
export declare function encodeHiddenState(payload: HiddenPayload): string;
export declare function appendOverviewMetadata(body: string, payload: HiddenPayload): string;
export declare function decodeHiddenState(commentBody: string): HiddenPayload | null;
export declare function hasOverviewSignature(commentBody: string): boolean;
export declare function appendInlineSignature(body: string): string;
export declare function stripHiddenMetadata(commentBody: string): string;
//# sourceMappingURL=hidden-state.d.ts.map