import { APICallError, LoadAPIKeyError, NoSuchModelError } from 'ai';
import { describe, expect, it } from 'vitest';
import {
  AuthenticationError,
  ConfigurationError,
  ProviderError,
  SchemaValidationError,
  TimeoutError,
  TransientError,
  UnsupportedModelError,
  normalizeProviderError,
} from '../../../src/providers/errors';

describe('providers/errors', () => {
  describe('normalizeProviderError', () => {
    it('returns the same error if it is already a ProviderError', () => {
      const error = new ProviderError('test', {
        category: 'transient',
        provider: 'ai-sdk',
        model: 'gpt-4o-mini',
      });

      expect(normalizeProviderError(error, 'ai-sdk', 'gpt-4o-mini')).toBe(error);
    });

    it('maps LoadAPIKeyError to a configuration error', () => {
      const error = new LoadAPIKeyError({ message: 'Missing API key.' });
      const normalized = normalizeProviderError(error, 'ai-sdk', 'gpt-4o-mini');

      expect(normalized).toBeInstanceOf(ConfigurationError);
      expect(normalized.message).toContain('provider=ai-sdk');
      expect(normalized.message).toContain('model=gpt-4o-mini');
    });

    it('maps 401 API failures to an authentication error', () => {
      const error = new APICallError({
        message: 'Unauthorized',
        statusCode: 401,
        url: 'https://example.test',
        requestBodyValues: {},
      });

      expect(normalizeProviderError(error, 'ai-sdk', 'gpt-4o-mini')).toBeInstanceOf(
        AuthenticationError
      );
    });

    it('maps 408 API failures to a timeout error', () => {
      const error = new APICallError({
        message: 'Request timeout',
        statusCode: 408,
        url: 'https://example.test',
        requestBodyValues: {},
      });

      expect(normalizeProviderError(error, 'ai-sdk', 'gpt-4o-mini')).toBeInstanceOf(TimeoutError);
    });

    it('maps retryable API failures to a transient error', () => {
      const error = new APICallError({
        message: 'Gateway unavailable',
        statusCode: 503,
        url: 'https://example.test',
        requestBodyValues: {},
      });

      expect(normalizeProviderError(error, 'ai-sdk', 'gpt-4o-mini')).toBeInstanceOf(TransientError);
    });

    it('maps model lookup failures to an unsupported-model error', () => {
      const error = new NoSuchModelError({
        modelId: 'gpt-unknown',
        modelType: 'languageModel',
      });

      expect(normalizeProviderError(error, 'ai-sdk', 'gpt-unknown')).toBeInstanceOf(
        UnsupportedModelError
      );
    });

    it('maps schema-shaped messages to a schema validation error', () => {
      const error = new Error('Schema validation failed for output JSON');

      expect(normalizeProviderError(error, 'ai-sdk', 'gpt-4o-mini')).toBeInstanceOf(
        SchemaValidationError
      );
    });

    it('defaults unknown errors to transient', () => {
      const error = new Error('Unexpected upstream failure');

      expect(normalizeProviderError(error, 'ai-sdk', 'gpt-4o-mini')).toBeInstanceOf(TransientError);
    });
  });
});
