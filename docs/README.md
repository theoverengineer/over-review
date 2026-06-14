# AI PR Reviewer Spec Pack

Implementation-focused specs for rebuilding a product similar to this repository.

## Scope

- V1 practical scope
- GitHub Action plus local CLI
- Same-repo PRs only
- Internal provider seam with `ai-sdk` as the only shipped V1 provider
- PR title regeneration only on explicit mention
- Improved redesign based on this codebase, not strict behavioral parity

## Documents

| File | Purpose |
| --- | --- |
| `product-requirements.md` | Product goals, users, scope, and success criteria |
| `functional-spec.md` | End-user behavior, workflows, triggers, and outputs |
| `architecture.md` | Runtime components, data contracts, and execution flow |
| `provider-interface-spec.md` | Provider abstraction, request/response contract, and extension rules |
| `prompt-and-review-policy.md` | Prompt families, diff format, and review rules |
| `configuration-and-deployment.md` | Config surface, workflow wiring, and CLI behavior |
| `security-and-trust-boundaries.md` | Trust model, token use, and V1 security constraints |
| `testing-and-acceptance.md` | Test strategy and acceptance criteria |
| `implementation-roadmap.md` | Suggested implementation order and milestones |
| `implementation-checklist.md` | Execution checklist with locked V1 delivery decisions |
| `implementation-workbreakdown.md` | Concrete module, file, and test layout for building V1 |

## Reference Behavior From This Repo

- Automatic PR review on `pull_request` events
- Incremental review using hidden overview-comment payload state
- Manual rerun via `/review` and the `/ai-review` alias
- Review-thread replies on `pull_request_review_comment`
- PR summary generation
- Optional PR title regeneration when explicitly requested
- Local dry-run CLI

## V1 Decisions

- No external database
- No forked PR support
- No PR body rewriting
- No auto-fix support
- Diff-scoped analysis only

## How To Use

1. Start with `product-requirements.md` and `functional-spec.md`.
2. Use `architecture.md` and `provider-interface-spec.md` to define module boundaries.
3. Use `prompt-and-review-policy.md` before implementing model calls.
4. Use `testing-and-acceptance.md` as the delivery gate.
5. Use `implementation-checklist.md` to track milestone completion against the locked V1 decisions.
6. Use `implementation-workbreakdown.md` when creating the actual source tree and test layout.
