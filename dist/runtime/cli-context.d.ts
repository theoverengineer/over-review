/**
 * Runtime context for CLI execution.
 * @packageDocumentation
 */
import type { GitHubEvent, SupportedEventName } from './types';
export interface CliContext {
    runtime: 'cli';
    eventName: SupportedEventName | string;
    event: GitHubEvent;
    repo: string;
    prNumber?: number;
    actor: string | null;
    authorAssociation: string | null;
    commentBody?: string;
    isDryRun: boolean;
    outputPath?: string;
}
export declare function createCliContext(options: {
    eventName: SupportedEventName | string;
    event: GitHubEvent;
    dryRun?: boolean;
    outputPath?: string;
}): CliContext;
//# sourceMappingURL=cli-context.d.ts.map