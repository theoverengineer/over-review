# Implementation Checklist

## V1 Lock Summary

- [ ] Automatic review runs from `pull_request` events only.
- [ ] V1 supports same-repo PRs only.
- [ ] Fork PRs are silently skipped in automatic review, manual review, thread replies, and CLI review flows.
- [ ] `ai-sdk` is the only shipped provider in V1.
- [ ] Manual `/review` and `/ai-review` are allowed only for `OWNER`, `MEMBER`, and `COLLABORATOR` using `author_association`.
- [ ] Unauthorized `/review` or `/ai-review` adds an `eyes` reaction and does not start a review run.
- [ ] `/ai-review` is supported as an alias for `/review` and follows the same authorization and execution rules.
- [ ] CLI `--list-prs` lists pull requests for a repo.
- [ ] PR title regeneration happens only when the PR title explicitly mentions `@overreview`.

## Milestone 1: Freeze V1 Event And Trust Boundaries

- [ ] Remove `pull_request_target` from V1 behavior, workflow examples, and handler expectations.
- [ ] Define one shared same-repo gate for all entrypoints.
- [ ] Define one shared fork-PR skip path that exits quietly with no review, reply, or error comment.
- [ ] Lock V1 runtime assumptions around diff-only analysis and no PR code execution.
- [ ] Record the supported event matrix: `pull_request`, `issue_comment`, `pull_request_review_comment`.

Dependencies: none

Verification gate:
- [ ] Automatic review accepts qualifying `pull_request` events and ignores unsupported event types cleanly.
- [ ] Fork PR fixtures exit with no write operations in automatic, manual, thread-reply, and CLI paths.
- [ ] Docs no longer describe `pull_request_target` as a V1 path.

## Milestone 2: Core Runtime Skeleton And Config

- [ ] Implement config loading and precedence for Action and CLI modes.
- [ ] Validate required config early and fail with clear messages.
- [ ] Initialize GitHub client with retry and throttling.
- [ ] Add event router and context loader for Action and local CLI execution.
- [ ] Add structured logging fields from `architecture.md`.

Dependencies: Milestone 1

Verification gate:
- [ ] Action mode starts with valid config.
- [ ] CLI mode starts with valid config.
- [ ] Missing `GITHUB_TOKEN`, `LLM_MODEL`, or `LLM_API_KEY` fails clearly.
- [ ] `npm run lint`, `npm run build`, and relevant unit tests pass.

## Milestone 3: Provider Contract With `ai-sdk` Only

- [ ] Define the internal provider contract from `provider-interface-spec.md`.
- [ ] Implement provider registry or resolution even though V1 ships only `ai-sdk`.
- [ ] Implement `ai-sdk` summary, review, and thread-reply inference paths.
- [ ] Enforce schema validation and bounded retry/timeout behavior.
- [ ] Remove SAP-provider work from V1 scope and docs.

Dependencies: Milestone 2

Verification gate:
- [ ] Structured inference works end to end for all three prompt families.
- [ ] Invalid model output is rejected or recovered through documented fallback logic.
- [ ] Provider errors include provider and model context.
- [ ] No V1 docs or tests require SAP support.

## Milestone 4: Review Core And Overview Comment Lifecycle

- [ ] Implement diff normalization and reviewable hunk formatting.
- [ ] Implement summary prompt flow.
- [ ] Implement review prompt flow with actionable-comment filtering.
- [ ] Implement overview comment creation, loading state, final rendering, and hidden payload signature.
- [ ] Enforce review policy: diff-scoped reasoning, no style-only noise, no duplicate findings.
- [ ] Implement PR title regeneration when title explicitly mentions `@overreview`.

Dependencies: Milestone 3

Verification gate:
- [ ] A qualifying same-repo PR creates or updates a loading overview comment.
- [ ] The run generates a PR summary and final overview comment.
- [ ] Inline comments post only for actionable findings.
- [ ] Bot ownership is determined by hidden signatures, not username alone.
- [ ] PR title regeneration respects the explicit `@overreview` mention requirement.

## Milestone 5: Incremental Review State

