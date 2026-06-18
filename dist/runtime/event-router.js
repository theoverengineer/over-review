"use strict";
/**
 * Event router for over-review.
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSupportedEvent = isSupportedEvent;
exports.getPrNumberFromEvent = getPrNumberFromEvent;
exports.routeEvent = routeEvent;
const handle_issue_comment_1 = require("../events/handle-issue-comment");
const handle_pull_request_1 = require("../events/handle-pull-request");
const handle_review_comment_1 = require("../events/handle-review-comment");
const client_1 = require("../github/client");
const pull_requests_1 = require("../github/pull-requests");
const guards_1 = require("./guards");
function isSupportedEvent(eventName) {
    return ['pull_request', 'issue_comment', 'pull_request_review_comment'].includes(eventName);
}
function getPrNumberFromEvent(event) {
    if ('pull_request' in event) {
        return event.pull_request.number;
    }
    if ('issue' in event) {
        return event.issue.number;
    }
    return undefined;
}
/**
 * Route a GitHub event to the appropriate handler.
 * For issue_comment events that require PR identity lookup, this will
 * perform an API call to determine if the PR is from a fork.
 * @param event - GitHub event
 * @param eventName - Name of the event
 * @param client - Optional GitHub client for API calls
 * @returns Route result with outcome
 */
async function routeEvent(event, eventName, client) {
    if (!isSupportedEvent(eventName)) {
        return {
            handled: false,
            outcome: {
                type: 'unsupported',
                reason: `Unsupported event type: ${eventName}`,
            },
        };
    }
    const actor = event.sender?.login ?? ('comment' in event ? (event.comment?.user?.login ?? null) : null);
    const commentBody = 'comment' in event ? event.comment?.body : undefined;
    const guardDecision = (0, guards_1.runTrustBoundaryGuards)(event, actor, commentBody);
    if (guardDecision.skipReason === 'fork-pr') {
        return {
            handled: true,
            outcome: {
                type: 'skip',
                reason: 'Fork PR silently skipped',
                prNumber: getPrNumberFromEvent(event),
                // resolvedPrIdentity is not included in the outcome for fork PRs
            },
        };
    }
    if (!guardDecision.allow) {
        return {
            handled: true,
            outcome: {
                type: 'skip',
                reason: guardDecision.skipReason ?? 'Skipped by guard',
                prNumber: getPrNumberFromEvent(event),
            },
        };
    }
    if (eventName === 'issue_comment') {
        const issueCommentEvent = event;
        const initialOutcome = (0, handle_issue_comment_1.handleIssueComment)(issueCommentEvent);
        if (initialOutcome.type !== 'review') {
            return {
                handled: true,
                outcome: initialOutcome,
            };
        }
        if (guardDecision.requiresPullRequestLookup) {
            const pullRequestUrl = issueCommentEvent.issue.pull_request?.url;
            if (!pullRequestUrl) {
                return {
                    handled: true,
                    outcome: {
                        type: 'skip',
                        reason: 'Pull request identity lookup unavailable',
                        prNumber: issueCommentEvent.issue.number,
                    },
                };
            }
            const resolvedPrIdentity = await (0, pull_requests_1.fetchPullRequestIdentity)(client || new client_1.GitHubClient(), pullRequestUrl, issueCommentEvent.repository);
            if (!resolvedPrIdentity) {
                return {
                    handled: true,
                    outcome: {
                        type: 'skip',
                        reason: 'Pull request identity lookup failed',
                        prNumber: issueCommentEvent.issue.number,
                    },
                };
            }
            if (resolvedPrIdentity.isFork) {
                return {
                    handled: true,
                    outcome: {
                        type: 'skip',
                        reason: 'Fork PR silently skipped',
                        prNumber: issueCommentEvent.issue.number,
                    },
                };
            }
            return {
                handled: true,
                outcome: (0, handle_issue_comment_1.handleIssueComment)(issueCommentEvent, {
                    resolvedPrIdentity,
                }),
            };
        }
        return {
            handled: true,
            outcome: initialOutcome,
        };
    }
    switch (eventName) {
        case 'pull_request':
            return {
                handled: true,
                outcome: (0, handle_pull_request_1.handlePullRequest)(event),
            };
        case 'pull_request_review_comment':
            return {
                handled: true,
                outcome: (0, handle_review_comment_1.handleReviewComment)(event),
            };
    }
}
//# sourceMappingURL=event-router.js.map