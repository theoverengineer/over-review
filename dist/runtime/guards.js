"use strict";
/**
 * Trust boundary guards for over-review.
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AUTHORIZED_ASSOCIATIONS = void 0;
exports.isBotActor = isBotActor;
exports.isBotComment = isBotComment;
exports.hasIgnoreMarker = hasIgnoreMarker;
exports.getPullRequestSource = getPullRequestSource;
exports.isForkPr = isForkPr;
exports.isSameRepoPr = isSameRepoPr;
exports.isAuthorizedAssociation = isAuthorizedAssociation;
exports.runTrustBoundaryGuards = runTrustBoundaryGuards;
exports.AUTHORIZED_ASSOCIATIONS = ['OWNER', 'MEMBER', 'COLLABORATOR'];
function isBotActor(actor) {
    return Boolean(actor && actor.toLowerCase().includes('[bot]'));
}
function isBotComment(userLogin) {
    return Boolean(userLogin && userLogin.toLowerCase().includes('[bot]'));
}
function hasIgnoreMarker(content) {
    const markers = ['@overreview skip', '@overreview ignore', '<!-- overreview:ignore -->'];
    return markers.some((marker) => content.includes(marker));
}
function getPullRequestSourceFromPullRequest(event) {
    const headRepo = event.pull_request.head.repo?.full_name;
    const baseRepo = event.pull_request.base.repo?.full_name;
    if (!headRepo || !baseRepo) {
        return 'unknown';
    }
    return headRepo === baseRepo ? 'same-repo' : 'fork';
}
function getPullRequestSource(event) {
    if ('issue' in event) {
        return event.issue.pull_request ? 'unknown' : 'not-pull-request';
    }
    if ('pull_request' in event) {
        return getPullRequestSourceFromPullRequest(event);
    }
    return 'not-pull-request';
}
function isForkPr(event) {
    return getPullRequestSource(event) === 'fork';
}
function isSameRepoPr(event) {
    return getPullRequestSource(event) === 'same-repo';
}
function isAuthorizedAssociation(authorAssociation) {
    if (!authorAssociation) {
        return false;
    }
    return exports.AUTHORIZED_ASSOCIATIONS.includes(authorAssociation);
}
function runTrustBoundaryGuards(event, actor, commentBody) {
    if (isBotActor(actor)) {
        return { allow: false, skipReason: 'bot-actor' };
    }
    if (commentBody && hasIgnoreMarker(commentBody)) {
        return { allow: false, skipReason: 'ignore-marker' };
    }
    const source = getPullRequestSource(event);
    if (source === 'fork') {
        return { allow: false, skipReason: 'fork-pr' };
    }
    if (source === 'unknown') {
        return { allow: true, requiresPullRequestLookup: true };
    }
    return { allow: true };
}
//# sourceMappingURL=guards.js.map