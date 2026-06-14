# Functional Specification

## Supported Events

| Event                         | Action                  | Behavior                                                 |
| ----------------------------- | ----------------------- | -------------------------------------------------------- |
| `pull_request`                | `opened`, `synchronize` | Run automatic review                                     |
| `pull_request_target`         | `opened`, `synchronize` | Optional alternative to `pull_request`; same review flow |
| `issue_comment`               | `created`               | Parse `/review` and `/ai-review` commands                |
| `pull_request_review_comment` | `created`               | Respond in relevant review threads                       |

## Automatic PR Review Flow

1. Load GitHub context.
2. Validate event payload and PR presence.
3. Skip if PR contains an ignore marker.
4. Fetch PR metadata, commits, issue comments, changed files, and current PR head.
5. Locate the existing overview comment authored by the bot.
6. Decide review mode:
   - Full review if forced or no usable prior state exists.
   - Incremental review if prior state exists and the current head is ahead of the last reviewed commit.
7. Post or update a loading overview comment.
8. Generate PR summary.
9. If the PR title explicitly mentions `@overreview`, update the PR title using the generated summary title.
10. Generate review comments from normalized file diffs.
11. Filter invalid or duplicate findings.
12. Submit inline comments and a review summary.
13. Update the overview comment with final summary content and new hidden payload state.

## Incremental Review Rules

- Persist reviewed commit SHAs in the overview comment.
- Use the last reviewed SHA as the base for incremental comparison.
- Review only files touched since that SHA.
- If the payload is missing, corrupt, or points to a non-comparable commit, fall back to full review.
- If no new commits exist, exit without posting a new review.

## Manual Review Commands

Supported commands:

- `/review`
- `/ai-review`
- `/review --full`
- `/ai-review --full`

Rules:

- Only handle newly created issue comments.
- Ignore commands authored by the bot.
- Treat `--full` as a force-full-review override.
- Add a reaction to the triggering comment when not in dry-run mode.
- Reuse the same review pipeline as automatic PR review.

## Review-Thread Reply Flow

1. Handle only newly created `pull_request_review_comment` events.
2. Ignore comments authored by the bot.
3. Reconstruct the full review-comment thread.
4. Continue only if the thread is relevant:
   - the bot has already participated, or
   - the latest comment explicitly mentions the bot.
5. Resolve the changed file and diff context for the thread.
6. Ask the model for a reply focused on the latest comment.
7. Post a reply only if the model returns `action_requested = true` and a non-empty response.

## Review Output

### Overview Comment

- Persistent issue comment on the PR
- Loading state while review is running
- Final state includes PR summary and file summary table
- Hidden payload stores review state for incremental runs

### Inline Comments

- Anchored to changed lines on the right side of the diff
- Reserved for critical findings and important typos in V1
- Bot signature appended for self-identification

### Review Summary

- Submitted as the body of the review
- Includes whether the PR needs attention
- Lists commits considered, files processed, actionable comments, and skipped comments

## Ignore Rules

- Skip review if PR title or body contains configured ignore markers.
- Default markers should include `@overreview skip` and `@overreview ignore`.

## CLI Behavior

- `--list-prs` lists pull requests for a repo
- `--pr <number>` reviews a PR
- `--dry-run` fetches data and runs prompts but skips GitHub writes
- `--out [path]` saves dry-run output to a file
- `--full` forces a full review

## Failure Handling

- Unsupported events are logged and skipped.
- Missing PR payload data results in a clean exit.
- Model timeouts and transient provider failures are retried.
- Batched review submission falls back to per-comment submission if needed.
- Missing file patches do not fail the review; those files simply have no hunks.
