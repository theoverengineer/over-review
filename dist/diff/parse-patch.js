"use strict";
/**
 * Diff parsing utilities for over-review.
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseDiffPatch = parseDiffPatch;
const HUNK_HEADER_PATTERN = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;
function parseDiffPatch(patch) {
    if (!patch) {
        return [];
    }
    const lines = patch.split(/\r?\n/);
    const hunks = [];
    let index = 0;
    while (index < lines.length) {
        const header = lines[index];
        const match = header.match(HUNK_HEADER_PATTERN);
        if (!match) {
            index += 1;
            continue;
        }
        const newStartLine = Number.parseInt(match[3], 10);
        const diffLines = [header];
        const reviewableLines = [];
        let newLine = newStartLine;
        index += 1;
        while (index < lines.length && !HUNK_HEADER_PATTERN.test(lines[index])) {
            const line = lines[index];
            diffLines.push(line);
            if (line.startsWith('+') && !line.startsWith('+++')) {
                reviewableLines.push(newLine);
                newLine += 1;
            }
            else if (!line.startsWith('-') || line.startsWith('---')) {
                if (!line.startsWith('\\')) {
                    newLine += 1;
                }
            }
            index += 1;
        }
        hunks.push({
            header,
            startLine: newStartLine,
            endLine: Math.max(newStartLine, newLine - 1),
            diff: diffLines.join('\n'),
            reviewableLines,
            commentThreads: [],
        });
    }
    return hunks;
}
//# sourceMappingURL=parse-patch.js.map