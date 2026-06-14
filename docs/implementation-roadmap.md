# Implementation Roadmap

## Build Order

1. Core data models and configuration
2. GitHub adapter and event routing
3. Diff normalization
4. Provider abstraction and default provider
5. Summary prompt flow
6. Review prompt flow
7. Overview comment rendering and state payloads
8. Incremental review logic
9. Manual `/review` commands
10. Review-thread replies
11. CLI dry-run support
12. Hardening, tests, and release prep

## Milestone 1: Skeleton

Deliver:

- project structure
- config loading
- GitHub event dispatch
- Octokit setup with retry and throttling

Exit criteria:

- app starts in action mode
- CLI starts in local mode
- config validation fails clearly on missing required values

## Milestone 2: Provider Layer

Deliver:

- provider contract
- provider registry
- default `ai-sdk` implementation
- optional SAP adapter

Exit criteria:

- structured inference works end to end
- invalid output is rejected or recovered through fallback logic

## Milestone 3: Review Core

Deliver:

- diff parsing
- summary generation
- review generation
- overview comment lifecycle

Exit criteria:

- full review works for a PR with changed files
- inline comments can be posted
- overview summary is stable and readable

## Milestone 4: Incremental And Manual Review

Deliver:

- hidden payload state
- incremental review selection
- `/review` and `/review --full`

Exit criteria:

- incremental review reuses prior state correctly
- forced full review bypasses incremental state

## Milestone 5: Thread Replies And CLI

Deliver:

- review-thread relevance detection
- reply prompt flow
- CLI dry-run and output capture

Exit criteria:

- only relevant review threads get replies
- CLI dry-run mirrors hosted behavior without writes

## Milestone 6: Hardening

Deliver:

- test coverage for core flows
- retry and timeout tuning
- consistent config and action input surface
- documentation alignment

Exit criteria:

- lint, build, and tests pass
- acceptance criteria from `testing-and-acceptance.md` are met
- no known blocker remains for same-repo V1 rollout
