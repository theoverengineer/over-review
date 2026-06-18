/**
 * Configuration schema and validation for over-review.
 * @packageDocumentation
 */
export type ReviewMode = 'auto' | 'manual' | 'cli';
export interface Config {
    GITHUB_TOKEN: string;
    LLM_MODEL: string;
    LLM_API_KEY: string;
    LLM_PROVIDER: 'ai-sdk';
    LLM_BASE_URL?: string;
    STYLE_GUIDE_RULES?: string;
    LLM_TIMEOUT_MS?: number;
    LLM_STRUCTURED_OUTPUTS?: boolean;
    GITHUB_API_URL: string;
    GITHUB_SERVER_URL: string;
    DEBUG: boolean;
    DRY_RUN: boolean;
    FULL_REVIEW: boolean;
    REVIEW_MODE: ReviewMode;
}
export type ConfigKey = keyof Config;
export interface ConfigValidationIssue {
    field: ConfigKey | 'config';
    message: string;
}
export declare class ConfigValidationError extends Error {
    readonly issues: ConfigValidationIssue[];
    constructor(issues: ConfigValidationIssue[]);
}
export declare function validateConfig(config: Partial<Config>): ConfigValidationIssue[];
export declare function formatConfigValidationIssues(issues: ConfigValidationIssue[]): string;
export declare function parseBoolean(value: string | undefined): boolean | undefined;
export declare function parseTrimmedString(value: string | undefined): string | undefined;
//# sourceMappingURL=schema.d.ts.map