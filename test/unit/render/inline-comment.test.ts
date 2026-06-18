import { describe, expect, it } from 'vitest';

import { renderInlineComment } from '../../../src/render/inline-comment';

describe('render/inline-comment', () => {
  it('renders the title, body, and signature', () => {
    const comment = renderInlineComment({
      path: 'src/file.ts',
      line: 10,
      severity: 'critical',
      title: 'Null check missing',
      body: 'This access can throw when the value is undefined.',
    });

    expect(comment).toContain('**Null check missing**');
    expect(comment).toContain('This access can throw when the value is undefined.');
    expect(comment).toContain('<!-- overreview:inline -->');
  });

  it('renders replacement snippet when present (single-line, no range)', () => {
    const comment = renderInlineComment({
      path: 'src/file.ts',
      line: 10,
      severity: 'critical',
      title: 'Null check missing',
      body: 'This access can throw when the value is undefined.',
      replacementSnippet: '-const value = input;\n+const value = input?.trim() ?? "";',
    });

    expect(comment).toContain('**Null check missing**');
    expect(comment).toContain('This access can throw when the value is undefined.');
    expect(comment).toContain('Suggested replacement:');
    expect(comment).toContain('```');
    expect(comment).toContain('-const value = input;');
    expect(comment).toContain('+const value = input?.trim() ?? "";');
    expect(comment).toContain('<!-- overreview:inline -->');
  });

  it('renders suggestion block for ranged findings with replacement snippet', () => {
    const comment = renderInlineComment({
      path: 'src/file.ts',
      line: 10,
      startLine: 8,
      endLine: 12,
      severity: 'critical',
      title: 'Missing input validation',
      body: 'The function should validate input before processing.',
      replacementSnippet:
        'if (input == null) {\n  throw new Error("Input is required");\n}\n\nconst value = input.trim();',
    });

    expect(comment).toContain('**Missing input validation**');
    expect(comment).toContain('The function should validate input before processing.');
    expect(comment).toContain('Suggested replacement:');
    expect(comment).toContain('```suggestion');
    expect(comment).toContain('if (input == null) {');
    expect(comment).toContain('throw new Error("Input is required");');
    expect(comment).toContain('const value = input.trim();');
    expect(comment).toContain('<!-- overreview:inline -->');
  });

  it('uses plain code fence for ranged findings without replacement snippet', () => {
    const comment = renderInlineComment({
      path: 'src/file.ts',
      line: 10,
      startLine: 8,
      endLine: 12,
      severity: 'critical',
      title: 'Missing input validation',
      body: 'The function should validate input before processing.',
    });

    expect(comment).toContain('**Missing input validation**');
    expect(comment).toContain('The function should validate input before processing.');
    expect(comment).not.toContain('Suggested replacement:');
    expect(comment).not.toContain('```suggestion');
  });
});
