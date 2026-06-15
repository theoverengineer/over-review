/**
 * Configuration schema and validation for over-review.
 * @packageDocumentation
 */

export type ReviewMode = 'auto' | 'manual' | 'cli';

export interface Config {
  GITHUB_TOKEN: string;
  LLM_MODEL: string;
  LLM_API_KEY: string;
  LLM_PROVIDER: 'ai-sdk';
  LLM_BASE_URL?: string;
  STYLE_GUIDE_RULES?: string;
  LLM_TIMEOUT_MS?: number;
  GITHUB_API_URL: string;
  GITHUB_SERVER_URL: string;
  DEBUG: boolean;
  DRY_RUN: boolean;
  FULL_REVIEW: boolean;
  REVIEW_MODE: ReviewMode;
}

export type ConfigKey = keyof Config;

export interface ConfigValidationIssue {
  field: ConfigKey | 'config';
  message: string;
}

export class ConfigValidationError extends Error {
  readonly issues: ConfigValidationIssue[];

  constructor(issues: ConfigValidationIssue[]) {
    super(formatConfigValidationIssues(issues));
    this.name = 'ConfigValidationError';
    this.issues = issues;
  }
}

export function validateConfig(config: Partial<Config>): ConfigValidationIssue[] {
  const issues: ConfigValidationIssue[] = [];

  if (!config.GITHUB_TOKEN?.trim()) {
    issues.push({ field: 'GITHUB_TOKEN', message: 'GITHUB_TOKEN is required.' });
  }

  if (!config.LLM_MODEL?.trim()) {
    issues.push({ field: 'LLM_MODEL', message: 'LLM_MODEL is required.' });
  }

  if (!config.LLM_API_KEY?.trim()) {
    issues.push({ field: 'LLM_API_KEY', message: 'LLM_API_KEY is required.' });
  }

  if (config.LLM_PROVIDER && config.LLM_PROVIDER !== 'ai-sdk') {
    issues.push({
      field: 'LLM_PROVIDER',
      message: 'Only the ai-sdk provider is supported in V1.',
    });
  }

  if (config.REVIEW_MODE && !['auto', 'manual', 'cli'].includes(config.REVIEW_MODE)) {
    issues.push({
      field: 'REVIEW_MODE',
      message: 'REVIEW_MODE must be one of auto, manual, or cli.',
    });
  }

  if (config.LLM_TIMEOUT_MS !== undefined && !isValidTimeout(config.LLM_TIMEOUT_MS)) {
    issues.push({
      field: 'LLM_TIMEOUT_MS',
      message: 'LLM_TIMEOUT_MS must be a non-negative integer or 0 to disable.',
    });
  }

  return issues;
}

function isValidTimeout(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

export function formatConfigValidationIssues(issues: ConfigValidationIssue[]): string {
  return issues.map((issue) => `${issue.field}: ${issue.message}`).join('\n');
}

export function parseBoolean(value: string | undefined): boolean | undefined {
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

  return undefined;
}

export function parseTrimmedString(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}
