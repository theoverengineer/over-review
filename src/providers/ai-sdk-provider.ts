/**
 * AI SDK provider implementation for over-review.
 * @packageDocumentation
 */

import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText, Output, type NoObjectGeneratedError } from 'ai';
import type { InferenceRequest, InferenceResult } from '../contracts/provider';
import { normalizeProviderError, type ProviderError, SchemaValidationError } from './errors';

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 2;
const RETRY_DELAY_MS = 150;

type GenerateTextFn = typeof generateText;
type OpenAICompatibleFactory = typeof createOpenAICompatible;
type ModelDefinition = Parameters<GenerateTextFn>[0]['model'];

export interface AISDKProviderOptions {
  model: string;
  apiKey: string;
  baseUrl?: string;
  /**
   * Whether to use structured outputs (JSON mode) for custom OpenAI-compatible endpoints.
   * When false, custom endpoints skip schema-based structured output requests and fall back to
   * plain text JSON generation/parsing instead.
   * Official providers continue using structured outputs through the AI SDK.
   * @default true
   */
  structuredOutputs?: boolean;
}

export interface AISDKProviderDependencies {
  generateText?: GenerateTextFn;
  createOpenAICompatible?: OpenAICompatibleFactory;
  sleep?: (ms: number) => Promise<void>;
}

export class AISDKProvider {
  readonly name = 'ai-sdk';
  readonly model: string;

  private readonly apiKey: string;
  private readonly baseUrl?: string;
  private readonly structuredOutputs: boolean;
  private readonly generateTextImpl: GenerateTextFn;
  private readonly createOpenAICompatibleImpl: OpenAICompatibleFactory;
  private readonly sleepImpl: (ms: number) => Promise<void>;

  constructor(options: AISDKProviderOptions, dependencies: AISDKProviderDependencies = {}) {
    this.model = options.model;
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl;
    this.structuredOutputs = options.structuredOutputs ?? true;
    this.generateTextImpl = dependencies.generateText ?? generateText;
    this.createOpenAICompatibleImpl = dependencies.createOpenAICompatible ?? createOpenAICompatible;
    this.sleepImpl = dependencies.sleep ?? defaultSleep;
  }

  async runInference<TOutput>(
    request: InferenceRequest<TOutput>
  ): Promise<InferenceResult<TOutput>> {
    const timeoutMs = request.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxAttempts = Math.max(1, (request.maxRetries ?? DEFAULT_MAX_RETRIES) + 1);

    // For custom endpoints with structured outputs disabled, skip structured inference entirely
    const skipStructuredInference = this.baseUrl !== undefined && this.structuredOutputs === false;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const controller = new AbortController();
      let timeoutId: NodeJS.Timeout | undefined;

      // Only set up timeout if timeoutMs > 0
      if (timeoutMs > 0) {
        timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      }

      try {
        const result = skipStructuredInference
          ? await this.runFallbackInference(request, controller)
          : await this.runStructuredInference(request, controller);
        clearTimeout(timeoutId);

        return {
          output: result.output,
          rawText: result.rawText,
          attempts: attempt,
          provider: this.name,
          model: this.model,
        };
      } catch (error) {
        clearTimeout(timeoutId);

        const normalized = normalizeProviderError(error, this.name, this.model);

        if (attempt === maxAttempts || !shouldRetry(normalized)) {
          throw normalized;
        }

        await this.sleepImpl(RETRY_DELAY_MS * attempt);
      }
    }

