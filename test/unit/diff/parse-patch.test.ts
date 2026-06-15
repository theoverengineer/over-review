import { describe, expect, it } from 'vitest';

import { formatDiffsForPrompt } from '../../../src/diff/format-for-prompt';
import { normalizeFileDiffs } from '../../../src/diff/normalize-file-diffs';
import { parseDiffPatch } from '../../../src/diff/parse-patch';

describe('diff/parse-patch', () => {
  it('parses reviewable lines from a patch hunk', () => {
    const hunks = parseDiffPatch(`@@ -1,2 +1,3 @@\n line1\n+line2\n line3`);

    expect(hunks).toHaveLength(1);
    expect(hunks[0].startLine).toBe(1);
    expect(hunks[0].endLine).toBe(3);
    expect(hunks[0].reviewableLines).toEqual([2]);
  });

  it('returns no hunks when the patch is missing', () => {
    expect(parseDiffPatch(undefined)).toEqual([]);
  });

  it('formats normalized diffs into the prompt contract', () => {
    const fileDiffs = normalizeFileDiffs([
      {
        filename: 'src/example.ts',
        status: 'modified',
        patch: `@@ -10,2 +10,3 @@\n const value = getValue();\n+if (!value) throw new Error('missing');\n return value;`,
      },
    ]);

    const formatted = formatDiffsForPrompt(fileDiffs);

    expect(formatted).toContain("## File modified: 'src/example.ts'");
    expect(formatted).toContain('__new hunk__');
    expect(formatted).toContain("11 +if (!value) throw new Error('missing');");
    expect(formatted).toContain('__old hunk__');
  });
});
