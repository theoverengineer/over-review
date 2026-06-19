"use strict";
/**
 * Configuration loader for over-review.
 * Precedence: CLI flags > env > action inputs > env file.
 * @packageDocumentation
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
exports.loadConfigWithMetadata = loadConfigWithMetadata;
exports.applyDefaults = applyDefaults;
exports.loadEnvironmentVariables = loadEnvironmentVariables;
exports.loadActionInputs = loadActionInputs;
exports.loadLocalEnv = loadLocalEnv;
exports.parseDotEnv = parseDotEnv;
exports.toActionInputEnvName = toActionInputEnvName;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const schema_1 = require("./schema");
__exportStar(require("./schema"), exports);
const DEFAULT_GITHUB_API_URL = 'https://api.github.com';
const DEFAULT_GITHUB_SERVER_URL = 'https://github.com';
const CONFIG_KEYS = [
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
const ACTION_INPUT_MAP = [
    ['GITHUB_TOKEN', 'github-token'],
    ['LLM_MODEL', 'llm-model'],
    ['LLM_API_KEY', 'llm-api-key'],
    ['LLM_BASE_URL', 'llm-base-url'],
    ['LLM_PROVIDER', 'llm-provider'],
    ['STYLE_GUIDE_RULES', 'style-guide-rules'],
    ['LLM_TIMEOUT_MS', 'llm-timeout-ms'],
    ['LLM_STRUCTURED_OUTPUTS', 'llm-structured-outputs'],
    ['GITHUB_API_URL', 'github-api-url'],
    ['GITHUB_SERVER_URL', 'github-server-url'],
    ['DEBUG', 'debug'],
    ['DRY_RUN', 'dry-run'],
    ['FULL_REVIEW', 'full-mode'],
    ['REVIEW_MODE', 'review-mode'],
];
function loadConfig(options = {}) {
    return loadConfigWithMetadata(options).config;
}
/**
 * Load config and return both the config and source metadata.
 * This is used for debug logging to show which fields came from which sources.
 */
