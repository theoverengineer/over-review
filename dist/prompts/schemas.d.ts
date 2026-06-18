/**
 * Structured output schemas for the shipped prompt families.
 * @packageDocumentation
 */
import { z } from 'zod';
export declare const SummaryFileSchema: z.ZodObject<{
    path: z.ZodString;
    summary: z.ZodString;
}, z.core.$strip>;
export declare const SummaryOutputSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodString;
    fileSummaries: z.ZodArray<z.ZodObject<{
        path: z.ZodString;
        summary: z.ZodString;
    }, z.core.$strip>>;
    changeTypes: z.ZodArray<z.ZodEnum<{
        feature: "feature";
        bugfix: "bugfix";
        refactor: "refactor";
        docs: "docs";
        test: "test";
        chore: "chore";
    }>>;
}, z.core.$strip>;
export declare const ReviewFindingSchema: z.ZodObject<{
    path: z.ZodString;
    line: z.ZodNumber;
    startLine: z.ZodOptional<z.ZodNumber>;
    endLine: z.ZodOptional<z.ZodNumber>;
    replacementSnippet: z.ZodOptional<z.ZodString>;
    severity: z.ZodEnum<{
        critical: "critical";
        "non-critical": "non-critical";
    }>;
    title: z.ZodString;
    body: z.ZodString;
}, z.core.$strip>;
export declare const ReviewOutputSchema: z.ZodObject<{
    reviewSummary: z.ZodString;
    needsAttention: z.ZodBoolean;
    findings: z.ZodArray<z.ZodObject<{
        path: z.ZodString;
        line: z.ZodNumber;
        startLine: z.ZodOptional<z.ZodNumber>;
        endLine: z.ZodOptional<z.ZodNumber>;
        replacementSnippet: z.ZodOptional<z.ZodString>;
        severity: z.ZodEnum<{
            critical: "critical";
            "non-critical": "non-critical";
        }>;
        title: z.ZodString;
        body: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const ThreadReplyOutputSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    action_requested: z.ZodLiteral<true>;
    content: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    action_requested: z.ZodLiteral<false>;
    content: z.ZodOptional<z.ZodString>;
}, z.core.$strip>], "action_requested">;
export type SummaryOutput = z.infer<typeof SummaryOutputSchema>;
export type ReviewOutput = z.infer<typeof ReviewOutputSchema>;
export type ThreadReplyOutput = z.infer<typeof ThreadReplyOutputSchema>;
//# sourceMappingURL=schemas.d.ts.map