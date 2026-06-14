# Testing And Acceptance

## Test Strategy

Use a mix of unit tests, integration-style handler tests, and dry-run verification.

## Unit Test Coverage

Cover at minimum:

- config loading and precedence
- diff parsing and hunk formatting
- message rendering and payload tagging
- bot-comment detection and thread relevance
- command parsing for `/review` and `--full`
- provider success, timeout, and fallback behavior
- prompt schema validation

## Integration Coverage

Cover these flows with mocked GitHub and provider interactions:

- automatic full review
- incremental review using existing payload state
- manual `/review`
- manual `/review --full`
- review-thread reply flow
- CLI dry-run flow

## Fixtures

Maintain reusable fixtures for:

- PR event payloads
- issue comment payloads
- review comment payloads
- diff patches with added, removed, and renamed files
- overview comments containing hidden payloads
- existing review-comment threads

## Acceptance Criteria

### Automatic Review

- A qualifying PR event creates or updates a loading overview comment.
- The run generates a PR summary.
- The run submits a review when actionable comments exist.
- The final overview comment contains refreshed hidden state.

### Incremental Review

- A second run with no new commits exits cleanly.
- A second run with new commits reviews only the new commit range.
- Files outside the incremental change set are not re-reviewed unless full review is forced.

### Manual Commands

- `/review` triggers the review flow.
- `/review --full` forces a full review.
- Non-command issue comments do nothing.

### Thread Replies

- Replies are generated only for relevant review threads.
- Replies mention the target user.
- Generic non-actionable replies are not posted.

### CLI Dry-Run

- Dry-run performs all fetch and prompt steps.
- Dry-run skips GitHub writes.
- `--out` saves the emitted output.

## Verification Commands

Run the repository checks that exist:

```bash
npm run lint
npm run build
npm run test
```

If coverage is part of the delivery gate, also run:

```bash
npm run test:coverage
```

## Release Gate

V1 is ready only if:

- lint passes
- build passes
- core tests pass
- the six integration flows above are covered
- docs and runtime behavior agree on same-repo V1 constraints
