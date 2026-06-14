# Functional Specification

## Supported Events

| Event                         | Action                  | Behavior                                                 |
| ----------------------------- | ----------------------- | -------------------------------------------------------- |
| `pull_request`                | `opened`, `synchronize` | Run automatic review for eligible same-repo PRs          |
| `issue_comment`               | `created`               | Parse authorized `/review` and `/ai-review` alias commands |
| `pull_request_review_comment` | `created`               | Respond in relevant review threads for same-repo PRs     |

## Automatic PR Review Flow

1. Load GitHub context.
2. Validate event payload and PR presence.
3. Skip unless the PR head repository matches the base repository.
4. If the PR is from a fork, exit quietly with no review, comment, or reaction.
5. Skip if PR contains an ignore marker.
6. Fetch PR metadata, commits, issue comments, changed files, and current PR head.
7. Locate the existing overview comment authored by the bot.
8. Decide review mode:
   - Full review if forced or no usable prior state exists.
   - Incremental review if prior state exists and the current head is ahead of the last reviewed commit.
9. Post or update a loading overview comment.
10. Generate PR summary.
11. If the PR title explicitly mentions `@overreview`, update the PR title using the generated summary title.
12. Generate review comments from normalized file diffs.
13. Filter invalid or duplicate findings.
14. Submit inline comments and a review summary.
15. Update the overview comment with final summary content and new hidden payload state.

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

- Only handle newly created issue comments on pull requests.
- Ignore commands authored by the bot.
- Apply the same same-repo gate as automatic review; fork PRs are silently skipped.
- Treat `/ai-review` as an alias for `/review` with the same authorization and execution rules.
- Authorize `/review` and `/ai-review` only when `author_association` is `OWNER`, `MEMBER`, or `COLLABORATOR`.
- If unauthorized, add an `eyes` reaction to the triggering comment and exit without running review.
- Treat `--full` as a force-full-review override.
- Reuse the same review pipeline as automatic PR review.

## Review-Thread Reply Flow

1. Handle only newly created `pull_request_review_comment` events.
2. Validate PR context and exit quietly unless the PR is same-repo.
3. Ignore comments authored by the bot.
4. Reconstruct the full review-comment thread.
5. Continue only if the thread is relevant:
   - the bot has already participated, or
   - the latest comment explicitly mentions the bot.
6. Resolve the changed file and diff context for the thread.
7. Ask the model for a reply focused on the latest comment.
8. Post a reply only if the model returns `action_requested = true` and a non-empty response.

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
- fork PRs are silently skipped in the same way as hosted review flows

## Failure Handling

- Unsupported events are logged and skipped.
- Missing PR payload data results in a clean exit.
- Model timeouts and transient provider failures are retried.
- Batched review submission falls back to per-comment submission if needed.
- Missing file patches do not fail the review; those files simply have no hunks.
