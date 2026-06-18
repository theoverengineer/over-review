"use strict";
/**
 * Provider registry and resolution for over-review.
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
exports.createProvider = createProvider;
exports.resolveProviderPath = resolveProviderPath;
const ai_sdk_provider_1 = require("./ai-sdk-provider");
const errors_1 = require("./errors");
function createProvider(config) {
    if (config.provider !== 'ai-sdk') {
        throw new errors_1.ConfigurationError(`Provider '${config.provider}' is not supported in V1. Only 'ai-sdk' is supported.`, { provider: config.provider, model: 'unknown' });
    }
    if (!config.model.trim()) {
        throw new errors_1.ConfigurationError('LLM model is required.', {
            provider: config.provider,
            model: config.model,
        });
    }
    if (!config.apiKey.trim()) {
        throw new errors_1.ConfigurationError('LLM API key is required.', {
            provider: config.provider,
            model: config.model,
        });
    }
    if (config.baseUrl !== undefined) {
        try {
            new URL(config.baseUrl);
        }
        catch {
            throw new errors_1.ConfigurationError(`Invalid baseUrl: '${config.baseUrl}'. Must be a valid URL.`, {
                provider: config.provider,
                model: config.model,
            });
        }
    }
    return new ai_sdk_provider_1.AISDKProvider({
        model: config.model,
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
        structuredOutputs: config.structuredOutputs,
    });
}
function resolveProviderPath() {
    return 'ai-sdk';
}
__exportStar(require("./ai-sdk-provider"), exports);
__exportStar(require("./errors"), exports);
//# sourceMappingURL=index.js.map