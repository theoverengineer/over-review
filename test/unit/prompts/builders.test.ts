import { describe, expect, it } from 'vitest';

import { buildReviewPrompt } from '../../../src/prompts/review';
import { buildSummaryPrompt } from '../../../src/prompts/summary';
import { buildThreadReplyPrompt } from '../../../src/prompts/thread-reply';

describe('prompt builders', () => {
  it('includes exact summary response keys for plain JSON fallback', () => {
    const prompt = buildSummaryPrompt({
      title: 'feat: test',
      description: 'desc',
      fileDiffs: [],
    });

    expect(prompt).toContain('title, description, fileSummaries, changeTypes');
    expect(prompt).toContain('Do not use snake_case keys.');
  });

  it('includes exact review response keys and severity enum', () => {
    const prompt = buildReviewPrompt([]);

    expect(prompt).toContain('reviewSummary, needsAttention, findings');
    expect(prompt).toContain('severity must be either critical or non-critical.');
    expect(prompt).toContain('Do not nest the response under review');
  });

  it('includes exact thread reply response keys', () => {
    const prompt = buildThreadReplyPrompt({
      thread: {
        path: 'src/file.ts',
        line: 1,
        diffHunk: '@@ -1 +1 @@',
        replyToCommentId: 123,
        latestComment: { author: 'reviewer', body: 'Please fix this.' },
        comments: [{ author: 'reviewer', body: 'Please fix this.' }],
      },
    });

    expect(prompt).toContain('Use exactly these keys: action_requested and content.');
    expect(prompt).toContain('Do not use actionRequested.');
  });
});
