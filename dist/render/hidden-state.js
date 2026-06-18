"use strict";
/**
 * Hidden state encoding/decoding for over-review.
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.INLINE_SIGNATURE = exports.OVERVIEW_SIGNATURE = void 0;
exports.createHiddenPayload = createHiddenPayload;
exports.encodeHiddenState = encodeHiddenState;
exports.appendOverviewMetadata = appendOverviewMetadata;
exports.decodeHiddenState = decodeHiddenState;
exports.hasOverviewSignature = hasOverviewSignature;
exports.appendInlineSignature = appendInlineSignature;
exports.stripHiddenMetadata = stripHiddenMetadata;
exports.OVERVIEW_SIGNATURE = '<!-- overreview:overview -->';
exports.INLINE_SIGNATURE = '<!-- overreview:inline -->';
const STATE_PREFIX = '<!-- overreview:state ';
const STATE_SUFFIX = ' -->';
function createHiddenPayload(lastReviewedCommit, mode, reviewedCommits) {
    return {
        version: 1,
        reviewedCommits: reviewedCommits
            ? [...reviewedCommits]
            : lastReviewedCommit
                ? [lastReviewedCommit]
                : [],
        lastReviewedCommit,
        mode,
    };
}
function encodeHiddenState(payload) {
    const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64');
    return `${STATE_PREFIX}${encoded}${STATE_SUFFIX}`;
}
function appendOverviewMetadata(body, payload) {
    return `${body.trim()}\n\n${exports.OVERVIEW_SIGNATURE}\n${encodeHiddenState(payload)}`;
}
function decodeHiddenState(commentBody) {
    const match = commentBody.match(/<!-- overreview:state ([A-Za-z0-9+/=]+) -->/);
    if (!match) {
        return null;
    }
    try {
        const parsed = JSON.parse(Buffer.from(match[1], 'base64').toString('utf8'));
        if (parsed.version !== 1 ||
            !Array.isArray(parsed.reviewedCommits) ||
            !parsed.reviewedCommits.every((commit) => typeof commit === 'string') ||
            typeof parsed.lastReviewedCommit !== 'string' ||
            (parsed.mode !== 'full' && parsed.mode !== 'incremental')) {
            return null;
        }
        return parsed;
    }
    catch {
        return null;
    }
}
function hasOverviewSignature(commentBody) {
    return commentBody.includes(exports.OVERVIEW_SIGNATURE);
}
function appendInlineSignature(body) {
    return `${body.trim()}\n\n${exports.INLINE_SIGNATURE}`;
}
function stripHiddenMetadata(commentBody) {
    return commentBody
        .replace(/\n?<!-- overreview:overview -->/g, '')
        .replace(/\n?<!-- overreview:state [A-Za-z0-9+/=]+ -->/g, '')
        .replace(/\n?<!-- overreview:inline -->/g, '')
        .trim();
}
//# sourceMappingURL=hidden-state.js.map