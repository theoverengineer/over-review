"use strict";
/**
 * Handle pull_request events
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handlePullRequest = handlePullRequest;
/**
 * Handle pull_request event for automatic review.
 */
function handlePullRequest(event) {
    const supportedActions = new Set(['opened', 'synchronize']);
    if (!supportedActions.has(event.action)) {
        return {
            type: 'skip',
            reason: `Unsupported pull_request action: ${event.action}`,
            prNumber: event.pull_request.number,
        };
    }
    return {
        type: 'review',
        reason: 'Automatic review from pull_request event',
        prNumber: event.pull_request.number,
        actor: event.sender?.login || undefined,
    };
}
//# sourceMappingURL=handle-pull-request.js.map