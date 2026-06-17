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

  it('renders replacement snippet when present', () => {
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
});
