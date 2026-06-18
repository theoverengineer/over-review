/**
 * Thread reply prompt builders for over-review.
 * @packageDocumentation
 */
import type { ReviewThread } from '../contracts/review';
export interface ThreadReplyPromptInput {
    thread: ReviewThread;
    styleGuideRules?: string;
}
export declare function buildThreadReplyPrompt(input: ThreadReplyPromptInput): string;
//# sourceMappingURL=thread-reply.d.ts.map