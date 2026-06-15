/**
 * Diff parsing utilities for over-review.
 * @packageDocumentation
 */

import type { Hunk } from '../contracts/review';

const HUNK_HEADER_PATTERN = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;

export function parseDiffPatch(patch: string | undefined): Hunk[] {
  if (!patch) {
    return [];
  }

  const lines = patch.split(/\r?\n/);
  const hunks: Hunk[] = [];
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
    const reviewableLines: number[] = [];
    let newLine = newStartLine;
    index += 1;

    while (index < lines.length && !HUNK_HEADER_PATTERN.test(lines[index])) {
      const line = lines[index];
      diffLines.push(line);

      if (line.startsWith('+') && !line.startsWith('+++')) {
        reviewableLines.push(newLine);
        newLine += 1;
      } else if (!line.startsWith('-') || line.startsWith('---')) {
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
