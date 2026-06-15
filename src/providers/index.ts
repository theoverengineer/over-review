/**
 * Provider registry and resolution for over-review.
 * @packageDocumentation
 */

import type { AIProvider } from '../contracts/provider';
import { AISDKProvider } from './ai-sdk-provider';
import { ConfigurationError } from './errors';

export interface ProviderConfig {
  provider: 'ai-sdk';
  model: string;
  apiKey: string;
  baseUrl?: string;
}

export function createProvider(config: ProviderConfig): AIProvider {
  if (config.provider !== 'ai-sdk') {
    throw new ConfigurationError(
      `Provider '${config.provider}' is not supported in V1. Only 'ai-sdk' is supported.`,
      { provider: config.provider, model: 'unknown' }
    );
  }

  if (!config.model.trim()) {
    throw new ConfigurationError('LLM model is required.', {
      provider: config.provider,
      model: config.model,
    });
  }

  if (!config.apiKey.trim()) {
    throw new ConfigurationError('LLM API key is required.', {
      provider: config.provider,
      model: config.model,
    });
  }

  if (config.baseUrl !== undefined) {
    try {
      new URL(config.baseUrl);
    } catch {
      throw new ConfigurationError(`Invalid baseUrl: '${config.baseUrl}'. Must be a valid URL.`, {
        provider: config.provider,
        model: config.model,
      });
    }
  }

  return new AISDKProvider({
    model: config.model,
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
  });
}

export function resolveProviderPath(): 'ai-sdk' {
  return 'ai-sdk';
}

export * from './ai-sdk-provider';
export * from './errors';
