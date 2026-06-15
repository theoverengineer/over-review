/**
 * Event types and interfaces for over-review
 * @packageDocumentation
 */

/**
 * GitHub event types supported by over-review.
 */
export type SupportedEventName = 'pull_request' | 'issue_comment' | 'pull_request_review_comment';

export type ManualReviewCommandName = '/review' | '/ai-review';

/**
 * Author association types from GitHub.
 */
export type AuthorAssociation =
  | 'OWNER'
  | 'MEMBER'
  | 'COLLABORATOR'
  | 'CONTRIBUTOR'
  | 'FIRST_TIME_CONTRIBUTOR'
  | 'FIRST_TIMER'
  | 'MANNEQUIN'
  | 'NONE'
  | 'OUTSIDE_COLLABORATOR';

/**
 * PR action types.
 */
export type PrAction =
  | 'opened'
  | 'edited'
  | 'closed'
  | 'reopened'
  | 'synchronize'
  | 'ready_for_review'
  | 'locked'
  | 'unlocked'
  | 'assigned'
  | 'unassigned'
  | 'review_requested'
  | 'review_request_removed'
  | 'milestoned'
  | 'demilestoned';

/**
 * Issue comment action types.
 */
export type IssueCommentAction = 'created' | 'edited' | 'deleted';

/**
 * Review comment action types.
 */
export type ReviewCommentAction = 'created' | 'edited' | 'deleted';

/**
 * Repository information.
 */
export interface RepositoryInfo {
  full_name: string;
  name: string;
  owner: {
    login: string;
    type: 'User' | 'Organization';
  };
}

/**
 * Pull request information.
 */
export interface PullRequestInfo {
  number: number;
  title: string;
  head: {
    sha: string;
    repo?: RepositoryInfo;
  };
  base: {
    sha: string;
    repo?: RepositoryInfo;
  };
  user?: {
    login: string;
  };
  body?: string;
}

/**
 * Comment information.
 */
export interface CommentInfo {
  id: number;
  body: string;
  user?: {
    login: string;
  };
  author_association?: AuthorAssociation;
  path?: string;
  line?: number | null;
  original_line?: number | null;
  diff_hunk?: string;
  in_reply_to_id?: number | null;
  created_at?: string;
}

/**
 * Pull request event payload.
 */
export interface PullRequestEvent {
  action: PrAction;
  repository: RepositoryInfo;
  pull_request: PullRequestInfo;
  sender?: {
    login: string;
    type: 'User' | 'Organization' | 'Bot';
  };
}

/**
 * Issue comment event payload.
 */
export interface IssueCommentEvent {
  action: IssueCommentAction;
  repository: RepositoryInfo;
  issue: {
    number: number;
    title: string;
    body?: string;
    pull_request?: {
      url: string;
    };
    user?: {
      login: string;
    };
    author_association?: AuthorAssociation;
  };
  comment?: CommentInfo;
  sender?: {
    login: string;
    type: 'User' | 'Organization' | 'Bot';
  };
}

/**
 * Pull request review comment event payload.
 */
export interface ReviewCommentEvent {
  action: ReviewCommentAction;
  repository: RepositoryInfo;
  pull_request: PullRequestInfo;
  comment: CommentInfo;
  sender?: {
    login: string;
    type: 'User' | 'Organization' | 'Bot';
  };
}

/**
 * Union type for all supported GitHub events.
 */
export type GitHubEvent = PullRequestEvent | IssueCommentEvent | ReviewCommentEvent;

/**
 * Event context for processing.
 */
export interface EventContext {
  eventName: string;
  event: GitHubEvent;
  actor: string | null;
  authorAssociation: string | null;
  commentBody?: string;
}

/**
 * PR identity information after lookup.
 */
export interface ResolvedPullRequestIdentity {
  /** The PR number */
  number: number;
  /** The PR title */
  title: string;
  /** Whether the PR is from a fork (head repo differs from base repo) */
  isFork: boolean;
  /** The full name of the head repository (where the changes come from) */
  headRepoFullName: string | null;
  /** The full name of the base repository (where changes are merged into) */
  baseRepoFullName: string | null;
  /** The head commit SHA */
  headSha?: string;
}

export interface EventOutcome {
  type: 'review' | 'skip' | 'unauthorized' | 'unsupported';
  reason?: string;
  prNumber?: number;
  actor?: string;
  command?: ManualReviewCommandName;
  fullMode?: boolean;
  eyesReaction?: boolean;
  resolvedPrIdentity?: ResolvedPullRequestIdentity;
}

export interface RouteResult {
  handled: boolean;
  outcome: EventOutcome;
}
