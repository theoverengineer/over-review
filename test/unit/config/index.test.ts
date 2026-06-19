import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  loadActionInputs,
  loadConfig,
  loadConfigWithMetadata,
  parseDotEnv,
  toActionInputEnvName,
} from '../../../src/config';
import { ConfigValidationError } from '../../../src/config/schema';

const tempDirectories: string[] = [];

afterEach(() => {
  while (tempDirectories.length > 0) {
    rmSync(tempDirectories.pop() as string, { recursive: true, force: true });
  }
});

describe('loadConfig', () => {
  it('applies precedence from cli to env to action input to local .env when envFilePath is not specified (GitHub Action behavior)', () => {
    const cwd = createTempDir();

    writeFileSync(
      join(cwd, '.env'),
      ['GITHUB_TOKEN=dotenv-token', 'LLM_MODEL=dotenv-model', 'LLM_API_KEY=dotenv-key'].join('\n'),
      'utf8'
    );

    const config = loadConfig({
      cwd,
      env: {
        GITHUB_TOKEN: 'env-token',
        LLM_MODEL: 'env-model',
        LLM_API_KEY: 'env-key',
        'INPUT_LLM-MODEL': 'input-model',
        'INPUT_LLM-API-KEY': 'input-key',
      },
      cli: {
        LLM_MODEL: 'cli-model',
      },
    });

    // .env is loaded first, then env vars override, then CLI overrides
    expect(config.GITHUB_TOKEN).toBe('env-token');
    expect(config.LLM_MODEL).toBe('cli-model');
    expect(config.LLM_API_KEY).toBe('env-key');
  });

  it('does not load .env when envFilePath is explicitly false', () => {
    const cwd = createTempDir();

    writeFileSync(
      join(cwd, '.env'),
      ['GITHUB_TOKEN=dotenv-token', 'LLM_MODEL=dotenv-model', 'LLM_API_KEY=dotenv-key'].join('\n'),
      'utf8'
    );

    const config = loadConfig({
      cwd,
      env: {
        GITHUB_TOKEN: 'env-token',
        LLM_MODEL: 'env-model',
        LLM_API_KEY: 'env-key',
      },
      cli: {
        LLM_MODEL: 'cli-model',
      },
      envFilePath: false,
    });

    // .env should NOT be loaded; only env vars and CLI
    expect(config.GITHUB_TOKEN).toBe('env-token');
    expect(config.LLM_MODEL).toBe('cli-model');
    expect(config.LLM_API_KEY).toBe('env-key');
  });

  it('uses custom env file path when provided', () => {
    const cwd = createTempDir();
    const customEnvPath = join(cwd, 'custom.env');

    writeFileSync(
      customEnvPath,
      ['GITHUB_TOKEN=custom-env-token', 'LLM_MODEL=custom-env-model'].join('\n'),
      'utf8'
    );

    const config = loadConfig({
      cwd,
      env: {
        GITHUB_TOKEN: 'env-token',
        LLM_MODEL: 'env-model',
        LLM_API_KEY: 'env-key',
      },
      cli: {
        LLM_MODEL: 'cli-model',
      },
      envFilePath: 'custom.env',
    });

    // custom.env should be loaded; env vars override it, CLI overrides env vars
    expect(config.GITHUB_TOKEN).toBe('env-token');
    expect(config.LLM_MODEL).toBe('cli-model');
    expect(config.LLM_API_KEY).toBe('env-key');
  });

  it('loads required config from an env file when the real environment is unset', () => {
    const cwd = createTempDir();
    const customEnvPath = join(cwd, 'custom.env');

    writeFileSync(
      customEnvPath,
      [
        'GITHUB_TOKEN=custom-env-token',
        'LLM_MODEL=custom-env-model',
        'LLM_API_KEY=custom-env-key',
      ].join('\n'),
      'utf8'
    );

    const config = loadConfig({
      cwd,
      env: {},
      envFilePath: 'custom.env',
    });

    expect(config.GITHUB_TOKEN).toBe('custom-env-token');
    expect(config.LLM_MODEL).toBe('custom-env-model');
    expect(config.LLM_API_KEY).toBe('custom-env-key');
  });

  it('throws clear validation errors when required config is missing', () => {
    expect(() => loadConfig({ env: {}, envFilePath: false })).toThrowError(ConfigValidationError);

    try {
      loadConfig({ env: {}, envFilePath: false });
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigValidationError);
      expect((error as Error).message).toContain('GITHUB_TOKEN');
      expect((error as Error).message).toContain('LLM_MODEL');
      expect((error as Error).message).toContain('LLM_API_KEY');
    }
  });

  it('applies default timeout of 30000ms when not configured', () => {
    const cwd = createTempDir();

    const config = loadConfig({
      cwd,
      env: {
        GITHUB_TOKEN: 'token',
        LLM_MODEL: 'model',
        LLM_API_KEY: 'key',
      },
    });

    expect(config.LLM_TIMEOUT_MS).toBe(30_000);
  });

  it('accepts custom timeout from environment variable', () => {
    const config = loadConfig({
      env: {
        GITHUB_TOKEN: 'token',
        LLM_MODEL: 'model',
        LLM_API_KEY: 'key',
        LLM_TIMEOUT_MS: '60000',
      },
    });

    expect(config.LLM_TIMEOUT_MS).toBe(60_000);
  });

  it('accepts zero timeout to disable timeout', () => {
    const config = loadConfig({
      env: {
        GITHUB_TOKEN: 'token',
        LLM_MODEL: 'model',
        LLM_API_KEY: 'key',
        LLM_TIMEOUT_MS: '0',
      },
    });

    expect(config.LLM_TIMEOUT_MS).toBe(0);
  });

  it('accepts timeout from action input', () => {
    const config = loadConfig({
      env: {
        GITHUB_TOKEN: 'token',
        LLM_MODEL: 'model',
        LLM_API_KEY: 'key',
        'INPUT_LLM-TIMEOUT-MS': '45000',
      },
    });

    expect(config.LLM_TIMEOUT_MS).toBe(45_000);
  });

  it('accepts timeout from CLI', () => {
    const config = loadConfig({
      env: {
        GITHUB_TOKEN: 'token',
        LLM_MODEL: 'model',
        LLM_API_KEY: 'key',
      },
      cli: {
        LLM_TIMEOUT_MS: 120000,
      },
    });

    expect(config.LLM_TIMEOUT_MS).toBe(120_000);
  });

  it('rejects invalid timeout values', () => {
    expect(() =>
      loadConfig({
        env: {
          GITHUB_TOKEN: 'token',
          LLM_MODEL: 'model',
          LLM_API_KEY: 'key',
          LLM_TIMEOUT_MS: '-100',
        },
      })
    ).toThrow(/LLM_TIMEOUT_MS.*non-negative integer/);

    expect(() =>
      loadConfig({
        env: {
          GITHUB_TOKEN: 'token',
          LLM_MODEL: 'model',
          LLM_API_KEY: 'key',
          LLM_TIMEOUT_MS: 'invalid',
        },
      })
    ).toThrow(/LLM_TIMEOUT_MS.*non-negative integer/);

    expect(() =>
      loadConfig({
        env: {
          GITHUB_TOKEN: 'token',
          LLM_MODEL: 'model',
          LLM_API_KEY: 'key',
          LLM_TIMEOUT_MS: '60s',
        },
      })
    ).toThrow(/LLM_TIMEOUT_MS.*non-negative integer/);
  });

  it('accepts structured outputs from environment variable', () => {
    const config = loadConfig({
      env: {
        GITHUB_TOKEN: 'token',
        LLM_MODEL: 'model',
        LLM_API_KEY: 'key',
        LLM_STRUCTURED_OUTPUTS: 'true',
      },
    });

    expect(config.LLM_STRUCTURED_OUTPUTS).toBe(true);
  });

  it('accepts disabled structured outputs from environment variable', () => {
    const config = loadConfig({
      env: {
        GITHUB_TOKEN: 'token',
        LLM_MODEL: 'model',
        LLM_API_KEY: 'key',
        LLM_STRUCTURED_OUTPUTS: 'false',
      },
    });

    expect(config.LLM_STRUCTURED_OUTPUTS).toBe(false);
  });

  it('accepts structured outputs from action input', () => {
    const config = loadConfig({
      env: {
        GITHUB_TOKEN: 'token',
        LLM_MODEL: 'model',
        LLM_API_KEY: 'key',
        'INPUT_LLM-STRUCTURED-OUTPUTS': 'true',
      },
    });

    expect(config.LLM_STRUCTURED_OUTPUTS).toBe(true);
  });

  it('accepts structured outputs from CLI', () => {
    const config = loadConfig({
      env: {
        GITHUB_TOKEN: 'token',
        LLM_MODEL: 'model',
        LLM_API_KEY: 'key',
      },
      cli: {
        LLM_STRUCTURED_OUTPUTS: false,
      },
    });

    expect(config.LLM_STRUCTURED_OUTPUTS).toBe(false);
  });

  it('defaults to undefined (provider default) when not configured', () => {
    const cwd = createTempDir();

    const config = loadConfig({
      cwd,
      env: {
        GITHUB_TOKEN: 'token',
        LLM_MODEL: 'model',
        LLM_API_KEY: 'key',
      },
    });

    expect(config.LLM_STRUCTURED_OUTPUTS).toBeUndefined();
  });

  it('rejects invalid structured outputs values', () => {
    expect(() =>
      loadConfig({
        env: {
          GITHUB_TOKEN: 'token',
          LLM_MODEL: 'model',
          LLM_API_KEY: 'key',
          LLM_STRUCTURED_OUTPUTS: 'invalid',
        },
      })
    ).toThrow(/LLM_STRUCTURED_OUTPUTS.*true\/false/);
  });

  it('returns source metadata with loadConfigWithMetadata', () => {
    const config = loadConfigWithMetadata({
      env: {
        GITHUB_TOKEN: 'env-token',
        LLM_MODEL: 'env-model',
        LLM_API_KEY: 'env-key',
      },
      cli: {
        LLM_MODEL: 'cli-model',
      },
    });

    expect(config.config.LLM_MODEL).toBe('cli-model');
    expect(config.config.GITHUB_TOKEN).toBe('env-token');
    expect(config.config.LLM_API_KEY).toBe('env-key');

    expect(config.metadata.sources.LLM_MODEL).toBe('cli');
    expect(config.metadata.sources.GITHUB_TOKEN).toBe('env');
    expect(config.metadata.sources.LLM_API_KEY).toBe('env');
  });

  it('tracks env-file source when loading from .env file', () => {
    const cwd = createTempDir();

    writeFileSync(
      join(cwd, '.env'),
      ['GITHUB_TOKEN=dotenv-token', 'LLM_MODEL=dotenv-model'].join('\n'),
      'utf8'
    );

    const config = loadConfigWithMetadata({
      cwd,
      env: {
        LLM_API_KEY: 'env-key',
      },
    });

    expect(config.config.GITHUB_TOKEN).toBe('dotenv-token');
    expect(config.config.LLM_MODEL).toBe('dotenv-model');
    expect(config.config.LLM_API_KEY).toBe('env-key');

    expect(config.metadata.sources.GITHUB_TOKEN).toBe('env-file');
    expect(config.metadata.sources.LLM_MODEL).toBe('env-file');
    expect(config.metadata.sources.LLM_API_KEY).toBe('env');
  });

  it('tracks action-input sources', () => {
    const config = loadConfigWithMetadata({
      env: {
        GITHUB_TOKEN: 'token',
        LLM_MODEL: 'model',
        LLM_API_KEY: 'key',
        'INPUT_LLM-MODEL': 'input-model',
        'INPUT_FULL-MODE': 'true',
      },
    });

    // env has higher priority than action-input
    expect(config.config.LLM_MODEL).toBe('model');
    expect(config.config.FULL_REVIEW).toBe(true);

    expect(config.metadata.sources.LLM_MODEL).toBe('env');
    expect(config.metadata.sources.FULL_REVIEW).toBe('action-input');
  });

  it('tracks cli sources', () => {
    const config = loadConfigWithMetadata({
      env: {
        GITHUB_TOKEN: 'token',
        LLM_MODEL: 'model',
        LLM_API_KEY: 'key',
      },
      cli: {
        LLM_MODEL: 'cli-model',
        LLM_TIMEOUT_MS: 60000,
      },
    });

    expect(config.config.LLM_MODEL).toBe('cli-model');
    expect(config.config.LLM_TIMEOUT_MS).toBe(60000);

    expect(config.metadata.sources.LLM_MODEL).toBe('cli');
    expect(config.metadata.sources.LLM_TIMEOUT_MS).toBe('cli');
  });

  it('shows env-file path and loaded status in metadata', () => {
    const cwd = createTempDir();

    writeFileSync(join(cwd, '.env'), 'GITHUB_TOKEN=token\n', 'utf8');

    const config = loadConfigWithMetadata({
      cwd,
      env: {
        LLM_MODEL: 'model',
        LLM_API_KEY: 'key',
      },
    });

    expect(config.metadata.envFile.path).toBe(join(cwd, '.env'));
    expect(config.metadata.envFile.status).toBe('loaded');
  });

  it('shows env-file as skipped when envFilePath is false', () => {
    const config = loadConfigWithMetadata({
      env: {
        GITHUB_TOKEN: 'token',
        LLM_MODEL: 'model',
        LLM_API_KEY: 'key',
      },
      envFilePath: false,
    });

    expect(config.metadata.envFile.status).toBe('skipped');
    expect(config.metadata.envFile.path).toBeUndefined();
  });

  it('shows env-file as not found when file does not exist', () => {
    const cwd = createTempDir();

    const config = loadConfigWithMetadata({
      cwd,
      env: {
        GITHUB_TOKEN: 'token',
        LLM_MODEL: 'model',
        LLM_API_KEY: 'key',
      },
    });

    expect(config.metadata.envFile.status).toBe('missing');
    expect(config.metadata.envFile.path).toBe(join(cwd, '.env'));
  });
});

