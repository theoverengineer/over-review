/**
 * Handle issue_comment events.
 * @packageDocumentation
 */
import type { EventOutcome, IssueCommentEvent, ManualReviewCommandName, ResolvedPullRequestIdentity } from '../runtime/types';
export interface ManualReviewCommand {
    command: ManualReviewCommandName;
    fullMode: boolean;
}
export interface IssueCommentHandlerOptions {
    resolvedPrIdentity?: ResolvedPullRequestIdentity;
}
export declare function parseManualReviewCommand(commentBody: string): ManualReviewCommand | null;
export declare function handleIssueComment(event: IssueCommentEvent, options?: IssueCommentHandlerOptions): EventOutcome;
//# sourceMappingURL=handle-issue-comment.d.ts.map