function loadConfigWithMetadata(options = {}) {
    const env = options.env ?? process.env;
    const cwd = options.cwd ?? process.cwd();
    const envFile = resolveEnvFile(cwd, options.envFilePath);
    const actionInputPatch = loadActionInputs(env);
    const envPatch = loadEnvironmentVariables(env);
    const cliPatch = options.cli ?? {};
    const merged = mergeConfigPatches(envFile.patch, actionInputPatch, envPatch, cliPatch);
    const config = applyDefaults(merged);
    const issues = (0, schema_1.validateConfig)(config);
    if (issues.length > 0) {
        throw new schema_1.ConfigValidationError(issues);
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
function applyDefaults(config) {
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
function loadEnvironmentVariables(env = process.env) {
    const patch = {};
    const githubToken = (0, schema_1.parseTrimmedString)(env.GITHUB_TOKEN);
    if (githubToken !== undefined) {
        patch.GITHUB_TOKEN = githubToken;
    }
    const llmModel = (0, schema_1.parseTrimmedString)(env.LLM_MODEL);
    if (llmModel !== undefined) {
        patch.LLM_MODEL = llmModel;
    }
    const llmApiKey = (0, schema_1.parseTrimmedString)(env.LLM_API_KEY);
    if (llmApiKey !== undefined) {
        patch.LLM_API_KEY = llmApiKey;
    }
    const llmBaseUrl = (0, schema_1.parseTrimmedString)(env.LLM_BASE_URL);
    if (llmBaseUrl !== undefined) {
        patch.LLM_BASE_URL = llmBaseUrl;
    }
    const styleGuideRules = (0, schema_1.parseTrimmedString)(env.STYLE_GUIDE_RULES);
    if (styleGuideRules !== undefined) {
        patch.STYLE_GUIDE_RULES = styleGuideRules;
    }
    const githubApiUrl = (0, schema_1.parseTrimmedString)(env.GITHUB_API_URL);
    if (githubApiUrl !== undefined) {
        patch.GITHUB_API_URL = githubApiUrl;
    }
    const githubServerUrl = (0, schema_1.parseTrimmedString)(env.GITHUB_SERVER_URL);
    if (githubServerUrl !== undefined) {
        patch.GITHUB_SERVER_URL = githubServerUrl;
    }
    const debug = (0, schema_1.parseBoolean)(env.DEBUG);
    if (debug !== undefined) {
        patch.DEBUG = debug;
    }
    const dryRun = (0, schema_1.parseBoolean)(env.DRY_RUN);
    if (dryRun !== undefined) {
        patch.DRY_RUN = dryRun;
    }
    const fullReview = (0, schema_1.parseBoolean)(env.FULL_REVIEW);
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
        patch.LLM_STRUCTURED_OUTPUTS = parseBooleanOrThrow(env.LLM_STRUCTURED_OUTPUTS, 'LLM_STRUCTURED_OUTPUTS');
    }
    return patch;
}
function loadActionInputs(env = process.env) {
    const patch = {};
    for (const [configKey, inputName] of ACTION_INPUT_MAP) {
        const value = (0, schema_1.parseTrimmedString)(env[toActionInputEnvName(inputName)]);
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
function loadLocalEnv(cwd = process.cwd(), envFilePath) {
    return resolveEnvFile(cwd, envFilePath).patch;
}
function parseDotEnv(content) {
    const env = {};
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
        const isQuoted = (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
            (rawValue.startsWith("'") && rawValue.endsWith("'"));
        if (isQuoted) {
            // For quoted values, preserve # inside the quotes
            rawValue = rawValue.slice(1, -1);
        }
        else {
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
function toActionInputEnvName(inputName) {
    return `INPUT_${inputName.toUpperCase()}`;
}
function mergeConfigPatches(...patches) {
    return Object.assign({}, ...patches);
}
function resolveEnvFile(cwd, envFilePath) {
    if (envFilePath === false) {
        return { patch: {}, status: 'skipped' };
    }
    const pathToLoad = envFilePath ? (0, node_path_1.resolve)(cwd, envFilePath) : (0, node_path_1.resolve)(cwd, '.env');
    if (!(0, node_fs_1.existsSync)(pathToLoad)) {
        return { patch: {}, path: pathToLoad, status: 'missing' };
    }
    return {
        patch: loadEnvironmentVariables(parseDotEnv((0, node_fs_1.readFileSync)(pathToLoad, 'utf8'))),
        path: pathToLoad,
        status: 'loaded',
    };
}
function buildConfigSourceMap(envFilePatch, actionInputPatch, envPatch, cliPatch) {
    const sources = Object.fromEntries(CONFIG_KEYS.map((key) => [key, 'default']));
    applyConfigSource(sources, envFilePatch, 'env-file');
    applyConfigSource(sources, actionInputPatch, 'action-input');
    applyConfigSource(sources, envPatch, 'env');
    applyConfigSource(sources, cliPatch, 'cli');
    return sources;
}
function applyConfigSource(sources, patch, source) {
    for (const key of CONFIG_KEYS) {
        if (patch[key] !== undefined) {
            sources[key] = source;
        }
    }
}
function parseReviewMode(value) {
    const normalized = (0, schema_1.parseTrimmedString)(value)?.toLowerCase();
    if (!normalized) {
        return undefined;
    }
    if (normalized === 'auto' || normalized === 'manual' || normalized === 'cli') {
        return normalized;
    }
    return undefined;
}
function parseTimeoutOrThrow(value) {
    if (value === undefined) {
        return undefined;
    }
    const normalized = value.trim();
    if (!/^\d+$/.test(normalized)) {
        throw new Error(`Invalid LLM_TIMEOUT_MS value: "${value}". Must be a non-negative integer.`);
    }
    return Number(normalized);
}
function assignConfigValue(patch, key, value) {
    if (key === 'DEBUG' ||
        key === 'DRY_RUN' ||
        key === 'FULL_REVIEW' ||
        key === 'LLM_STRUCTURED_OUTPUTS') {
        const parsed = parseBooleanOrThrow(value, key);
        if (parsed !== undefined) {
            patch[key] = parsed;
        }
        return;
    }
    if (key === 'REVIEW_MODE') {
        const parsed = parseReviewMode(value);
        if (parsed) {
            patch[key] = parsed;
        }
        return;
    }
    if (key === 'LLM_TIMEOUT_MS') {
        const parsed = parseTimeoutOrThrow(value);
        patch[key] = parsed;
        return;
    }
    patch[key] = value;
}
function parseBooleanOrThrow(value, key) {
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
//# sourceMappingURL=index.js.map