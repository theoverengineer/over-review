/**
 * Inline comment renderer for over-review.
 * @packageDocumentation
 */

import type { AIComment } from '../contracts/review';
import { appendInlineSignature } from './hidden-state';

export function renderInlineComment(comment: AIComment): string {
  return appendInlineSignature(`**${comment.title}**\n\n${comment.body}`);
}
