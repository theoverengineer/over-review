"use strict";
/**
 * Event handlers for over-review
 * Handles specific event types and returns structured outcomes
 * @packageDocumentation
 * @deprecated Use the individual handler files: handle-pull-request.ts, handle-issue-comment.ts, handle-review-comment.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleReviewComment = exports.handleIssueComment = exports.handlePullRequest = void 0;
var handle_pull_request_1 = require("./handle-pull-request");
Object.defineProperty(exports, "handlePullRequest", { enumerable: true, get: function () { return handle_pull_request_1.handlePullRequest; } });
var handle_issue_comment_1 = require("./handle-issue-comment");
Object.defineProperty(exports, "handleIssueComment", { enumerable: true, get: function () { return handle_issue_comment_1.handleIssueComment; } });
var handle_review_comment_1 = require("./handle-review-comment");
Object.defineProperty(exports, "handleReviewComment", { enumerable: true, get: function () { return handle_review_comment_1.handleReviewComment; } });
//# sourceMappingURL=handlers.js.map