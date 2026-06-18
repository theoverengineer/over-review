"use strict";
/**
 * Review filters for over-review.
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterActionableOnly = filterActionableOnly;
exports.filterDiffScoped = filterDiffScoped;
exports.deduplicateFindings = deduplicateFindings;
exports.filterForInlinePosting = filterForInlinePosting;
exports.filterFindings = filterFindings;
const normalize_file_diffs_1 = require("../diff/normalize-file-diffs");
/**
 * Filter findings to only include actionable comments.
 * @param findings - Array of findings to filter
 * @returns Filtered array of actionable findings
 */
function filterActionableOnly(findings) {
    return findings.filter((finding) => {
        const bodyLower = finding.body.toLowerCase();
        const titleLower = finding.title.toLowerCase();
        // Skip style-only comments
        const styleKeywords = [
            'style',
            'format',
            'lint',
            'prettier',
            'eslint',
            'code style',
            'formatting',
            'naming convention',
            'indentation',
            'spacing',
        ];
        for (const keyword of styleKeywords) {
            if (bodyLower.includes(keyword) || titleLower.includes(keyword)) {
                return false;
            }
        }
        // Skip comments that ask for comments/docs by default
        const docKeywords = [
            'add comment',
            'add documentation',
            'add doc',
            'document this',
            'should have comment',
            'missing comment',
        ];
        for (const keyword of docKeywords) {
            if (bodyLower.includes(keyword) || titleLower.includes(keyword)) {
                return false;
            }
        }
        // Skip speculative comments without evidence
        const speculativeKeywords = ['might want to', 'could consider', 'perhaps', 'in my opinion'];
        for (const keyword of speculativeKeywords) {
            if (bodyLower.includes(keyword)) {
                return false;
            }
        }
        // Skip repository-wide assumptions
        const assumptionKeywords = [
            'in this repository',
            'across the codebase',
            'in the project',
            'overall',
            'generally',
            'throughout',
        ];
        for (const keyword of assumptionKeywords) {
            if (bodyLower.includes(keyword)) {
                return false;
            }
        }
        return true;
    });
}
/**
 * Filter out findings that don't have valid line numbers.
 * @param findings - Array of findings to filter
 * @param fileDiffs - Array of file diffs for validation
 * @returns Filtered array of findings with valid anchors
 */
function filterDiffScoped(findings, fileDiffs) {
    const fileDiffsByPath = new Map(fileDiffs.map((fileDiff) => [fileDiff.path, fileDiff]));
    return findings.filter((finding) => {
        const fileDiff = fileDiffsByPath.get(finding.path);
        if (!fileDiff) {
            return false;
        }
        if (finding.line <= 0) {
            return false;
        }
        return (0, normalize_file_diffs_1.hasReviewableLine)(fileDiff, finding.line);
    });
}
/**
 * Deduplicate findings by path and line.
 * @param findings - Array of findings to deduplicate
 * @returns Deduplicated array of findings
 */
function deduplicateFindings(findings) {
    const seen = new Set();
    const result = [];
    for (const finding of findings) {
        const key = `${finding.path}:${finding.line}:${finding.title.trim().toLowerCase()}`;
        if (!seen.has(key)) {
            seen.add(key);
            result.push(finding);
        }
    }
    return result;
}
/**
 * Filter findings by severity for inline posting.
 * @param findings - Array of findings
 * @returns Array of findings suitable for inline posting
 */
function filterForInlinePosting(findings) {
    return findings.filter((finding) => {
        if (finding.severity === 'critical') {
            return true;
        }
        const bodyLower = finding.body.toLowerCase();
        const titleLower = finding.title.toLowerCase();
        // Check for typos
        const typoKeywords = ['typo', 'spelling', 'grammar', 'wording', 'phrase'];
        for (const keyword of typoKeywords) {
            if (bodyLower.includes(keyword) || titleLower.includes(keyword)) {
                return true;
            }
        }
        return false;
    });
}
/**
 * Main filter pipeline for review findings.
 * @param findings - Raw findings from the model
 * @param fileDiffs - Array of file diffs for validation
 * @returns Filtered array of actionable findings
 */
function filterFindings(findings, fileDiffs) {
    let result = filterActionableOnly(findings);
    result = filterDiffScoped(result, fileDiffs);
    result = deduplicateFindings(result);
    return result;
}
//# sourceMappingURL=filters.js.map