describe('loadActionInputs', () => {
  it('reads hyphenated action input names via INPUT_* env vars (GitHub Actions format)', () => {
    // GitHub Actions preserves hyphens in env var names for action inputs
    // e.g., input "llm-model" becomes env var "INPUT_LLM-MODEL"
    const inputs = loadActionInputs({
      'INPUT_LLM-MODEL': 'gpt-4o-mini',
      'INPUT_LLM-API-KEY': 'secret',
      'INPUT_FULL-MODE': 'true',
      'INPUT_LLM-TIMEOUT-MS': '90000',
    });

    expect(inputs.LLM_MODEL).toBe('gpt-4o-mini');
    expect(inputs.LLM_API_KEY).toBe('secret');
    expect(inputs.FULL_REVIEW).toBe(true);
    expect(inputs.LLM_TIMEOUT_MS).toBe(90000);
  });

  it('toActionInputEnvName correctly converts hyphenated input names to GitHub Actions env var format', () => {
    expect(toActionInputEnvName('llm-model')).toBe('INPUT_LLM-MODEL');
    expect(toActionInputEnvName('llm-api-key')).toBe('INPUT_LLM-API-KEY');
    expect(toActionInputEnvName('llm-base-url')).toBe('INPUT_LLM-BASE-URL');
    expect(toActionInputEnvName('style-guide-rules')).toBe('INPUT_STYLE-GUIDE-RULES');
    expect(toActionInputEnvName('llm-timeout-ms')).toBe('INPUT_LLM-TIMEOUT-MS');
    expect(toActionInputEnvName('llm-structured-outputs')).toBe('INPUT_LLM-STRUCTURED-OUTPUTS');
    expect(toActionInputEnvName('github-api-url')).toBe('INPUT_GITHUB-API-URL');
    expect(toActionInputEnvName('github-server-url')).toBe('INPUT_GITHUB-SERVER-URL');
    expect(toActionInputEnvName('review-mode')).toBe('INPUT_REVIEW-MODE');
    expect(toActionInputEnvName('full-mode')).toBe('INPUT_FULL-MODE');
    expect(toActionInputEnvName('dry-run')).toBe('INPUT_DRY-RUN');
    expect(toActionInputEnvName('debug')).toBe('INPUT_DEBUG');
    expect(toActionInputEnvName('github-token')).toBe('INPUT_GITHUB-TOKEN');
  });

  it('maps action inputs for all supported config keys', () => {
    const inputs = loadActionInputs({
      'INPUT_GITHUB-TOKEN': 'action-token',
      'INPUT_LLM-MODEL': 'gpt-4o-mini',
      'INPUT_LLM-API-KEY': 'action-key',
      'INPUT_LLM-BASE-URL': 'https://custom.api.com',
      'INPUT_LLM-PROVIDER': 'ai-sdk',
      'INPUT_STYLE-GUIDE-RULES': 'No console.log statements',
      'INPUT_LLM-TIMEOUT-MS': '60000',
      'INPUT_LLM-STRUCTURED-OUTPUTS': 'true',
      'INPUT_GITHUB-API-URL': 'https://api.github.com',
      'INPUT_GITHUB-SERVER-URL': 'https://github.com',
      INPUT_DEBUG: 'true',
      'INPUT_DRY-RUN': 'true',
      'INPUT_FULL-MODE': 'true',
      'INPUT_REVIEW-MODE': 'manual',
    });

    expect(inputs.GITHUB_TOKEN).toBe('action-token');
    expect(inputs.LLM_MODEL).toBe('gpt-4o-mini');
    expect(inputs.LLM_API_KEY).toBe('action-key');
    expect(inputs.LLM_BASE_URL).toBe('https://custom.api.com');
    expect(inputs.LLM_PROVIDER).toBe('ai-sdk');
    expect(inputs.STYLE_GUIDE_RULES).toBe('No console.log statements');
    expect(inputs.LLM_TIMEOUT_MS).toBe(60000);
    expect(inputs.LLM_STRUCTURED_OUTPUTS).toBe(true);
    expect(inputs.GITHUB_API_URL).toBe('https://api.github.com');
    expect(inputs.GITHUB_SERVER_URL).toBe('https://github.com');
    expect(inputs.DEBUG).toBe(true);
    expect(inputs.DRY_RUN).toBe(true);
    expect(inputs.FULL_REVIEW).toBe(true);
    expect(inputs.REVIEW_MODE).toBe('manual');
  });
});

