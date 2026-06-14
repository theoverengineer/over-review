# Provider Interface Specification

## Goal

Keep a stable internal provider seam so additional LLM backends can be added later without leaking provider-specific behavior into review orchestration.

## Required Capabilities

Every provider implementation must support:

- summary prompt execution
- review prompt execution
- review-thread reply prompt execution
- structured output validation
- timeout handling
- retry behavior for transient failures

## Provider Contract

```ts
export type InferenceRequest<TSchema> = {
  prompt: string;
  systemPrompt?: string;
  schema: TSchema;
  temperature?: number;
  timeoutMs?: number;
};

export type InferenceResult<TOutput> = {
  output: TOutput;
  rawText?: string;
  attempts: number;
  provider: string;
  model: string;
};

export interface AIProvider {
  readonly name: string;
  readonly model: string;
  runInference<TOutput>(request: InferenceRequest<unknown>): Promise<InferenceResult<TOutput>>;
}
```

## Provider Registry

- Resolve model from `LLM_MODEL`
- Keep provider resolution fixed to the default `ai-sdk` path in V1
- Keep model selection separate from prompt logic

## V1 Baseline Provider

### `ai-sdk`

- Only shipped provider in V1
- Supports Anthropic, OpenAI, Google, and OpenAI-compatible gateways
- Can use `LLM_BASE_URL` for custom OpenAI-compatible endpoints

## Validation And Fallback Rules

- Try structured generation first.
- Validate output against the supplied schema.
- If the provider supports fallback text generation, extract JSON from text and validate again.
- Do not silently return unvalidated data.

## Error Model

Classify errors into:

- configuration errors
- authentication errors
- timeout errors
- transient provider errors
- schema validation errors
- unsupported model errors

## Retry Policy

- Retry transient network or provider errors up to a small bounded limit
- Do not retry schema validation failures indefinitely
- Surface the final failure with provider and model context

## Extension Rules

To add a provider:

1. Implement `AIProvider`.
2. Register provider config schema and setup.
3. Register supported models or model-resolution strategy.
4. Add tests covering success, timeout, and invalid-output paths.
5. Do not modify orchestration or prompt modules for provider-specific behavior.

## Non-Goals For The Provider Layer

- provider-specific prompt formats in business logic
- provider-specific return types outside the adapter
- direct model calls from workflow handlers
