import { describe, expect, it } from 'vitest';
import {
  ReviewOutputSchema,
  SummaryOutputSchema,
  ThreadReplyOutputSchema,
} from '../../../src/prompts/schemas';

describe('prompts/schemas', () => {
  describe('SummaryOutputSchema', () => {
    it('validates a correct summary output', () => {
      const validOutput = {
        title: 'Add provider abstraction',
        description: 'Adds the ai-sdk provider seam and structured inference.',
        fileSummaries: [
          {
            path: 'src/providers/ai-sdk-provider.ts',
            summary: 'Implements structured inference with fallback parsing.',
          },
        ],
        changeTypes: ['feature', 'refactor'],
      };

      expect(SummaryOutputSchema.parse(validOutput)).toEqual(validOutput);
    });

    it('rejects invalid output', () => {
      expect(() =>
        SummaryOutputSchema.parse({
          title: 'Add provider abstraction',
          description: 'Adds the ai-sdk provider seam and structured inference.',
          fileSummaries: 'not-an-array',
          changeTypes: ['unknown-type'],
        })
      ).toThrow();
    });
  });

  describe('ReviewOutputSchema', () => {
    it('validates a correct review output', () => {
      const validOutput = {
        reviewSummary: 'One actionable issue was found.',
        needsAttention: true,
        findings: [
          {
            path: 'src/main.ts',
            line: 42,
            severity: 'critical',
            title: 'Guard missing before property access',
            body: 'The new code dereferences `obj.property` without checking that `obj` exists.',
          },
        ],
      };

      expect(ReviewOutputSchema.parse(validOutput)).toEqual(validOutput);
    });

    it('validates a finding with line range and replacement snippet', () => {
      const validOutput = {
        reviewSummary: 'One actionable issue was found.',
        needsAttention: true,
        findings: [
          {
            path: 'src/main.ts',
            line: 42,
            startLine: 40,
            endLine: 45,
            replacementSnippet: '-const value = input;\n+const value = input?.trim() ?? "";',
            severity: 'critical',
            title: 'Guard missing before property access',
            body: 'The new code dereferences `obj.property` without checking that `obj` exists.',
          },
        ],
      };

      expect(ReviewOutputSchema.parse(validOutput)).toEqual(validOutput);
    });

    it('allows an empty finding list', () => {
      const validOutput = {
        reviewSummary: 'No actionable issues were found in the diff.',
        needsAttention: false,
        findings: [],
      };

      expect(ReviewOutputSchema.parse(validOutput)).toEqual(validOutput);
    });
  });

  describe('ThreadReplyOutputSchema', () => {
    it('validates a reply that requests action', () => {
      const validOutput = {
        action_requested: true,
        content:
          '@alice Good catch. The new branch skips the null guard and can throw on empty input.',
      };

      expect(ThreadReplyOutputSchema.parse(validOutput)).toEqual(validOutput);
    });

    it('validates a reply that does not request action', () => {
      const validOutput = {
        action_requested: false,
        content: '',
      };

      expect(ThreadReplyOutputSchema.parse(validOutput)).toEqual(validOutput);
    });

    it('rejects empty content when action is requested', () => {
      expect(() =>
        ThreadReplyOutputSchema.parse({
          action_requested: true,
          content: '   ',
        })
      ).toThrow();
    });
  });
});
