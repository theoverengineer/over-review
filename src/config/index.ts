/**
 * Configuration loader for over-review.
 * Precedence: CLI flags > env > action inputs > env file.
 * @packageDocumentation
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
  envFilePath?: string | false;
}

export type ConfigSource = 'cli' | 'env' | 'env-file' | 'action-input' | 'default' | 'gh-auth';

export interface ConfigSourceMetadata {
  envFile: {
    status: 'skipped' | 'missing' | 'loaded';
    path?: string;
  };
  sources: Record<keyof Config, ConfigSource>;
}

type ConfigPatch = Partial<Config>;

const DEFAULT_GITHUB_API_URL = 'https://api.github.com';
const DEFAULT_GITHUB_SERVER_URL = 'https://github.com';
const CONFIG_KEYS: Array<keyof Config> = [
  'GITHUB_TOKEN',
  'LLM_MODEL',
  'LLM_API_KEY',
  'LLM_PROVIDER',
  'LLM_BASE_URL',
  'STYLE_GUIDE_RULES',
  'LLM_TIMEOUT_MS',
  'LLM_STRUCTURED_OUTPUTS',
  'GITHUB_API_URL',
  'GITHUB_SERVER_URL',
  'DEBUG',
  'DRY_RUN',
  'FULL_REVIEW',
  'REVIEW_MODE',
];

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
  return loadConfigWithMetadata(options).config;
}

/**
 * Load config and return both the config and source metadata.
 * This is used for debug logging to show which fields came from which sources.
 */
