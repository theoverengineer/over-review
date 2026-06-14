# Architecture

## System Shape

The system is a Node.js application with two entry surfaces:

- GitHub Action runtime for automated review
- Local CLI for dry-run and operator testing

## Main Components

| Component | Responsibility |
| --- | --- |
| Event router | Dispatch by GitHub event type |
| Context loader | Resolve Actions context or local debug context |
| Review orchestrator | Fetch data, decide full vs incremental, run prompts, submit output |
| Diff normalizer | Parse GitHub patch text into line-numbered reviewable hunks |
| Comment/thread helper | Group review comments into threads and detect bot ownership |
| Prompt builder | Build summary, review, and thread-reply prompts |
| Provider layer | Run structured model inference through a pluggable adapter |
| Message renderer | Build overview comments, inline comments, and hidden payloads |
| GitHub adapter | Wrap Octokit initialization, retry, and throttling |
| CLI runner | Resolve auth, set debug env, run the review flow locally |

## Runtime Flow

### Automatic Review

`main` -> `pull_request` handler -> `pull_request_reviewer` -> GitHub fetches -> diff normalization -> summary prompt -> optional title update -> review prompt -> review submission -> overview comment update

### Manual Review

`main` -> `issue_comment` handler -> command parse -> optional `--full` -> `pull_request_reviewer`

### Thread Reply

`main` -> `pull_request_review_comment` handler -> thread reconstruction -> file diff lookup -> reply prompt -> reply submission

### Local CLI

`cli` -> token resolution -> debug env setup -> `pull_request_reviewer` through the same core path -> dry-run write suppression when enabled

## Persistence Model

No external database in V1.

Persist only lightweight review state in the overview issue comment using a hidden HTML payload.

Recommended payload:

```json
{
  "version": 1,
  "reviewedCommits": ["sha1", "sha2"],
  "lastReviewedCommit": "sha2",
  "mode": "incremental"
}
```

## Core Data Contracts

### `FileDiff`

- `filename`
- `status`
- `previous_filename?`
- `patch?`
- `hunks[]`

### `Hunk`

- `startLine`
- `endLine`
- `diff`
- `commentThreads[]`

### `AIComment`

- `file`
- `start_line`
- `end_line`
- `highlighted_code`
- `header`
- `content`
- `label`
- `critical`

### `PullRequestSummary`

- `title`
- `description`
- `files[]`
- `type[]`

## Design Constraints

- Diff-scoped reasoning only
- Same-repo PRs only in V1
- Bot identity determined by hidden signatures, not account name alone
- Provider contract must be stable enough to add new backends without changing orchestration logic

## Error Boundaries

- Config loading
- GitHub API fetches
- Payload parsing for incremental state
- Model inference
- Review submission

Each boundary should fail narrowly and preserve as much useful output as possible.

## Logging

Log these fields for every run:

- event name
- repo and PR number
- full vs incremental decision
- commit count and file count considered
- provider and model
- summary success
- comment counts submitted and skipped
- dry-run status