    throw normalizeProviderError(new Error('Inference failed.'), this.name, this.model);
  }

  private async runStructuredInference<TOutput>(
    request: InferenceRequest<TOutput>,
    controller: AbortController
  ): Promise<{ output: TOutput; rawText?: string }> {
    try {
      const result = await this.generateTextImpl({
        model: this.createModel(),
        system: request.systemPrompt,
        prompt: request.prompt,
        output: Output.object({
          schema: request.schema,
          name: request.schemaName,
          description: request.schemaDescription,
        }),
        temperature: request.temperature,
        maxRetries: 0,
        abortSignal: controller.signal,
      });

      const rawText = toOptionalText(result.text);

      try {
        return {
          output: validateOutput(request, result.output, this.name, this.model),
          rawText,
        };
      } catch (error) {
        if (error instanceof SchemaValidationError) {
          return this.runFallbackInference(request, controller);
        }

        throw error;
      }
    } catch (error) {
      if (shouldFallbackToText(error)) {
        return this.runFallbackInference(request, controller);
      }

      throw error;
    }
  }

  private async runFallbackInference<TOutput>(
    request: InferenceRequest<TOutput>,
    controller: AbortController
  ): Promise<{ output: TOutput; rawText: string }> {
    const result = await this.generateTextImpl({
      model: this.createModel(),
      system: request.systemPrompt,
      prompt: request.prompt,
      temperature: request.temperature,
      maxRetries: 0,
      abortSignal: controller.signal,
    });

    const rawText = result.text ?? '';
    const extracted = extractJsonValue(rawText);

    if (extracted === null) {
      throw new SchemaValidationError('Fallback text did not contain valid JSON.', {
        provider: this.name,
        model: this.model,
      });
    }

    return {
      output: validateOutput(request, extracted, this.name, this.model),
      rawText,
    };
  }

  private createModel(): ModelDefinition {
    if (!this.baseUrl) {
      return this.model as ModelDefinition;
    }

    return this.createOpenAICompatibleImpl({
      name: 'custom-openai-compatible',
      apiKey: this.apiKey,
      baseURL: this.baseUrl,
      supportsStructuredOutputs: this.structuredOutputs,
    })(this.model) as ModelDefinition;
  }
}

function validateOutput<TOutput>(
  request: InferenceRequest<TOutput>,
  value: unknown,
  provider: string,
  model: string
): TOutput {
  const result = request.schema.safeParse(value);

  if (result.success) {
    return result.data;
  }

  throw new SchemaValidationError('Schema validation failed.', {
    provider,
    model,
    cause: result.error,
  });
}

function shouldRetry(error: ProviderError): boolean {
  return error.category === 'timeout' || error.category === 'transient';
}

function shouldFallbackToText(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : '';

  return (
    isNoObjectGeneratedError(error) ||
    message.includes('structured output') ||
    message.includes('json schema') ||
    message.includes('response format') ||
    message.includes('invalid json')
  );
}

function isNoObjectGeneratedError(error: unknown): error is NoObjectGeneratedError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name?: string }).name === 'AI_NoObjectGeneratedError'
  );
}

function extractJsonValue(text: string): unknown | null {
  const fencedJsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/i);

  if (fencedJsonMatch) {
    return tryParseJson(fencedJsonMatch[1]);
  }

  const objectCandidate = extractDelimitedText(text, '{', '}');

  if (objectCandidate) {
    const parsed = tryParseJson(objectCandidate);

    if (parsed !== null) {
      return parsed;
    }
  }

  const arrayCandidate = extractDelimitedText(text, '[', ']');

  if (arrayCandidate) {
    const parsed = tryParseJson(arrayCandidate);

    if (parsed !== null) {
      return parsed;
    }
  }

  return tryParseJson(text);
}

function extractDelimitedText(text: string, open: string, close: string): string | null {
  const startIndex = text.indexOf(open);
  const endIndex = text.lastIndexOf(close);

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    return null;
  }

  return text.slice(startIndex, endIndex + 1);
}

function tryParseJson(text: string): unknown | null {
  try {
    return JSON.parse(text.trim());
  } catch {
    return null;
  }
}

function toOptionalText(text: string | undefined): string | undefined {
  if (!text) {
    return undefined;
  }

  const trimmed = text.trim();
  return trimmed ? trimmed : undefined;
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
