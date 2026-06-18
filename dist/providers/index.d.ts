/**
 * Provider registry and resolution for over-review.
 * @packageDocumentation
 */
import type { AIProvider } from '../contracts/provider';
export interface ProviderConfig {
    provider: 'ai-sdk';
    model: string;
    apiKey: string;
    baseUrl?: string;
    structuredOutputs?: boolean;
}
export declare function createProvider(config: ProviderConfig): AIProvider;
export declare function resolveProviderPath(): 'ai-sdk';
export * from './ai-sdk-provider';
export * from './errors';
//# sourceMappingURL=index.d.ts.map