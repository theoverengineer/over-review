"use strict";
/**
 * Handle issue_comment events.
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseManualReviewCommand = parseManualReviewCommand;
exports.handleIssueComment = handleIssueComment;
const guards_1 = require("../runtime/guards");
function parseManualReviewCommand(commentBody) {
    const trimmed = commentBody.trim();
    const match = trimmed.match(/^\/(review|ai-review)(?:\s+(--full))?\s*$/i);
    if (!match) {
        return null;
    }
    return {
        command: `/${match[1].toLowerCase()}`,
        fullMode: Boolean(match[2]),
    };
}
function handleIssueComment(event, options = {}) {
    if (event.action !== 'created') {
        return {
            type: 'skip',
            reason: `Unsupported issue_comment action: ${event.action}`,
            prNumber: event.issue.number,
        };
    }
    if (!event.issue.pull_request) {
        return {
            type: 'skip',
            reason: 'Issue comment is not on a pull request',
            prNumber: event.issue.number,
        };
    }
    if ((0, guards_1.isBotComment)(event.comment?.user?.login)) {
        return {
            type: 'skip',
            reason: 'Bot comment ignored',
            prNumber: event.issue.number,
        };
    }
    const command = parseManualReviewCommand(event.comment?.body ?? '');
    if (!command) {
        return {
            type: 'skip',
            reason: 'Not a manual review command',
            prNumber: event.issue.number,
        };
    }
    const authorAssociation = event.comment?.author_association || event.issue.author_association || null;
    if (!(0, guards_1.isAuthorizedAssociation)(authorAssociation)) {
        return {
            type: 'unauthorized',
            reason: `Unauthorized manual review command: ${command.command}`,
            prNumber: event.issue.number,
            actor: event.sender?.login || undefined,
            command: command.command,
            fullMode: command.fullMode,
            eyesReaction: true,
        };
    }
    // Check if PR is from a fork using resolved identity
    if (options.resolvedPrIdentity?.isFork) {
        return {
            type: 'skip',
            reason: 'Fork PR silently skipped',
            prNumber: event.issue.number,
        };
    }
    return {
        type: 'review',
        reason: `${command.command}${command.fullMode ? ' --full' : ''}`,
        prNumber: event.issue.number,
        actor: event.sender?.login || undefined,
        command: command.command,
        fullMode: command.fullMode,
    };
}
//# sourceMappingURL=handle-issue-comment.js.map