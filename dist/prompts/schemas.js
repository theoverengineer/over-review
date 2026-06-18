"use strict";
/**
 * Structured output schemas for the shipped prompt families.
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThreadReplyOutputSchema = exports.ReviewOutputSchema = exports.ReviewFindingSchema = exports.SummaryOutputSchema = exports.SummaryFileSchema = void 0;
const zod_1 = require("zod");
exports.SummaryFileSchema = zod_1.z.object({
    path: zod_1.z.string().min(1),
    summary: zod_1.z.string().min(1),
});
exports.SummaryOutputSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    description: zod_1.z.string().min(1),
    fileSummaries: zod_1.z.array(exports.SummaryFileSchema),
    changeTypes: zod_1.z.array(zod_1.z.enum(['feature', 'bugfix', 'refactor', 'docs', 'test', 'chore'])),
});
exports.ReviewFindingSchema = zod_1.z.object({
    path: zod_1.z.string().min(1),
    line: zod_1.z.number().int().positive(),
    startLine: zod_1.z.number().int().positive().optional(),
    endLine: zod_1.z.number().int().positive().optional(),
    replacementSnippet: zod_1.z.string().optional(),
    severity: zod_1.z.enum(['critical', 'non-critical']),
    title: zod_1.z.string().min(1),
    body: zod_1.z.string().min(1),
});
exports.ReviewOutputSchema = zod_1.z.object({
    reviewSummary: zod_1.z.string().min(1),
    needsAttention: zod_1.z.boolean(),
    findings: zod_1.z.array(exports.ReviewFindingSchema),
});
exports.ThreadReplyOutputSchema = zod_1.z.discriminatedUnion('action_requested', [
    zod_1.z.object({
        action_requested: zod_1.z.literal(true),
        content: zod_1.z.string().trim().min(1),
    }),
    zod_1.z.object({
        action_requested: zod_1.z.literal(false),
        content: zod_1.z.string().optional(),
    }),
]);
//# sourceMappingURL=schemas.js.map