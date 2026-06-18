/**
 * Provider errors for over-review.
 * @packageDocumentation
 */
export type ProviderErrorCategory = 'configuration' | 'authentication' | 'timeout' | 'transient' | 'schema_validation' | 'unsupported_model';
export declare class ProviderError extends Error {
    readonly category: ProviderErrorCategory;
    readonly provider: string;
    readonly model: string;
    readonly cause?: unknown;
    constructor(message: string, options: {
        category: ProviderErrorCategory;
        provider: string;
        model: string;
        cause?: unknown;
    });
}
export declare class ConfigurationError extends ProviderError {
    constructor(message: string, options: {
        provider: string;
        model: string;
        cause?: unknown;
    });
}
export declare class AuthenticationError extends ProviderError {
    constructor(message: string, options: {
        provider: string;
        model: string;
        cause?: unknown;
    });
}
export declare class TimeoutError extends ProviderError {
    constructor(message: string, options: {
        provider: string;
        model: string;
        cause?: unknown;
    });
}
export declare class TransientError extends ProviderError {
    constructor(message: string, options: {
        provider: string;
        model: string;
        cause?: unknown;
    });
}
export declare class SchemaValidationError extends ProviderError {
    constructor(message: string, options: {
        provider: string;
        model: string;
        cause?: unknown;
    });
}
export declare class UnsupportedModelError extends ProviderError {
    constructor(message: string, options: {
        provider: string;
        model: string;
        cause?: unknown;
    });
}
export declare function normalizeProviderError(error: unknown, provider: string, model: string): ProviderError;
//# sourceMappingURL=errors.d.ts.map