describe('parseDotEnv', () => {
  it('parses simple key value lines', () => {
    expect(parseDotEnv("FOO=bar\nBAR='baz'\n# comment")).toEqual({
      FOO: 'bar',
      BAR: 'baz',
    });
  });

  it('strips inline comments from unquoted values', () => {
    expect(
      parseDotEnv(
        'LLM_MODEL=moonshotai/kimi-k2.6 # Model name\nGITHUB_TOKEN=ghp_token123 # token\nFOO=bar'
      )
    ).toEqual({
      LLM_MODEL: 'moonshotai/kimi-k2.6',
      GITHUB_TOKEN: 'ghp_token123',
      FOO: 'bar',
    });
  });

  it('preserves # inside quoted values', () => {
    expect(
      parseDotEnv("FOO='value # with hash'\nBAR=\"another # comment\"\nBAZ='single#quoted'")
    ).toEqual({
      FOO: 'value # with hash',
      BAR: 'another # comment',
      BAZ: 'single#quoted',
    });
  });

  it('handles inline comment at end of line with quotes', () => {
    // When a value is quoted, the # inside the quotes is preserved as part of the value
    // The closing quote must be at the end for the value to be considered quoted
    expect(parseDotEnv("FOO='bar'\nBAZ=hello # world")).toEqual({
      FOO: 'bar',
      BAZ: 'hello',
    });
  });
});

function createTempDir(): string {
  const directory = mkdtempSync(join(tmpdir(), 'over-review-config-'));
  tempDirectories.push(directory);
  return directory;
}