export function loadConfigWithMetadata(options: ConfigLoaderOptions = {}): {
  config: Config;
  metadata: ConfigSourceMetadata;
} {
  const env = options.env ?? process.env;
  const cwd = options.cwd ?? process.cwd();
  const envFile = resolveEnvFile(cwd, options.envFilePath);
  const actionInputPatch = loadActionInputs(env);
  const envPatch = loadEnvironmentVariables(env);
  const cliPatch = options.cli ?? {};

  const merged = mergeConfigPatches(envFile.patch, actionInputPatch, envPatch, cliPatch);
  const config = applyDefaults(merged);

  const issues = validateConfig(config);

  if (issues.length > 0) {
    throw new ConfigValidationError(issues);
  }

  return {
    config,
    metadata: {
      envFile: {
        status: envFile.status,
        path: envFile.path,
      },
      sources: buildConfigSourceMap(envFile.patch, actionInputPatch, envPatch, cliPatch),
    },
  };
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
  const patch: ConfigPatch = {};

  const githubToken = parseTrimmedString(env.GITHUB_TOKEN);
  if (githubToken !== undefined) {
    patch.GITHUB_TOKEN = githubToken;
  }

  const llmModel = parseTrimmedString(env.LLM_MODEL);
  if (llmModel !== undefined) {
    patch.LLM_MODEL = llmModel;
  }

  const llmApiKey = parseTrimmedString(env.LLM_API_KEY);
  if (llmApiKey !== undefined) {
    patch.LLM_API_KEY = llmApiKey;
  }

  const llmBaseUrl = parseTrimmedString(env.LLM_BASE_URL);
  if (llmBaseUrl !== undefined) {
    patch.LLM_BASE_URL = llmBaseUrl;
  }

  const styleGuideRules = parseTrimmedString(env.STYLE_GUIDE_RULES);
  if (styleGuideRules !== undefined) {
    patch.STYLE_GUIDE_RULES = styleGuideRules;
  }

  const githubApiUrl = parseTrimmedString(env.GITHUB_API_URL);
  if (githubApiUrl !== undefined) {
    patch.GITHUB_API_URL = githubApiUrl;
  }

  const githubServerUrl = parseTrimmedString(env.GITHUB_SERVER_URL);
  if (githubServerUrl !== undefined) {
    patch.GITHUB_SERVER_URL = githubServerUrl;
  }

  const debug = parseBoolean(env.DEBUG);
  if (debug !== undefined) {
    patch.DEBUG = debug;
  }

  const dryRun = parseBoolean(env.DRY_RUN);
  if (dryRun !== undefined) {
    patch.DRY_RUN = dryRun;
  }

  const fullReview = parseBoolean(env.FULL_REVIEW);
  if (fullReview !== undefined) {
    patch.FULL_REVIEW = fullReview;
  }

  const reviewMode = parseReviewMode(env.REVIEW_MODE);
  if (reviewMode !== undefined) {
    patch.REVIEW_MODE = reviewMode;
  }

  if (env.LLM_TIMEOUT_MS !== undefined) {
    patch.LLM_TIMEOUT_MS = parseTimeoutOrThrow(env.LLM_TIMEOUT_MS);
  }

  if (env.LLM_STRUCTURED_OUTPUTS !== undefined) {
    patch.LLM_STRUCTURED_OUTPUTS = parseBooleanOrThrow(
      env.LLM_STRUCTURED_OUTPUTS,
      'LLM_STRUCTURED_OUTPUTS'
    );
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
/**
 * Load configuration from a local .env file.
 * If envFilePath is provided, use that path; otherwise, use <cwd>/.env.
 * If envFilePath is explicitly false, skip loading .env entirely.
 */
export function loadLocalEnv(
  cwd: string = process.cwd(),
  envFilePath?: string | false
): ConfigPatch {
  return resolveEnvFile(cwd, envFilePath).patch;
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
    let rawValue = trimmed.slice(separatorIndex + 1).trim();

    // Check if value is quoted (handles both "value" and 'value')
    const isQuoted =
      (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
      (rawValue.startsWith("'") && rawValue.endsWith("'"));

    if (isQuoted) {
      // For quoted values, preserve # inside the quotes
      rawValue = rawValue.slice(1, -1);
    } else {
      // For unquoted values, strip inline comments starting with #
      const commentIndex = rawValue.indexOf('#');
      if (commentIndex !== -1) {
        rawValue = rawValue.slice(0, commentIndex).trim();
      }
    }

    env[key] = rawValue;
  }

  return env;
}

export function toActionInputEnvName(inputName: string): string {
  return `INPUT_${inputName.replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase()}`;
}

function mergeConfigPatches(...patches: ConfigPatch[]): ConfigPatch {
  return Object.assign({}, ...patches);
}

function resolveEnvFile(
  cwd: string,
  envFilePath?: string | false
): { patch: ConfigPatch; path?: string; status: ConfigSourceMetadata['envFile']['status'] } {
  if (envFilePath === false) {
    return { patch: {}, status: 'skipped' };
  }

  const pathToLoad = envFilePath ? resolve(cwd, envFilePath) : resolve(cwd, '.env');

  if (!existsSync(pathToLoad)) {
    return { patch: {}, path: pathToLoad, status: 'missing' };
  }

  return {
    patch: loadEnvironmentVariables(parseDotEnv(readFileSync(pathToLoad, 'utf8'))),
    path: pathToLoad,
    status: 'loaded',
  };
}

function buildConfigSourceMap(
  envFilePatch: ConfigPatch,
  actionInputPatch: ConfigPatch,
  envPatch: ConfigPatch,
  cliPatch: ConfigPatch
): Record<keyof Config, ConfigSource> {
  const sources = Object.fromEntries(CONFIG_KEYS.map((key) => [key, 'default'])) as Record<
    keyof Config,
    ConfigSource
  >;

  applyConfigSource(sources, envFilePatch, 'env-file');
  applyConfigSource(sources, actionInputPatch, 'action-input');
  applyConfigSource(sources, envPatch, 'env');
  applyConfigSource(sources, cliPatch, 'cli');

  return sources;
}

function applyConfigSource(
  sources: Record<keyof Config, ConfigSource>,
  patch: ConfigPatch,
  source: ConfigSource
): void {
  for (const key of CONFIG_KEYS) {
    if (patch[key] !== undefined) {
      sources[key] = source;
    }
  }
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
  if (
    key === 'DEBUG' ||
    key === 'DRY_RUN' ||
    key === 'FULL_REVIEW' ||
    key === 'LLM_STRUCTURED_OUTPUTS'
  ) {
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
