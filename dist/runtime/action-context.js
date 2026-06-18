"use strict";
/**
 * Runtime context for GitHub Actions execution.
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createActionContext = createActionContext;
function createActionContext(eventName, event) {
    return {
        runtime: 'action',
        eventName,
        event,
        repo: event.repository.full_name,
        prNumber: getPullRequestNumber(event, eventName),
        actor: getActor(event),
        authorAssociation: getAuthorAssociation(event, eventName),
        commentBody: getCommentBody(event, eventName),
        isDryRun: false,
    };
}
function getPullRequestNumber(event, eventName) {
    switch (eventName) {
        case 'pull_request':
        case 'pull_request_review_comment':
            return 'pull_request' in event ? event.pull_request.number : undefined;
        case 'issue_comment':
            return 'issue' in event ? event.issue.number : undefined;
        default:
            return 'pull_request' in event ? event.pull_request.number : undefined;
    }
}
function getActor(event) {
    return event.sender?.login ?? ('comment' in event ? (event.comment?.user?.login ?? null) : null);
}
function getAuthorAssociation(event, eventName) {
    switch (eventName) {
        case 'issue_comment':
            return 'issue' in event
                ? (event.comment?.author_association ?? event.issue.author_association ?? null)
                : null;
        case 'pull_request_review_comment':
            return 'comment' in event ? (event.comment?.author_association ?? null) : null;
        default:
            return null;
    }
}
function getCommentBody(event, eventName) {
    if (eventName === 'issue_comment' || eventName === 'pull_request_review_comment') {
        return 'comment' in event ? event.comment?.body : undefined;
    }
    return undefined;
}
//# sourceMappingURL=action-context.js.map