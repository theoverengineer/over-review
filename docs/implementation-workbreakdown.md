# Implementation Work Breakdown

## Purpose

This document turns the V1 spec into a concrete module and file structure for implementation.

Assumption: use TypeScript for V1. The same boundaries still apply if the project is kept in JavaScript.

## Current Repo State

- The repository currently has spec documents but no `src/` implementation tree.
- The initial build should create the runtime structure intentionally instead of growing it ad hoc.

## Locked V1 Constraints

- Automatic review uses `pull_request` only.
- Same-repo PRs only.
- Fork PRs are silently skipped in all flows.
- `ai-sdk` is the only shipped provider in V1.
- `/review` and `/ai-review` are allowed only for `OWNER`, `MEMBER`, and `COLLABORATOR` via `author_association`.
- Unauthorized manual review commands get an `eyes` reaction and do not start review work.
- No external database.
- No checkout or execution of PR code for core review flow.

## Recommended Top-Level Tree

```text
.
├─ action.yml
├─ package.json
├─ tsconfig.json
├─ eslint.config.js
├─ vitest.config.ts
├─ src/
│  ├─ main.ts
│  ├─ cli.ts
│  ├─ config/
│  ├─ contracts/
│  ├─ runtime/
│  ├─ events/
│  ├─ github/
│  ├─ diff/
│  ├─ prompts/
│  ├─ providers/
│  ├─ render/
│  ├─ review/
│  ├─ threads/
│  └─ cli/
├─ test/
│  ├─ fixtures/
│  ├─ unit/
│  └─ integration/
├─ .github/
│  └─ workflows/
│     └─ over-review.yml
└─ docs/
```

## Module Breakdown

### Entrypoints

| File | Responsibility |
| --- | --- |
| `src/main.ts` | GitHub Action entrypoint. Load config, initialize runtime, and dispatch supported events only. |
| `src/cli.ts` | CLI entrypoint for `--list-prs`, `--pr`, `--dry-run`, `--out`, and `--full`. |

### Config And Contracts

| File | Responsibility |
| --- | --- |
| `src/config/index.ts` | Load config with precedence: CLI flags, env, action inputs, then local `.env`. |
| `src/config/schema.ts` | Validate required and optional config for V1. |
| `src/contracts/review.ts` | Define `FileDiff`, `Hunk`, `AIComment`, `PullRequestSummary`, and hidden review state types. |
| `src/contracts/provider.ts` | Define `InferenceRequest`, `InferenceResult`, and `AIProvider`. |

### Runtime And Guards

| File | Responsibility |
| --- | --- |
| `src/runtime/event-router.ts` | Route `pull_request`, `issue_comment`, and `pull_request_review_comment`. |
| `src/runtime/action-context.ts` | Normalize Actions event context into shared runtime input. |
| `src/runtime/cli-context.ts` | Build equivalent local context for CLI execution. |
| `src/runtime/logger.ts` | Emit structured run logs required by the architecture doc. |
| `src/runtime/guards.ts` | Centralize same-repo checks, fork silent-skip, bot ignore checks, ignore markers, and manual auth via `author_association`. |

### Event Handlers

| File | Responsibility |
| --- | --- |
| `src/events/handle-pull-request.ts` | Run automatic review for supported `pull_request` actions. |
| `src/events/handle-issue-comment.ts` | Parse `/review` and `/ai-review`, support `--full`, authorize allowed associations, and add `eyes` for unauthorized commands. |
| `src/events/handle-review-comment.ts` | Handle review-thread reply events for supported same-repo PRs. |

### GitHub Adapter

| File | Responsibility |
| --- | --- |
| `src/github/client.ts` | Initialize Octokit with retry and throttling behavior. |
| `src/github/pull-requests.ts` | Fetch PR metadata, commits, changed files, and update PR title. |
| `src/github/comments.ts` | Manage overview comments, issue comments, review threads, and thread replies. |
| `src/github/reviews.ts` | Submit review summaries and inline comments, with batch-to-per-comment fallback. |
| `src/github/reactions.ts` | Add `eyes` reactions for unauthorized manual commands. |

### Diff Processing

| File | Responsibility |
| --- | --- |
| `src/diff/parse-patch.ts` | Parse GitHub patch text into line-numbered hunks. |
| `src/diff/normalize-file-diffs.ts` | Build normalized `FileDiff` objects from PR files and patches. |
| `src/diff/format-for-prompt.ts` | Format diffs into the stable prompt layout used by model calls. |

### Prompts And Schemas

