/**
 * AI SDK provider implementation for over-review.
 * @packageDocumentation
 */
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText } from 'ai';
import type { InferenceRequest, InferenceResult } from '../contracts/provider';
type GenerateTextFn = typeof generateText;
type OpenAICompatibleFactory = typeof createOpenAICompatible;
export interface AISDKProviderOptions {
    model: string;
    apiKey: string;
    baseUrl?: string;
    /**
     * Whether to use structured outputs (JSON mode).
     * When false, both custom and official providers skip schema-based structured output requests
     * and fall back to plain text JSON generation/parsing instead.
     * @default true
     */
    structuredOutputs?: boolean;
}
export interface AISDKProviderDependencies {
    generateText?: GenerateTextFn;
    createOpenAICompatible?: OpenAICompatibleFactory;
    sleep?: (ms: number) => Promise<void>;
}
export declare class AISDKProvider {
    readonly name = "ai-sdk";
    readonly model: string;
    private readonly apiKey;
    private readonly baseUrl?;
    private readonly structuredOutputs;
    private readonly generateTextImpl;
    private readonly createOpenAICompatibleImpl;
    private readonly sleepImpl;
    constructor(options: AISDKProviderOptions, dependencies?: AISDKProviderDependencies);
    runInference<TOutput>(request: InferenceRequest<TOutput>): Promise<InferenceResult<TOutput>>;
    private runStructuredInference;
    private runFallbackInference;
    private createModel;
}
export {};
//# sourceMappingURL=ai-sdk-provider.d.ts.map