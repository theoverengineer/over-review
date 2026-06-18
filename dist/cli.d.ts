/**
 * over-review CLI entrypoint.
 * @packageDocumentation
 */
import type { Config } from './config/schema';
import type { SupportedEventName } from './runtime/types';
export interface CliOptions {
    event?: SupportedEventName | string;
    payload?: string;
    output?: string;
    writeOutput: boolean;
    listPrs: boolean;
    prNumber?: number;
    owner?: string;
    repo?: string;
    state?: string;
    limit?: number;
    env?: string | false;
    cliConfig: Partial<Config>;
}
export declare function parseArgs(args: string[]): CliOptions;
export declare function runCli(args?: string[]): Promise<void>;
//# sourceMappingURL=cli.d.ts.map