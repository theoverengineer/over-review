/**
 * Event router for over-review.
 * @packageDocumentation
 */
import { GitHubClient } from '../github/client';
import type { GitHubEvent, RouteResult, SupportedEventName } from './types';
export declare function isSupportedEvent(eventName: string): eventName is SupportedEventName;
export declare function getPrNumberFromEvent(event: GitHubEvent): number | undefined;
/**
 * Route a GitHub event to the appropriate handler.
 * For issue_comment events that require PR identity lookup, this will
 * perform an API call to determine if the PR is from a fork.
 * @param event - GitHub event
 * @param eventName - Name of the event
 * @param client - Optional GitHub client for API calls
 * @returns Route result with outcome
 */
export declare function routeEvent(event: GitHubEvent, eventName: string, client?: GitHubClient): Promise<RouteResult>;
//# sourceMappingURL=event-router.d.ts.map