- [ ] Persist reviewed commit SHAs and `lastReviewedCommit` in the hidden overview payload.
- [ ] Select incremental vs full review from prior state.
- [ ] Fall back to full review on missing, corrupt, or unusable payload state.
- [ ] Exit cleanly when no new commits exist.
- [ ] Limit incremental review to files touched since the last reviewed SHA.

Dependencies: Milestone 4

Verification gate:
- [ ] Second run with no new commits exits without posting a new review.
- [ ] Second run with new commits reviews only the incremental change set.
- [ ] Forced full review bypasses incremental state correctly.
- [ ] Payload parsing failures do not crash the run.

## Milestone 6: Manual Review Commands And Authorization

- [ ] Parse `/review` and `/ai-review` on new `issue_comment` events, including `--full` flag.
- [ ] Route `/ai-review` through the same parser and execution path as `/review`.
- [ ] Ignore bot-authored comments and non-command comments.
- [ ] Authorize manual review using `author_association`.
- [ ] Allow only `OWNER`, `MEMBER`, and `COLLABORATOR`.
- [ ] Add `eyes` reaction for unauthorized `/review` or `/ai-review` and do not start a review run.
- [ ] Reuse the same orchestrator used by automatic review.
- [ ] Apply the same same-repo and fork skip rules before any review work starts.

Dependencies: Milestone 5

Verification gate:
- [ ] Authorized `/review` or `/ai-review` triggers the review flow.
- [ ] Authorized `/review --full` or `/ai-review --full` forces full review.
- [ ] Unauthorized `/review` or `/ai-review` gets only an `eyes` reaction.
- [ ] Unauthorized `/review` or `/ai-review` produces no overview update, no model call, and no review submission.
- [ ] Manual commands on fork PRs are silently skipped.

## Milestone 7: Thread Replies And CLI Dry-Run

- [ ] Implement review-thread reconstruction and relevance detection.
- [ ] Reply only when the bot already participated or the latest comment mentions the bot.
- [ ] Post replies only when the model returns `action_requested = true` and non-empty content.
- [ ] Implement CLI review path through the shared orchestrator.
- [ ] Support `--list-prs`, `--pr`, `--dry-run`, `--out`, and `--full` flags.
- [ ] Apply same-repo and fork skip rules to thread-reply and CLI review paths.

Dependencies: Milestone 4

Verification gate:
- [ ] Irrelevant review threads are skipped.
- [ ] Relevant replies mention the target user and avoid filler.
- [ ] CLI `--list-prs` lists pull requests for a repo.
- [ ] CLI dry-run performs fetch and prompt steps but no GitHub writes.
- [ ] CLI review of a fork PR exits quietly.

## Milestone 8: Hardening, Acceptance, And Doc Alignment

- [ ] Add unit coverage from `testing-and-acceptance.md`.
- [ ] Add integration coverage for automatic full review, incremental review, manual review, forced full review, thread replies, and CLI dry-run.
- [ ] Verify retry, timeout, and fallback behavior.
- [ ] Align all V1 docs with the locked decisions.
- [ ] Confirm workflow examples, permissions, and config docs match implemented behavior.

Dependencies: Milestones 2 through 7

Verification gate:
- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.
- [ ] `npm run test` passes.
- [ ] `npm run test:coverage` passes if coverage is part of the release gate.
- [ ] Acceptance criteria in `docs/testing-and-acceptance.md` are satisfied.
- [ ] Docs and runtime behavior agree on `pull_request`-only automatic review, same-repo-only support, fork silent-skip behavior, `ai-sdk`-only V1 shipping scope, and manual command authorization rules.

## Dependency Summary

- [ ] Milestone 1 blocks all implementation work because it resolves current spec conflicts.
- [ ] Milestones 2 and 3 establish the shared runtime and inference seams.
- [ ] Milestones 4 and 5 establish the core review engine and incremental state.
- [ ] Milestone 6 depends on the review engine and incremental logic.
- [ ] Milestone 7 depends on the shared orchestrator from Milestone 4 and can proceed in parallel with Milestone 6 once core review is stable.
- [ ] Milestone 8 is the final release gate across all prior milestones.
