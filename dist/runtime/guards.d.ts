/**
 * Trust boundary guards for over-review.
 * @packageDocumentation
 */
import type { GitHubEvent } from './types';
export declare const AUTHORIZED_ASSOCIATIONS: readonly ["OWNER", "MEMBER", "COLLABORATOR"];
export type AuthorizedAssociation = (typeof AUTHORIZED_ASSOCIATIONS)[number];
export type PullRequestSource = 'same-repo' | 'fork' | 'unknown' | 'not-pull-request';
export interface GuardDecision {
    allow: boolean;
    skipReason?: 'bot-actor' | 'ignore-marker' | 'fork-pr';
    requiresPullRequestLookup?: boolean;
}
export declare function isBotActor(actor: string | null | undefined): boolean;
export declare function isBotComment(userLogin: string | null | undefined): boolean;
export declare function hasIgnoreMarker(content: string): boolean;
export declare function getPullRequestSource(event: GitHubEvent): PullRequestSource;
export declare function isForkPr(event: GitHubEvent): boolean;
export declare function isSameRepoPr(event: GitHubEvent): boolean;
export declare function isAuthorizedAssociation(authorAssociation: string | null | undefined): authorAssociation is AuthorizedAssociation;
export declare function runTrustBoundaryGuards(event: GitHubEvent, actor: string | null | undefined, commentBody?: string): GuardDecision;
//# sourceMappingURL=guards.d.ts.map