/**
 * Summary prompt builder for over-review.
 * @packageDocumentation
 */
import type { FileDiff } from '../contracts/review';
export interface SummaryPromptInput {
    title?: string;
    description?: string;
    fileDiffs: FileDiff[];
}
export declare function buildSummaryPrompt(input: SummaryPromptInput): string;
//# sourceMappingURL=summary.d.ts.map