| File | Responsibility |
| --- | --- |
| `src/prompts/summary.ts` | Build the PR summary prompt. |
| `src/prompts/review.ts` | Build the review prompt with repository-specific rules. |
| `src/prompts/thread-reply.ts` | Build the review-thread reply prompt. |
| `src/prompts/schemas.ts` | Define schema validation for summary, review, and thread-reply outputs. |
| `src/prompts/versions.ts` | Track prompt and schema versions for logs and future migrations. |

### Provider Layer

| File | Responsibility |
| --- | --- |
| `src/providers/index.ts` | Resolve the provider path for V1. This always resolves to `ai-sdk`. |
| `src/providers/ai-sdk-provider.ts` | Implement structured inference, timeout, retry, and fallback parsing for `ai-sdk`. |
| `src/providers/errors.ts` | Normalize configuration, auth, timeout, transient, schema, and unsupported-model errors. |

### Rendering

| File | Responsibility |
| --- | --- |
| `src/render/hidden-state.ts` | Encode and decode the hidden overview payload with signature tagging. |
| `src/render/overview-comment.ts` | Render loading and final overview comments. |
| `src/render/review-summary.ts` | Render the submitted review body. |
| `src/render/inline-comment.ts` | Render inline comment text with bot signature. |

### Review Orchestration

| File | Responsibility |
| --- | --- |
| `src/review/orchestrator.ts` | Shared review pipeline used by automatic review, manual review, and CLI. |
| `src/review/review-mode.ts` | Decide full versus incremental review. |
| `src/review/incremental-state.ts` | Read prior hidden state, compare commits, and compute incremental scope. |
| `src/review/filters.ts` | Filter duplicate, invalid, non-actionable, or unanchorable findings. |
| `src/review/title-regeneration.ts` | Update PR title only when the current title explicitly mentions `@overreview`. |

### Thread Replies

| File | Responsibility |
| --- | --- |
| `src/threads/reconstruct.ts` | Rebuild full review threads and attach diff context. |
| `src/threads/relevance.ts` | Decide whether a thread is relevant for bot reply. |
| `src/threads/reply-orchestrator.ts` | Run reply inference and post replies only when action is requested. |

### CLI Support

| File | Responsibility |
| --- | --- |
| `src/cli/parse-args.ts` | Parse CLI flags. |
| `src/cli/list-prs.ts` | Implement `--list-prs`. |
| `src/cli/run-review.ts` | Run PR review through the shared orchestrator. |
| `src/cli/write-output.ts` | Save dry-run output for `--out`. |

## Milestone To File Mapping

### Milestone 1: Freeze V1 Event And Trust Boundaries

- `action.yml`
- `.github/workflows/over-review.yml`
- `src/runtime/event-router.ts`
- `src/runtime/guards.ts`
- `src/events/handle-pull-request.ts`
- `src/events/handle-issue-comment.ts`
- `src/events/handle-review-comment.ts`

### Milestone 2: Core Runtime Skeleton And Config

- `src/main.ts`
- `src/cli.ts`
- `src/config/index.ts`
- `src/config/schema.ts`
- `src/runtime/action-context.ts`
- `src/runtime/cli-context.ts`
- `src/runtime/logger.ts`
- `src/github/client.ts`

### Milestone 3: Provider Contract With `ai-sdk` Only

- `src/contracts/provider.ts`
- `src/providers/index.ts`
- `src/providers/ai-sdk-provider.ts`
- `src/providers/errors.ts`
- `src/prompts/schemas.ts`

### Milestone 4: Review Core And Overview Comment Lifecycle

- `src/contracts/review.ts`
- `src/diff/parse-patch.ts`
- `src/diff/normalize-file-diffs.ts`
- `src/diff/format-for-prompt.ts`
- `src/prompts/summary.ts`
- `src/prompts/review.ts`
- `src/render/hidden-state.ts`
- `src/render/overview-comment.ts`
- `src/render/review-summary.ts`
- `src/render/inline-comment.ts`
- `src/review/orchestrator.ts`
- `src/review/filters.ts`
- `src/review/title-regeneration.ts`
- `src/github/pull-requests.ts`
- `src/github/comments.ts`
- `src/github/reviews.ts`

### Milestone 5: Incremental Review State

- `src/review/review-mode.ts`
- `src/review/incremental-state.ts`
- `src/render/hidden-state.ts`

### Milestone 6: Manual Review Commands And Authorization

- `src/events/handle-issue-comment.ts`
- `src/github/reactions.ts`
- `src/runtime/guards.ts`

### Milestone 7: Thread Replies And CLI Dry-Run

