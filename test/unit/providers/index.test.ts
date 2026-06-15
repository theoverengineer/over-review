import { describe, expect, it } from 'vitest';
import {
  AISDKProvider,
  ConfigurationError,
  createProvider,
  resolveProviderPath,
  type ProviderConfig,
} from '../../../src/providers';

describe('providers/index', () => {
  describe('resolveProviderPath', () => {
    it('always returns ai-sdk for V1', () => {
      expect(resolveProviderPath()).toBe('ai-sdk');
    });
  });

  describe('createProvider', () => {
    it('creates an AI SDK provider', () => {
      const config: ProviderConfig = {
        provider: 'ai-sdk',
        model: 'gpt-4o-mini',
        apiKey: 'test-key',
      };

      const provider = createProvider(config);

      expect(provider).toBeInstanceOf(AISDKProvider);
      expect(provider.name).toBe('ai-sdk');
      expect(provider.model).toBe('gpt-4o-mini');
    });

    it('throws an error for unsupported providers', () => {
      const config = {
        provider: 'unsupported-provider' as const,
        model: 'gpt-4o-mini',
        apiKey: 'test-key',
      };

      expect(() => createProvider(config)).toThrow(ConfigurationError);
    });

    it('creates a provider with custom base URL', () => {
      const config: ProviderConfig = {
        provider: 'ai-sdk',
        model: 'gpt-4o-mini',
        apiKey: 'test-key',
        baseUrl: 'https://custom.openai.com/v1',
      };

      expect(createProvider(config)).toBeInstanceOf(AISDKProvider);
    });

    it('throws ConfigurationError for invalid baseUrl', () => {
      expect(() =>
        createProvider({
          provider: 'ai-sdk',
          model: 'gpt-4o-mini',
          apiKey: 'test-key',
          baseUrl: 'not-a-valid-url',
        })
      ).toThrow(ConfigurationError);
    });
  });
});
