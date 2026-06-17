/**
 * Structured output schemas for the shipped prompt families.
 * @packageDocumentation
 */

import { z } from 'zod';

export const SummaryFileSchema = z.object({
  path: z.string().min(1),
  summary: z.string().min(1),
});

export const SummaryOutputSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  fileSummaries: z.array(SummaryFileSchema),
  changeTypes: z.array(z.enum(['feature', 'bugfix', 'refactor', 'docs', 'test', 'chore'])),
});

export const ReviewFindingSchema = z.object({
  path: z.string().min(1),
  line: z.number().int().positive(),
  startLine: z.number().int().positive().optional(),
  endLine: z.number().int().positive().optional(),
  replacementSnippet: z.string().optional(),
  severity: z.enum(['critical', 'non-critical']),
  title: z.string().min(1),
  body: z.string().min(1),
});

export const ReviewOutputSchema = z.object({
  reviewSummary: z.string().min(1),
  needsAttention: z.boolean(),
  findings: z.array(ReviewFindingSchema),
});

export const ThreadReplyOutputSchema = z.discriminatedUnion('action_requested', [
  z.object({
    action_requested: z.literal(true),
    content: z.string().trim().min(1),
  }),
  z.object({
    action_requested: z.literal(false),
    content: z.string().optional(),
  }),
]);

export type SummaryOutput = z.infer<typeof SummaryOutputSchema>;
export type ReviewOutput = z.infer<typeof ReviewOutputSchema>;
export type ThreadReplyOutput = z.infer<typeof ThreadReplyOutputSchema>;
