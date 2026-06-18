/**
 * Runtime context for GitHub Actions execution.
 * @packageDocumentation
 */
import type { GitHubEvent, SupportedEventName } from './types';
export interface ActionContext {
    runtime: 'action';
    eventName: SupportedEventName | string;
    event: GitHubEvent;
    repo: string;
    prNumber?: number;
    actor: string | null;
    authorAssociation: string | null;
    commentBody?: string;
    isDryRun: false;
}
export declare function createActionContext(eventName: SupportedEventName | string, event: GitHubEvent): ActionContext;
//# sourceMappingURL=action-context.d.ts.map