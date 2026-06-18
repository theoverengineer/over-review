"use strict";
/**
 * AI SDK provider implementation for over-review.
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AISDKProvider = void 0;
const openai_compatible_1 = require("@ai-sdk/openai-compatible");
const ai_1 = require("ai");
const errors_1 = require("./errors");
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 2;
const RETRY_DELAY_MS = 150;
class AISDKProvider {
    constructor(options, dependencies = {}) {
        this.name = 'ai-sdk';
        this.model = options.model;
        this.apiKey = options.apiKey;
        this.baseUrl = options.baseUrl;
        this.structuredOutputs = options.structuredOutputs ?? true;
        this.generateTextImpl = dependencies.generateText ?? ai_1.generateText;
        this.createOpenAICompatibleImpl = dependencies.createOpenAICompatible ?? openai_compatible_1.createOpenAICompatible;
        this.sleepImpl = dependencies.sleep ?? defaultSleep;
    }
    async runInference(request) {
        const timeoutMs = request.timeoutMs ?? DEFAULT_TIMEOUT_MS;
        const maxAttempts = Math.max(1, (request.maxRetries ?? DEFAULT_MAX_RETRIES) + 1);
        // Skip structured inference entirely when structured outputs are disabled
        const skipStructuredInference = this.structuredOutputs === false;
        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
            const controller = new AbortController();
            let timeoutId;
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
            }
            catch (error) {
                clearTimeout(timeoutId);
                const normalized = (0, errors_1.normalizeProviderError)(error, this.name, this.model);
                if (attempt === maxAttempts || !shouldRetry(normalized)) {
                    throw normalized;
                }
                await this.sleepImpl(RETRY_DELAY_MS * attempt);
            }
        }
        throw (0, errors_1.normalizeProviderError)(new Error('Inference failed.'), this.name, this.model);
    }
    async runStructuredInference(request, controller) {
        try {
            const result = await this.generateTextImpl({
                model: this.createModel(),
                system: request.systemPrompt,
                prompt: request.prompt,
                output: ai_1.Output.object({
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
            }
            catch (error) {
                if (error instanceof errors_1.SchemaValidationError) {
                    return this.runFallbackInference(request, controller);
                }
                throw error;
            }
        }
        catch (error) {
            if (shouldFallbackToText(error)) {
                return this.runFallbackInference(request, controller);
            }
            throw error;
        }
    }
    async runFallbackInference(request, controller) {
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
            throw new errors_1.SchemaValidationError('Fallback text did not contain valid JSON.', {
                provider: this.name,
                model: this.model,
            });
        }
        return {
            output: validateOutput(request, extracted, this.name, this.model),
            rawText,
        };
    }
    createModel() {
        if (!this.baseUrl) {
            return this.model;
        }
        return this.createOpenAICompatibleImpl({
            name: 'custom-openai-compatible',
            apiKey: this.apiKey,
            baseURL: this.baseUrl,
            supportsStructuredOutputs: this.structuredOutputs,
        })(this.model);
    }
}
exports.AISDKProvider = AISDKProvider;
function validateOutput(request, value, provider, model) {
    const result = request.schema.safeParse(value);
    if (result.success) {
        return result.data;
    }
    throw new errors_1.SchemaValidationError('Schema validation failed.', {
        provider,
        model,
        cause: result.error,
    });
}
function shouldRetry(error) {
    return error.category === 'timeout' || error.category === 'transient';
}
function shouldFallbackToText(error) {
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    return (isNoObjectGeneratedError(error) ||
        message.includes('structured output') ||
        message.includes('json schema') ||
        message.includes('response format') ||
        message.includes('invalid json'));
}
function isNoObjectGeneratedError(error) {
    return (typeof error === 'object' &&
        error !== null &&
        'name' in error &&
        error.name === 'AI_NoObjectGeneratedError');
}
function extractJsonValue(text) {
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
function extractDelimitedText(text, open, close) {
    const startIndex = text.indexOf(open);
    const endIndex = text.lastIndexOf(close);
    if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
        return null;
    }
    return text.slice(startIndex, endIndex + 1);
}
function tryParseJson(text) {
    try {
        return JSON.parse(text.trim());
    }
    catch {
        return null;
    }
}
function toOptionalText(text) {
    if (!text) {
        return undefined;
    }
    const trimmed = text.trim();
    return trimmed ? trimmed : undefined;
}
function defaultSleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
//# sourceMappingURL=ai-sdk-provider.js.map