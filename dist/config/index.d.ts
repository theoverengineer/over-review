/**
 * Configuration loader for over-review.
 * Precedence: CLI flags > env > action inputs > env file.
 * @packageDocumentation
 */
import { type Config } from './schema';
export * from './schema';
export interface ConfigLoaderOptions {
    cli?: Partial<Config>;
    env?: NodeJS.ProcessEnv;
    cwd?: string;
    envFilePath?: string | false;
}
export type ConfigSource = 'cli' | 'env' | 'env-file' | 'action-input' | 'default' | 'gh-auth';
export interface ConfigSourceMetadata {
    envFile: {
        status: 'skipped' | 'missing' | 'loaded';
        path?: string;
    };
    sources: Record<keyof Config, ConfigSource>;
}
type ConfigPatch = Partial<Config>;
export declare function loadConfig(options?: ConfigLoaderOptions): Config;
/**
 * Load config and return both the config and source metadata.
 * This is used for debug logging to show which fields came from which sources.
 */
export declare function loadConfigWithMetadata(options?: ConfigLoaderOptions): {
    config: Config;
    metadata: ConfigSourceMetadata;
};
export declare function applyDefaults(config: ConfigPatch): Config;
export declare function loadEnvironmentVariables(env?: NodeJS.ProcessEnv): ConfigPatch;
export declare function loadActionInputs(env?: NodeJS.ProcessEnv): ConfigPatch;
/**
 * Load configuration from a local .env file.
 * If envFilePath is provided, use that path; otherwise, use <cwd>/.env.
 * If envFilePath is explicitly false, skip loading .env entirely.
 */
export declare function loadLocalEnv(cwd?: string, envFilePath?: string | false): ConfigPatch;
export declare function parseDotEnv(content: string): NodeJS.ProcessEnv;
export declare function toActionInputEnvName(inputName: string): string;
//# sourceMappingURL=index.d.ts.map