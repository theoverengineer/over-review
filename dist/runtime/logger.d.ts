/**
 * Structured logger for over-review.
 * @packageDocumentation
 */
export interface RunLogFields {
    eventName: string;
    repo?: string;
    prNumber?: number;
    reviewMode?: 'full' | 'incremental';
    commitCount?: number;
    fileCount?: number;
    provider?: string;
    model?: string;
    summarySuccess?: boolean;
    submittedCommentCount?: number;
    skippedCommentCount?: number;
    dryRun?: boolean;
    outcome?: string;
    reason?: string;
    title?: string;
    error?: string;
    needsAttention?: boolean;
    findingsCount?: number;
    total?: number;
    filtered?: number;
    inline?: number;
    count?: number;
    summaryLength?: number;
    hasExisting?: boolean;
    filePath?: string;
    line?: number;
}
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export interface Logger {
    child(fields: Partial<RunLogFields>): Logger;
    debug(message: string, fields?: Partial<RunLogFields>): void;
    info(message: string, fields?: Partial<RunLogFields>): void;
    warn(message: string, fields?: Partial<RunLogFields>): void;
    error(message: string, fields?: Partial<RunLogFields>): void;
}
export declare function createLogger(baseFields?: Partial<RunLogFields>, level?: LogLevel): Logger;
//# sourceMappingURL=logger.d.ts.map