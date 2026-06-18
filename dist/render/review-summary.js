"use strict";
/**
 * Review summary renderer for over-review.
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderReviewSummary = renderReviewSummary;
function renderReviewSummary(input) {
    const nonInlineFindings = input.actionableFindings.filter((finding) => !input.inlineFindings.some((inlineFinding) => inlineFinding.path === finding.path && inlineFinding.line === finding.line));
    const lines = [
        '## OverReview Summary',
        '',
        input.review.reviewSummary,
        '',
        `Needs attention: ${input.review.needsAttention ? 'yes' : 'no'}`,
        `Commits considered: ${input.commitCount}`,
        `Files processed: ${input.fileCount}`,
        `Actionable findings: ${input.actionableFindings.length}`,
        `Inline comments posted: ${input.inlineFindings.length}`,
        `Skipped findings: ${input.skippedFindingCount}`,
    ];
    if (nonInlineFindings.length > 0) {
        lines.push('', '### Additional Findings');
        for (const finding of nonInlineFindings) {
            lines.push(`- [${finding.severity}] \`${finding.path}:${renderLineRange(finding)}\` ${finding.title}: ${finding.body}`);
            if (finding.replacementSnippet) {
                lines.push('', 'Suggested replacement:', '```', finding.replacementSnippet, '```');
            }
        }
    }
    return lines.join('\n');
}
function renderLineRange(finding) {
    if (finding.startLine !== undefined && finding.endLine !== undefined) {
        if (finding.startLine === finding.endLine) {
            return `${finding.startLine}`;
        }
        return `${finding.startLine}-${finding.endLine}`;
    }
    return `${finding.line}`;
}
//# sourceMappingURL=review-summary.js.map