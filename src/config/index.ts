/**
 * Configuration loader for over-review.
 * Precedence: CLI flags > env > action inputs > local .env.
 * @packageDocumentation
 */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import {
  ConfigValidationError,
  parseBoolean,
  parseTrimmedString,
  validateConfig,
  type Config,
  type ReviewMode,
} from './schema';

export * from './schema';

export interface ConfigLoaderOptions {
  cli?: Partial<Config>;
  env?: NodeJS.ProcessEnv;
  cwd?: string;
}

type ConfigPatch = Partial<Config>;

const DEFAULT_GITHUB_API_URL = 'https://api.github.com';
const DEFAULT_GITHUB_SERVER_URL = 'https://github.com';

const ACTION_INPUT_MAP: Array<[keyof Config, string]> = [
  ['LLM_MODEL', 'llm-model'],
  ['LLM_API_KEY', 'llm-api-key'],
  ['LLM_BASE_URL', 'llm-base-url'],
  ['STYLE_GUIDE_RULES', 'style-guide-rules'],
  ['LLM_TIMEOUT_MS', 'llm-timeout-ms'],
  ['LLM_STRUCTURED_OUTPUTS', 'llm-structured-outputs'],
  ['GITHUB_API_URL', 'github-api-url'],
  ['GITHUB_SERVER_URL', 'github-server-url'],
  ['FULL_REVIEW', 'full-mode'],
  ['REVIEW_MODE', 'review-mode'],
];

export function loadConfig(options: ConfigLoaderOptions = {}): Config {
  const env = options.env ?? process.env;
  const cwd = options.cwd ?? process.cwd();

  const config = applyDefaults(
    mergeConfigPatches(
      loadLocalEnv(cwd),
      loadActionInputs(env),
      loadEnvironmentVariables(env),
      options.cli ?? {}
    )
  );

  const issues = validateConfig(config);

  if (issues.length > 0) {
    throw new ConfigValidationError(issues);
  }

  return config;
}

export function applyDefaults(config: ConfigPatch): Config {
  return {
    GITHUB_TOKEN: config.GITHUB_TOKEN ?? '',
    LLM_MODEL: config.LLM_MODEL ?? '',
    LLM_API_KEY: config.LLM_API_KEY ?? '',
    LLM_PROVIDER: 'ai-sdk',
    LLM_BASE_URL: config.LLM_BASE_URL,
    STYLE_GUIDE_RULES: config.STYLE_GUIDE_RULES,
    LLM_TIMEOUT_MS: config.LLM_TIMEOUT_MS ?? 30_000,
    LLM_STRUCTURED_OUTPUTS: config.LLM_STRUCTURED_OUTPUTS,
    GITHUB_API_URL: config.GITHUB_API_URL ?? DEFAULT_GITHUB_API_URL,
    GITHUB_SERVER_URL: config.GITHUB_SERVER_URL ?? DEFAULT_GITHUB_SERVER_URL,
    DEBUG: config.DEBUG ?? false,
    DRY_RUN: config.DRY_RUN ?? false,
    FULL_REVIEW: config.FULL_REVIEW ?? false,
    REVIEW_MODE: config.REVIEW_MODE ?? 'auto',
  };
}

export function loadEnvironmentVariables(env: NodeJS.ProcessEnv = process.env): ConfigPatch {
  const patch: ConfigPatch = {
    GITHUB_TOKEN: parseTrimmedString(env.GITHUB_TOKEN),
    LLM_MODEL: parseTrimmedString(env.LLM_MODEL),
    LLM_API_KEY: parseTrimmedString(env.LLM_API_KEY),
    LLM_BASE_URL: parseTrimmedString(env.LLM_BASE_URL),
    STYLE_GUIDE_RULES: parseTrimmedString(env.STYLE_GUIDE_RULES),
    GITHUB_API_URL: parseTrimmedString(env.GITHUB_API_URL),
    GITHUB_SERVER_URL: parseTrimmedString(env.GITHUB_SERVER_URL),
    DEBUG: parseBoolean(env.DEBUG),
    DRY_RUN: parseBoolean(env.DRY_RUN),
    FULL_REVIEW: parseBoolean(env.FULL_REVIEW),
    REVIEW_MODE: parseReviewMode(env.REVIEW_MODE),
  };

  if (env.LLM_TIMEOUT_MS !== undefined) {
    patch.LLM_TIMEOUT_MS = parseTimeoutOrThrow(env.LLM_TIMEOUT_MS);
  }

  if (env.LLM_STRUCTURED_OUTPUTS !== undefined) {
    patch.LLM_STRUCTURED_OUTPUTS = parseBooleanOrThrow(env.LLM_STRUCTURED_OUTPUTS, 'LLM_STRUCTURED_OUTPUTS');
  }

  return patch;
}

export function loadActionInputs(env: NodeJS.ProcessEnv = process.env): ConfigPatch {
  const patch: ConfigPatch = {};

  for (const [configKey, inputName] of ACTION_INPUT_MAP) {
    const value = parseTrimmedString(env[toActionInputEnvName(inputName)]);

    if (value === undefined) {
      continue;
    }

    assignConfigValue(patch, configKey, value);
  }

  return patch;
}

export function loadLocalEnv(cwd: string = process.cwd()): ConfigPatch {
  const envPath = resolve(cwd, '.env');

  if (!existsSync(envPath)) {
    return {};
  }

  return loadEnvironmentVariables(parseDotEnv(readFileSync(envPath, 'utf8')));
}

export function parseDotEnv(content: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    env[key] = rawValue.replace(/^['"]|['"]$/g, '');
  }

  return env;
}

export function toActionInputEnvName(inputName: string): string {
  return `INPUT_${inputName.replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase()}`;
}

function mergeConfigPatches(...patches: ConfigPatch[]): ConfigPatch {
  return Object.assign({}, ...patches);
}

function parseReviewMode(value: string | undefined): ReviewMode | undefined {
  const normalized = parseTrimmedString(value)?.toLowerCase();

  if (!normalized) {
    return undefined;
  }

  if (normalized === 'auto' || normalized === 'manual' || normalized === 'cli') {
    return normalized;
  }

  return undefined;
}

function parseTimeoutOrThrow(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.trim();

  if (!/^\d+$/.test(normalized)) {
    throw new Error(`Invalid LLM_TIMEOUT_MS value: "${value}". Must be a non-negative integer.`);
  }

  return Number(normalized);
}

function assignConfigValue(patch: ConfigPatch, key: keyof Config, value: string): void {
  if (key === 'DEBUG' || key === 'DRY_RUN' || key === 'FULL_REVIEW' || key === 'LLM_STRUCTURED_OUTPUTS') {
    const parsed = parseBooleanOrThrow(value, key);

    if (parsed !== undefined) {
      patch[key] = parsed as never;
    }

    return;
  }

  if (key === 'REVIEW_MODE') {
    const parsed = parseReviewMode(value);

    if (parsed) {
      patch[key] = parsed as never;
    }

    return;
  }

  if (key === 'LLM_TIMEOUT_MS') {
    const parsed = parseTimeoutOrThrow(value);
    patch[key] = parsed as never;
    return;
  }

  patch[key] = value as never;
}

function parseBooleanOrThrow(value: string, key: string): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();

  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  throw new Error(`Invalid ${key} value: "${value}". Expected true/false, yes/no, 1/0, on/off.`);
}
