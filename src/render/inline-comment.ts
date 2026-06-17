/**
 * Inline comment renderer for over-review.
 * @packageDocumentation
 */

import type { AIComment } from '../contracts/review';
import { appendInlineSignature } from './hidden-state';

export function renderInlineComment(comment: AIComment): string {
  let content = `**${comment.title}**\n\n${comment.body}`;

  if (comment.replacementSnippet) {
    content += `\n\nSuggested replacement:\n\n\`\`\`\n${comment.replacementSnippet}\n\`\`\``;
  }

  return appendInlineSignature(content);
}
