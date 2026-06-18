"use strict";
/**
 * PR title regeneration helpers.
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldRegenerateTitle = shouldRegenerateTitle;
function shouldRegenerateTitle(currentTitle) {
    return currentTitle.toLowerCase().includes('@overreview');
}
//# sourceMappingURL=title-regeneration.js.map