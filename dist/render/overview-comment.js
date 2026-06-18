"use strict";
/**
 * Overview comment renderers for over-review.
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderLoadingOverviewComment = renderLoadingOverviewComment;
exports.renderFinalOverviewComment = renderFinalOverviewComment;
exports.renderNoReviewableChangesComment = renderNoReviewableChangesComment;
const hidden_state_1 = require("./hidden-state");
function renderLoadingOverviewComment(input) {
    return (0, hidden_state_1.appendOverviewMetadata)([
        '## OverReview',
        '',
        `Status: Running a ${input.reviewMode} review.`,
        '',
        'This comment will be updated when the review completes.',
    ].join('\n'), input.payload);
}
function renderFinalOverviewComment(input) {
    const fileSummaries = input.summary.fileSummaries.length
        ? input.summary.fileSummaries.map((file) => `- \`${file.path}\`: ${file.summary}`)
        : ['- No file summaries returned.'];
    const body = [
        '## OverReview',
        '',
        `**${input.summary.title}**`,
        '',
        input.summary.description,
        '',
        `Needs attention: ${input.review.needsAttention ? 'yes' : 'no'}`,
        `Commits considered: ${input.commitCount}`,
        `Files reviewed: ${input.fileCount}`,
        `Actionable findings: ${input.actionableFindingCount}`,
        `Inline comments posted: ${input.inlineCommentCount}`,
        '',
        '### File Summaries',
        ...fileSummaries,
        '',
        `Change types: ${input.summary.changeTypes.join(', ') || 'none'}`,
    ].join('\n');
    return (0, hidden_state_1.appendOverviewMetadata)(body, input.payload);
}
function renderNoReviewableChangesComment(input) {
    return (0, hidden_state_1.appendOverviewMetadata)(['## OverReview', '', 'No reviewable diff hunks were found for this run.'].join('\n'), input.payload);
}
//# sourceMappingURL=overview-comment.js.map