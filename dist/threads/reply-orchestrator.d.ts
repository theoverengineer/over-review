/**
 * Review-thread reply orchestration.
 * @packageDocumentation
 */
import type { AIProvider } from '../contracts/provider';
import type { Config } from '../config/schema';
import type { GitHubClient } from '../github/client';
import type { Logger } from '../runtime/logger';
export interface ThreadReplyOrchestratorOptions {
    client: GitHubClient;
    provider: AIProvider;
    config: Config;
    logger: Logger;
    dryRun?: boolean;
}
export interface ThreadReplyRequest {
    repoFullName: string;
    pullRequestNumber: number;
    commentId: number;
}
export interface ThreadReplyResult {
    handled: boolean;
    relevant: boolean;
    actionRequested: boolean;
    reason?: string;
    replyBody?: string;
    replyCommentId?: number;
}
export declare class ThreadReplyOrchestrator {
    private readonly options;
    constructor(options: ThreadReplyOrchestratorOptions);
    run(request: ThreadReplyRequest): Promise<ThreadReplyResult>;
}
//# sourceMappingURL=reply-orchestrator.d.ts.map