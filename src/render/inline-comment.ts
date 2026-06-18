/**
 * Inline comment renderer for over-review.
 * @packageDocumentation
 */

import type { AIComment } from '../contracts/review';
import { appendInlineSignature } from './hidden-state';

export function renderInlineComment(comment: AIComment): string {
  let content = `**${comment.title}**\n\n${comment.body}`;

  if (comment.replacementSnippet) {
    // Use GitHub suggestion block for ranged findings with replacement snippets
    if (comment.startLine !== undefined && comment.endLine !== undefined) {
      content += `\n\nSuggested replacement:\n\n\`\`\`suggestion\n${comment.replacementSnippet}\n\`\`\``;
    } else {
      // Fallback to plain code block for single-line or non-ranged findings
      content += `\n\nSuggested replacement:\n\n\`\`\`\n${comment.replacementSnippet}\n\`\`\``;
    }
  }

  return appendInlineSignature(content);
}
