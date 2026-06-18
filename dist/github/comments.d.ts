/**
 * GitHub comments helpers for over-review.
 * @packageDocumentation
 */
import type { GitHubClient } from './client';
import type { HiddenPayload, IssueCommentRecord, PullRequestReviewCommentRecord } from '../contracts/review';
export interface OverviewComment {
    id: number;
    body: string;
    cleanedBody: string;
    payload: HiddenPayload | null;
}
export declare function listIssueComments(client: GitHubClient, repoFullName: string, issueNumber: number): Promise<IssueCommentRecord[]>;
export declare function findOverviewComment(comments: IssueCommentRecord[]): OverviewComment | null;
export declare function createOverviewComment(client: GitHubClient, repoFullName: string, issueNumber: number, body: string): Promise<number>;
export declare function updateOverviewComment(client: GitHubClient, repoFullName: string, commentId: number, body: string): Promise<void>;
export declare function listReviewComments(client: GitHubClient, repoFullName: string, pullRequestNumber: number): Promise<PullRequestReviewCommentRecord[]>;
export declare function createReviewCommentReply(client: GitHubClient, repoFullName: string, pullRequestNumber: number, inReplyTo: number, body: string): Promise<number>;
//# sourceMappingURL=comments.d.ts.map