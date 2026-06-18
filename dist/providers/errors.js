"use strict";
/**
 * Provider errors for over-review.
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnsupportedModelError = exports.SchemaValidationError = exports.TransientError = exports.TimeoutError = exports.AuthenticationError = exports.ConfigurationError = exports.ProviderError = void 0;
exports.normalizeProviderError = normalizeProviderError;
const ai_1 = require("ai");
class ProviderError extends Error {
    constructor(message, options) {
        super(`${message} [provider=${options.provider}, model=${options.model}]`);
        this.name = 'ProviderError';
        this.category = options.category;
        this.provider = options.provider;
        this.model = options.model;
        this.cause = options.cause;
    }
}
exports.ProviderError = ProviderError;
class ConfigurationError extends ProviderError {
    constructor(message, options) {
        super(message, {
            ...options,
            category: 'configuration',
        });
        this.name = 'ConfigurationError';
    }
}
exports.ConfigurationError = ConfigurationError;
class AuthenticationError extends ProviderError {
    constructor(message, options) {
        super(message, {
            ...options,
            category: 'authentication',
        });
        this.name = 'AuthenticationError';
    }
}
exports.AuthenticationError = AuthenticationError;
class TimeoutError extends ProviderError {
    constructor(message, options) {
        super(message, {
            ...options,
            category: 'timeout',
        });
        this.name = 'TimeoutError';
    }
}
exports.TimeoutError = TimeoutError;
class TransientError extends ProviderError {
    constructor(message, options) {
        super(message, {
            ...options,
            category: 'transient',
        });
        this.name = 'TransientError';
    }
}
exports.TransientError = TransientError;
class SchemaValidationError extends ProviderError {
    constructor(message, options) {
        super(message, {
            ...options,
            category: 'schema_validation',
        });
        this.name = 'SchemaValidationError';
    }
}
exports.SchemaValidationError = SchemaValidationError;
class UnsupportedModelError extends ProviderError {
    constructor(message, options) {
        super(message, {
            ...options,
            category: 'unsupported_model',
        });
        this.name = 'UnsupportedModelError';
    }
}
exports.UnsupportedModelError = UnsupportedModelError;
function normalizeProviderError(error, provider, model) {
    if (error instanceof ProviderError) {
        return error;
    }
    if (ai_1.LoadAPIKeyError.isInstance(error)) {
        return new ConfigurationError(error.message, { provider, model, cause: error });
    }
    if (ai_1.NoSuchModelError.isInstance(error)) {
        return new UnsupportedModelError(error.message, { provider, model, cause: error });
    }
    if (ai_1.NoObjectGeneratedError.isInstance(error) ||
        ai_1.JSONParseError.isInstance(error) ||
        ai_1.TypeValidationError.isInstance(error)) {
        return new SchemaValidationError(error.message, { provider, model, cause: error });
    }
    if (ai_1.APICallError.isInstance(error)) {
        if (error.statusCode === 401 || error.statusCode === 403) {
            return new AuthenticationError(error.message, { provider, model, cause: error });
        }
        if (error.statusCode === 408) {
            return new TimeoutError(error.message, { provider, model, cause: error });
        }
        if (error.isRetryable) {
            return new TransientError(error.message, { provider, model, cause: error });
        }
        if (looksLikeUnsupportedModelMessage(error.message)) {
            return new UnsupportedModelError(error.message, { provider, model, cause: error });
        }
        return new TransientError(error.message, { provider, model, cause: error });
    }
    if (error instanceof Error) {
        if (looksLikeConfigurationMessage(error.message)) {
            return new ConfigurationError(error.message, { provider, model, cause: error });
        }
        if (looksLikeAuthenticationMessage(error.message)) {
            return new AuthenticationError(error.message, { provider, model, cause: error });
        }
        if (looksLikeUnsupportedModelMessage(error.message)) {
            return new UnsupportedModelError(error.message, { provider, model, cause: error });
        }
        if (looksLikeTimeoutMessage(error.message, error.name)) {
            return new TimeoutError(error.message, { provider, model, cause: error });
        }
        if (looksLikeSchemaValidationMessage(error.message)) {
            return new SchemaValidationError(error.message, { provider, model, cause: error });
        }
        if (looksLikeTransientMessage(error.message)) {
            return new TransientError(error.message, { provider, model, cause: error });
        }
        return new TransientError(error.message, { provider, model, cause: error });
    }
    return new TransientError(String(error), {
        provider,
        model,
    });
}
function looksLikeConfigurationMessage(message) {
    const normalized = message.toLowerCase();
    return (normalized.includes('invalid configuration') ||
        normalized.includes('missing required') ||
        normalized.includes('required field') ||
        normalized.includes('invalid config') ||
        normalized.includes('invalid base url') ||
        normalized.includes('invalid url'));
}
function looksLikeAuthenticationMessage(message) {
    const normalized = message.toLowerCase();
    return (normalized.includes('unauthorized') ||
        normalized.includes('authentication') ||
        normalized.includes('invalid api key') ||
        normalized.includes('invalid key') ||
        normalized.includes('permission denied') ||
        normalized.includes('forbidden') ||
        normalized.includes('401') ||
        normalized.includes('403'));
}
function looksLikeUnsupportedModelMessage(message) {
    const normalized = message.toLowerCase();
    return (normalized.includes('model not found') ||
        normalized.includes('model does not exist') ||
        normalized.includes('unknown model') ||
        normalized.includes('invalid model') ||
        normalized.includes('unsupported model') ||
        normalized.includes('no such languagemodel'));
}
function looksLikeTimeoutMessage(message, name) {
    const normalized = message.toLowerCase();
    return (name === 'AbortError' ||
        normalized.includes('timeout') ||
        normalized.includes('timed out') ||
        normalized.includes('aborted') ||
        normalized.includes('canceled'));
}
function looksLikeSchemaValidationMessage(message) {
    const normalized = message.toLowerCase();
    return (normalized.includes('schema') ||
        normalized.includes('validation') ||
        normalized.includes('invalid output') ||
        normalized.includes('invalid response') ||
        normalized.includes('invalid json'));
}
function looksLikeTransientMessage(message) {
    const normalized = message.toLowerCase();
    return (normalized.includes('network') ||
        normalized.includes('connection') ||
        normalized.includes('socket') ||
        normalized.includes('econn') ||
        normalized.includes('enotfound') ||
        normalized.includes('erefused') ||
        normalized.includes('429') ||
        normalized.includes('502') ||
        normalized.includes('503') ||
        normalized.includes('504') ||
        normalized.includes('rate limit'));
}
//# sourceMappingURL=errors.js.map