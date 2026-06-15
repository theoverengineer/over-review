# Implementation Roadmap

## Build Order

1. Freeze V1 event and trust boundaries
2. Core runtime skeleton and config
3. GitHub adapter and event routing
4. Provider abstraction and default provider
5. Diff normalization
6. Summary prompt flow
7. Review prompt flow and overview comment lifecycle
8. Incremental review logic
9. Manual `/review` and `/ai-review` commands
10. Review-thread replies
11. CLI dry-run support with `--list-prs`
12. Hardening, acceptance, and doc alignment

## Milestone 1: Freeze V1 Event And Trust Boundaries

Deliver:

- same-repo gate for all entrypoints (automatic, manual, thread replies, CLI)
- fork PR silent-skip behavior (no review, no comment, no reaction)
- lock V1 runtime assumptions: diff-only analysis, no PR code execution
- supported event matrix: `pull_request`, `issue_comment`, `pull_request_review_comment`
- remove `pull_request_target` from V1 behavior

Exit criteria:

- automatic review accepts qualifying `pull_request` events and ignores unsupported event types cleanly
- fork PR fixtures exit with no write operations in automatic, manual, thread-reply, and CLI paths
- docs no longer describe `pull_request_target` as a V1 path

## Milestone 2: Core Runtime Skeleton And Config

Deliver:

- project structure and config loading with precedence (CLI flags, env, action inputs, `.env`)
- config validation with clear failure messages for missing required values
- GitHub client initialization with retry and throttling
- event router and context loader for Action and local CLI execution
- structured logging fields from `architecture.md`

Exit criteria:

- app starts in action mode with valid config
- CLI starts in local mode with valid config
- missing `GITHUB_TOKEN`, `LLM_MODEL`, or `LLM_API_KEY` fails clearly

## Milestone 3: Provider Contract With `ai-sdk` Only

Deliver:

- provider contract from `provider-interface-spec.md`
- provider registry/resolution (V1 always resolves to `ai-sdk`)
- `ai-sdk` summary, review, and thread-reply inference paths
- schema validation with bounded retry/timeout behavior
- remove SAP-provider work from V1 scope and docs

Exit criteria:

- structured inference works end to end for all three prompt families
- invalid model output is rejected or recovered through documented fallback logic
- provider errors include provider and model context

## Milestone 4: Review Core And Overview Comment Lifecycle

Deliver:

- diff parsing and normalization
- summary prompt flow
- review prompt flow with actionable-comment filtering
- overview comment creation, loading state, final rendering, and hidden payload signature
- PR title regeneration when title explicitly mentions `@overreview`
- enforce review policy: diff-scoped reasoning, no style-only noise, no duplicate findings

Exit criteria:

- full review works for a PR with changed files
- inline comments can be posted
- overview summary is stable and readable
- PR title regeneration respects the explicit `@overreview` mention requirement

## Milestone 5: Incremental Review State

Deliver:

- persist reviewed commit SHAs and `lastReviewedCommit` in the hidden overview payload
- incremental review selection from prior state
- fallback to full review on missing, corrupt, or unusable payload state
- exit cleanly when no new commits exist
- limit incremental review to files touched since the last reviewed SHA

Exit criteria:

- second run with no new commits exits without posting a new review
- second run with new commits reviews only the incremental change set
- forced full review bypasses incremental state correctly
- payload parsing failures do not crash the run

## Milestone 6: Manual Review Commands And Authorization

Deliver:

- parse `/review` and `/ai-review` on `issue_comment` events, support `--full` flag
- authorize manual review using `author_association` (`OWNER`, `MEMBER`, `COLLABORATOR`)
- add `eyes` reaction for unauthorized `/review` or `/ai-review` (no review run)
- reuse the same orchestrator used by automatic review
- apply same-repo gate and fork silent-skip before any review work starts
- ignore bot-authored comments and non-command comments

Exit criteria:

- authorized `/review` or `/ai-review` triggers the review flow
- authorized `/review --full` or `/ai-review --full` forces full review
- unauthorized `/review` or `/ai-review` gets only an `eyes` reaction
- unauthorized commands produce no overview update, no model call, and no review submission
- manual commands on fork PRs are silently skipped

## Milestone 7: Thread Replies And CLI Dry-Run

Deliver:

- review-thread reconstruction and relevance detection
- reply only when the bot already participated or the latest comment mentions the bot
- post replies only when model returns `action_requested = true` and non-empty content
- implement CLI review path through the shared orchestrator
- support `--list-prs`, `--pr`, `--dry-run`, `--out`, and `--full` flags
- apply same-repo gate and fork silent-skip to thread-reply and CLI review paths

Exit criteria:

- only relevant review threads get replies
- CLI `--list-prs` lists pull requests for a repo
- CLI dry-run performs fetch and prompt steps but no GitHub writes
- CLI review of a fork PR exits quietly

## Milestone 8: Hardening, Acceptance, And Doc Alignment

Deliver:

- test coverage for core flows (automatic full review, incremental review, manual review, forced full review, thread replies, CLI dry-run)
- retry and timeout tuning
- consistent config and action input surface
- documentation alignment with locked decisions

Exit criteria:

- lint, build, and tests pass
- acceptance criteria from `testing-and-acceptance.md` are met
- no known blocker remains for same-repo V1 rollout
