# Product Requirements

## Product Summary

Build a GitHub-native AI PR reviewer that summarizes pull requests, posts actionable review comments, supports incremental re-review, responds in review threads, and can be run locally in dry-run mode.

## Primary Users

| User            | Need                                                           |
| --------------- | -------------------------------------------------------------- |
| PR author       | Fast feedback on likely bugs, regressions, and risky changes   |
| Human reviewer  | Less time on obvious issues and basic code walkthrough         |
| Repo maintainer | Consistent automated first-pass review with low setup overhead |

## V1 Goals

- Review PR diffs automatically on open and synchronize
- Generate a durable PR summary comment
- Post inline comments only for actionable findings
- Support incremental review using prior run state
- Allow manual reruns from PR comments
- Reply in relevant review threads
- Support repository-specific review rules
- Support local CLI dry-run for testing and debugging
- Support multiple LLM providers behind one internal contract

## V1 Scope

- GitHub Action runtime
- Local CLI runtime
- Same-repo PRs only
- Summary generation from PR metadata and diffs
- Review generation from normalized diffs
- Explicit-trigger PR title regeneration
- Hidden overview-comment payload for incremental state

## Out Of Scope

- Forked PR support
- External persistence layer
- Auto-fix generation or patch application
- PR body rewriting
- Full-repository indexing or retrieval
- Non-GitHub platforms

## Product Rules

- The reviewer analyzes the PR diff, not the full repository.
- The reviewer should prefer bugs, regressions, and security issues over style commentary.
- The reviewer should stay silent when it has no actionable finding.
- Title regeneration happens only when the PR title explicitly mentions `@overreview`.

## Success Metrics

- First review begins within 30 seconds of trigger in normal conditions
- Typical PR review completes within 5 minutes
- Most posted inline comments are judged actionable by maintainers
- Manual dry-run output is close enough to hosted behavior to debug issues locally

## Release Criteria

- Automatic PR review works end to end
- Incremental state is persisted and reused correctly
- Manual `/review` and `/review --full` work
- Review-thread replies only happen for relevant threads
- CLI dry-run skips writes and shows review output
