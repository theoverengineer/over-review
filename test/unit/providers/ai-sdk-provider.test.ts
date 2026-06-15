import { NoSuchModelError } from 'ai';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { AISDKProvider } from '../../../src/providers/ai-sdk-provider';
import {
  AuthenticationError,
  SchemaValidationError,
  TimeoutError,
  UnsupportedModelError,
} from '../../../src/providers/errors';

const summarySchema = z.object({
  title: z.string(),
  description: z.string(),
});

describe('providers/ai-sdk-provider', () => {
  it('returns validated output when structured generation succeeds', async () => {
    const generateTextMock = vi.fn().mockResolvedValue({
      output: {
        title: 'Add provider seam',
        description: 'Implements the ai-sdk adapter.',
      },
      text: '{"title":"Add provider seam","description":"Implements the ai-sdk adapter."}',
    });

    const provider = createProvider(generateTextMock);
    const result = await provider.runInference({
      prompt: 'Summarize the PR.',
      schema: summarySchema,
      schemaName: 'summary',
    });

    expect(result.output.title).toBe('Add provider seam');
    expect(result.attempts).toBe(1);
    expect(generateTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        output: expect.any(Object),
      })
    );
  });

  it('falls back to plain text generation and validates extracted JSON', async () => {
    const generateTextMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('Structured output is not supported by this model.'))
      .mockResolvedValueOnce({
        text: 'Result:\n```json\n{"title":"Fallback title","description":"Recovered from plain text."}\n```',
      });

    const provider = createProvider(generateTextMock);
    const result = await provider.runInference({
      prompt: 'Summarize the PR.',
      schema: summarySchema,
    });

    expect(result.output).toEqual({
      title: 'Fallback title',
      description: 'Recovered from plain text.',
    });
    expect(result.attempts).toBe(1);
    expect(generateTextMock).toHaveBeenCalledTimes(2);
  });

  it('retries transient failures before succeeding', async () => {
    const generateTextMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('socket hang up ECONNRESET'))
      .mockResolvedValueOnce({
        output: {
          title: 'Second attempt worked',
          description: 'The retry returned valid structured output.',
        },
        text: '{"title":"Second attempt worked","description":"The retry returned valid structured output."}',
      });

    const provider = createProvider(generateTextMock);
    const result = await provider.runInference({
      prompt: 'Summarize the PR.',
      schema: summarySchema,
      maxRetries: 1,
    });

    expect(result.attempts).toBe(2);
    expect(generateTextMock).toHaveBeenCalledTimes(2);
  });

  it('normalizes unsupported models without retrying', async () => {
    const generateTextMock = vi
      .fn()
      .mockRejectedValue(
        new NoSuchModelError({ modelId: 'gpt-missing', modelType: 'languageModel' })
      );

    const provider = createProvider(generateTextMock);

    await expect(
      provider.runInference({
        prompt: 'Summarize the PR.',
        schema: summarySchema,
        maxRetries: 4,
      })
    ).rejects.toBeInstanceOf(UnsupportedModelError);

    expect(generateTextMock).toHaveBeenCalledTimes(1);
  });

  it('normalizes authentication failures without retrying', async () => {
    const generateTextMock = vi.fn().mockRejectedValue(new Error('Unauthorized: invalid API key'));
    const provider = createProvider(generateTextMock);

    await expect(
      provider.runInference({
        prompt: 'Summarize the PR.',
        schema: summarySchema,
      })
    ).rejects.toBeInstanceOf(AuthenticationError);
  });

  it('rejects invalid structured output instead of returning it', async () => {
    const generateTextMock = vi.fn().mockResolvedValue({
      output: {
        title: 123,
        description: 'Wrong title type',
      },
      text: '{"title":123,"description":"Wrong title type"}',
    });

    const provider = createProvider(generateTextMock);

    await expect(
      provider.runInference({
        prompt: 'Summarize the PR.',
        schema: summarySchema,
      })
    ).rejects.toBeInstanceOf(SchemaValidationError);
  });

  it('rejects invalid fallback JSON instead of returning it', async () => {
    const generateTextMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('Structured output is not supported by this model.'))
      .mockResolvedValueOnce({
        text: '{"title":123,"description":"Wrong title type"}',
      });

    const provider = createProvider(generateTextMock);

    await expect(
      provider.runInference({
        prompt: 'Summarize the PR.',
        schema: summarySchema,
      })
    ).rejects.toBeInstanceOf(SchemaValidationError);
  });

  it('retries timeouts and eventually throws a timeout error', async () => {
    const generateTextMock = vi
      .fn()
      .mockImplementation(({ abortSignal }: { abortSignal?: AbortSignal }) => {
        return new Promise((_, reject) => {
          abortSignal?.addEventListener('abort', () => {
            reject(Object.assign(new Error('Request aborted'), { name: 'AbortError' }));
          });
        });
      });

    const provider = createProvider(generateTextMock);

    await expect(
      provider.runInference({
        prompt: 'Summarize the PR.',
        schema: summarySchema,
        timeoutMs: 10,
        maxRetries: 1,
      })
    ).rejects.toBeInstanceOf(TimeoutError);

    expect(generateTextMock).toHaveBeenCalledTimes(2);
  });

  it('uses the OpenAI-compatible provider when a base URL is configured', async () => {
    const generateTextMock = vi.fn().mockResolvedValue({
      output: {
        title: 'Custom endpoint',
        description: 'Uses the custom base URL path.',
      },
      text: '{"title":"Custom endpoint","description":"Uses the custom base URL path."}',
    });
    const modelFactory = vi.fn().mockReturnValue('custom-model-instance');
    const createOpenAICompatibleMock = vi.fn().mockReturnValue(modelFactory);

    const provider = new AISDKProvider(
      {
        model: 'gpt-4o-mini',
        apiKey: 'test-key',
        baseUrl: 'https://example.test/v1',
      },
      {
        generateText: generateTextMock,
        createOpenAICompatible: createOpenAICompatibleMock,
        sleep: async () => undefined,
      }
    );

    await provider.runInference({
      prompt: 'Summarize the PR.',
      schema: summarySchema,
    });

    expect(createOpenAICompatibleMock).toHaveBeenCalledWith({
      name: 'custom-openai-compatible',
      apiKey: 'test-key',
      baseURL: 'https://example.test/v1',
    });
    expect(modelFactory).toHaveBeenCalledWith('gpt-4o-mini');
  });
});

function createProvider(generateTextMock: ReturnType<typeof vi.fn>): AISDKProvider {
  return new AISDKProvider(
    {
      model: 'gpt-4o-mini',
      apiKey: 'test-key',
    },
    {
      generateText: generateTextMock,
      sleep: async () => undefined,
    }
  );
}
