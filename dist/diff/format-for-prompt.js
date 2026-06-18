"use strict";
/**
 * Diff formatting for prompt input in over-review.
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDiffsForPrompt = formatDiffsForPrompt;
exports.formatFileDiffForPrompt = formatFileDiffForPrompt;
exports.formatHunkForPrompt = formatHunkForPrompt;
function formatDiffsForPrompt(fileDiffs) {
    return fileDiffs.map(formatFileDiffForPrompt).join('\n\n').trim();
}
function formatFileDiffForPrompt(fileDiff) {
    const header = fileDiff.previousFilename
        ? `## File ${fileDiff.status}: '${fileDiff.path}' (from '${fileDiff.previousFilename}')`
        : `## File ${fileDiff.status}: '${fileDiff.path}'`;
    return [header, '', ...fileDiff.hunks.map(formatHunkForPrompt)].join('\n').trim();
}
function formatHunkForPrompt(hunk) {
    const { newHunkLines, oldHunkLines } = splitHunkLines(hunk);
    const sections = [
        hunk.header,
        '__new hunk__',
        ...newHunkLines,
        '',
        '__old hunk__',
        ...oldHunkLines,
    ];
    for (const thread of hunk.commentThreads) {
        sections.push('');
        sections.push('__existing_comment_thread__');
        for (const comment of thread.comments) {
            sections.push(`@${comment.author}: ${comment.body}`);
        }
    }
    return sections.join('\n');
}
function splitHunkLines(hunk) {
    const newHunkLines = [];
    const oldHunkLines = [];
    const diffLines = hunk.diff.split(/\r?\n/).slice(1);
    const headerMatch = hunk.header.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
    let newLine = headerMatch ? Number.parseInt(headerMatch[3], 10) : 1;
    for (const line of diffLines) {
        if (line.startsWith('+') && !line.startsWith('+++')) {
            newHunkLines.push(`${newLine} ${line}`);
            newLine += 1;
            continue;
        }
        if (line.startsWith('-') && !line.startsWith('---')) {
            oldHunkLines.push(line);
            continue;
        }
        if (line.startsWith('\\')) {
            continue;
        }
        newHunkLines.push(`${newLine} ${line}`);
        oldHunkLines.push(line);
        newLine += 1;
    }
    return {
        newHunkLines,
        oldHunkLines,
    };
}
//# sourceMappingURL=format-for-prompt.js.map