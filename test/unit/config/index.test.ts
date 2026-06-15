import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  loadActionInputs,
  loadConfig,
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
  it('applies precedence from cli to env to action input to local .env', () => {
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
        [toActionInputEnvName('llm-model')]: 'input-model',
        [toActionInputEnvName('llm-api-key')]: 'input-key',
      },
      cli: {
        LLM_MODEL: 'cli-model',
      },
    });

    expect(config.GITHUB_TOKEN).toBe('env-token');
    expect(config.LLM_MODEL).toBe('cli-model');
    expect(config.LLM_API_KEY).toBe('env-key');
  });

  it('throws clear validation errors when required config is missing', () => {
    expect(() => loadConfig({ env: {} })).toThrowError(ConfigValidationError);

    try {
      loadConfig({ env: {} });
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigValidationError);
      expect((error as Error).message).toContain('GITHUB_TOKEN');
      expect((error as Error).message).toContain('LLM_MODEL');
      expect((error as Error).message).toContain('LLM_API_KEY');
    }
  });
});

describe('loadActionInputs', () => {
  it('reads hyphenated action input names via INPUT_* env vars', () => {
    const inputs = loadActionInputs({
      [toActionInputEnvName('llm-model')]: 'gpt-4o-mini',
      [toActionInputEnvName('llm-api-key')]: 'secret',
      [toActionInputEnvName('full-mode')]: 'true',
    });

    expect(inputs.LLM_MODEL).toBe('gpt-4o-mini');
    expect(inputs.LLM_API_KEY).toBe('secret');
    expect(inputs.FULL_REVIEW).toBe(true);
  });
});

describe('parseDotEnv', () => {
  it('parses simple key value lines', () => {
    expect(parseDotEnv("FOO=bar\nBAR='baz'\n# comment")).toEqual({
      FOO: 'bar',
      BAR: 'baz',
    });
  });
});

function createTempDir(): string {
  const directory = mkdtempSync(join(tmpdir(), 'over-review-config-'));
  tempDirectories.push(directory);
  return directory;
}
