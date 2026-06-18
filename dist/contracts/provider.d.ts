/**
 * Provider contract for over-review.
 * @packageDocumentation
 */
import type { ZodType } from 'zod';
export interface InferenceRequest<TOutput> {
    prompt: string;
    systemPrompt?: string;
    schema: ZodType<TOutput>;
    schemaName?: string;
    schemaDescription?: string;
    temperature?: number;
    timeoutMs?: number;
    /** Number of retries after the initial attempt. */
    maxRetries?: number;
}
export interface InferenceResult<TOutput> {
    output: TOutput;
    rawText?: string;
    attempts: number;
    provider: string;
    model: string;
}
export interface AIProvider {
    readonly name: string;
    readonly model: string;
    runInference<TOutput>(request: InferenceRequest<TOutput>): Promise<InferenceResult<TOutput>>;
}
//# sourceMappingURL=provider.d.ts.map