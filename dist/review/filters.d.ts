/**
 * Review filters for over-review.
 * @packageDocumentation
 */
import type { AIComment, FileDiff } from '../contracts/review';
/**
 * Filter findings to only include actionable comments.
 * @param findings - Array of findings to filter
 * @returns Filtered array of actionable findings
 */
export declare function filterActionableOnly(findings: AIComment[]): AIComment[];
/**
 * Filter out findings that don't have valid line numbers.
 * @param findings - Array of findings to filter
 * @param fileDiffs - Array of file diffs for validation
 * @returns Filtered array of findings with valid anchors
 */
export declare function filterDiffScoped(findings: AIComment[], fileDiffs: FileDiff[]): AIComment[];
/**
 * Deduplicate findings by path and line.
 * @param findings - Array of findings to deduplicate
 * @returns Deduplicated array of findings
 */
export declare function deduplicateFindings(findings: AIComment[]): AIComment[];
/**
 * Filter findings by severity for inline posting.
 * @param findings - Array of findings
 * @returns Array of findings suitable for inline posting
 */
export declare function filterForInlinePosting(findings: AIComment[]): AIComment[];
/**
 * Main filter pipeline for review findings.
 * @param findings - Raw findings from the model
 * @param fileDiffs - Array of file diffs for validation
 * @returns Filtered array of actionable findings
 */
export declare function filterFindings(findings: AIComment[], fileDiffs: FileDiff[]): AIComment[];
//# sourceMappingURL=filters.d.ts.map