- `src/events/handle-review-comment.ts`
- `src/threads/reconstruct.ts`
- `src/threads/relevance.ts`
- `src/threads/reply-orchestrator.ts`
- `src/cli/parse-args.ts`
- `src/cli/list-prs.ts`
- `src/cli/run-review.ts`
- `src/cli/write-output.ts`

### Milestone 8: Hardening, Acceptance, And Doc Alignment

- `test/**/*`
- `action.yml`
- `.github/workflows/over-review.yml`
- targeted updates across all modules above

## Recommended Creation Order

Create these files first to keep the core path stable:

1. `src/contracts/provider.ts`
2. `src/contracts/review.ts`
3. `src/config/schema.ts`
4. `src/config/index.ts`
5. `src/runtime/logger.ts`
6. `src/runtime/guards.ts`
7. `src/github/client.ts`
8. `src/runtime/event-router.ts`
9. `src/main.ts`
10. `src/cli.ts`

Then build the first end-to-end review path in this order:

1. `src/github/pull-requests.ts`
2. `src/diff/parse-patch.ts`
3. `src/diff/normalize-file-diffs.ts`
4. `src/prompts/schemas.ts`
5. `src/prompts/summary.ts`
6. `src/providers/ai-sdk-provider.ts`
7. `src/render/overview-comment.ts`
8. `src/review/orchestrator.ts`
9. `src/github/comments.ts`
10. `src/github/reviews.ts`

This should produce the first automatic full-review vertical slice before incremental state, manual commands, or thread replies.

## Test Layout

```text
test/
├─ fixtures/
│  ├─ events/
│  │  ├─ pull-request.opened.json
│  │  ├─ pull-request.synchronize.json
│  │  ├─ issue-comment.review.json
│  │  ├─ issue-comment.review-full.json
│  │  ├─ issue-comment.unauthorized.json
│  │  ├─ review-comment.relevant.json
│  │  └─ review-comment.irrelevant.json
│  ├─ diffs/
│  │  ├─ added.patch
│  │  ├─ modified.patch
│  │  ├─ renamed.patch
│  │  └─ no-patch-file.json
│  ├─ comments/
│  │  ├─ overview-with-state.md
│  │  └─ overview-corrupt-state.md
│  └─ threads/
│     ├─ bot-participated.json
│     └─ mention-triggered.json
├─ unit/
│  ├─ config/index.test.ts
│  ├─ runtime/guards.test.ts
│  ├─ diff/parse-patch.test.ts
│  ├─ diff/format-for-prompt.test.ts
│  ├─ prompts/schemas.test.ts
│  ├─ providers/ai-sdk-provider.test.ts
│  ├─ render/hidden-state.test.ts
│  ├─ render/overview-comment.test.ts
│  ├─ review/review-mode.test.ts
│  ├─ review/incremental-state.test.ts
│  ├─ review/filters.test.ts
│  ├─ threads/relevance.test.ts
│  └─ events/handle-issue-comment.test.ts
└─ integration/
   ├─ action/pull-request.full-review.test.ts
   ├─ action/pull-request.incremental.test.ts
   ├─ action/pull-request.no-new-commits.test.ts
   ├─ action/issue-comment.review.test.ts
   ├─ action/issue-comment.review-full.test.ts
   ├─ action/issue-comment.unauthorized.test.ts
   ├─ action/issue-comment.fork-skip.test.ts
   ├─ action/review-comment.reply.test.ts
   ├─ action/review-comment.irrelevant.test.ts
   ├─ cli/review.dry-run.test.ts
   └─ cli/review.fork-skip.test.ts
```

## Deferred Until After V1

| Deferred file or folder | Reason |
| --- | --- |
| `src/providers/<other-provider>.ts` | V1 ships `ai-sdk` only. |
| `src/persistence/*` | No external database in V1. |
| `src/forks/*` | Fork PR support is out of scope. |
| `src/review/pr-body-rewrite.ts` | PR body rewriting is out of scope. |
| `src/review/auto-fix.ts` | Auto-fix generation is out of scope. |
| `src/retrieval/*` | No repository indexing or RAG in V1. |
| `src/auth/policy-engine.ts` | Richer auth rules are deferred beyond `author_association`. |

## Notes For Implementation

- Keep same-repo and fork-skip logic in one shared guard path.
- Reuse one review orchestrator for Action and CLI flows.
- Keep provider-specific behavior inside the `ai-sdk` adapter.
- Avoid creating separate code paths for automatic review and manual review unless the trigger logic truly differs.
- Treat the overview comment hidden payload as the only persistence layer in V1.
