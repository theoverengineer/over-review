"use strict";
/**
 * Configuration schema and validation for over-review.
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigValidationError = void 0;
exports.validateConfig = validateConfig;
exports.formatConfigValidationIssues = formatConfigValidationIssues;
exports.parseBoolean = parseBoolean;
exports.parseTrimmedString = parseTrimmedString;
class ConfigValidationError extends Error {
    constructor(issues) {
        super(formatConfigValidationIssues(issues));
        this.name = 'ConfigValidationError';
        this.issues = issues;
    }
}
exports.ConfigValidationError = ConfigValidationError;
function validateConfig(config) {
    const issues = [];
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
    if (config.LLM_STRUCTURED_OUTPUTS !== undefined &&
        !isValidBoolean(config.LLM_STRUCTURED_OUTPUTS)) {
        issues.push({
            field: 'LLM_STRUCTURED_OUTPUTS',
            message: 'LLM_STRUCTURED_OUTPUTS must be a boolean value (true/false, yes/no, 1/0).',
        });
    }
    return issues;
}
function isValidTimeout(value) {
    return Number.isInteger(value) && value >= 0;
}
function formatConfigValidationIssues(issues) {
    return issues.map((issue) => `${issue.field}: ${issue.message}`).join('\n');
}
function parseBoolean(value) {
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
function isValidBoolean(value) {
    return typeof value === 'boolean';
}
function parseTrimmedString(value) {
    if (value === undefined) {
        return undefined;
    }
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
}
//# sourceMappingURL=schema.js.map