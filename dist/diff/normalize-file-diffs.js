"use strict";
/**
 * Diff normalization for over-review.
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeFileDiffs = normalizeFileDiffs;
exports.filterReviewableFileDiffs = filterReviewableFileDiffs;
exports.hasReviewableLine = hasReviewableLine;
const parse_patch_1 = require("./parse-patch");
const REVIEWABLE_STATUSES = new Set([
    'added',
    'modified',
    'renamed',
    'copied',
]);
function normalizeFileDiffs(files) {
    return files.map((file) => ({
        path: file.filename,
        status: normalizeFileStatus(file.status),
        previousFilename: file.previous_filename,
        patch: file.patch,
        hunks: (0, parse_patch_1.parseDiffPatch)(file.patch),
    }));
}
function filterReviewableFileDiffs(fileDiffs) {
    return fileDiffs.filter((fileDiff) => REVIEWABLE_STATUSES.has(fileDiff.status) && fileDiff.hunks.length > 0);
}
function hasReviewableLine(fileDiff, line) {
    return fileDiff.hunks.some((hunk) => hunk.reviewableLines.includes(line));
}
function normalizeFileStatus(status) {
    switch (status) {
        case 'added':
        case 'modified':
        case 'removed':
        case 'renamed':
        case 'copied':
            return status;
        default:
            return 'modified';
    }
}
//# sourceMappingURL=normalize-file-diffs.js.map