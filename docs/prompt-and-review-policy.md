# Prompt And Review Policy

## Prompt Families

| Prompt                     | Purpose                                                                |
| -------------------------- | ---------------------------------------------------------------------- |
| Summary prompt             | Produce PR title, description, file summaries, and type classification |
| Review prompt              | Produce structured review metadata and candidate comments              |
| Review-thread reply prompt | Produce a direct response to a relevant review-thread comment          |

## Common Prompt Rules

- Use structured JSON output validated with a schema.
- Treat PR title, description, and commit messages as hints, not truth.
- Do not assume behavior outside the visible diff.
- Do not return comments if nothing actionable is found.
- Prefer precise and local findings over broad architectural speculation.

## Diff Format Contract

Each file diff should be normalized into a stable prompt format:

```text
## File modified: 'src/example.ts'

@@ ... @@
__new hunk__
12  unchanged line
13 +added line

__old hunk__
 unchanged line
-removed line

__existing_comment_thread__
@overreview: prior comment
@user: reply
```

Rules:

- Line numbers exist only in `__new hunk__` sections.
- Existing comment threads are attached to the hunk they belong to.
- Files with no patch text may still appear, but usually contribute no reviewable hunks.

## Summary Prompt Policy

The summary prompt must:

- generate a concise, implementation-relevant title
- generate a PR description grounded in the diff
- return a file summary for every affected file
- classify the PR into one or more broad types

## Review Prompt Policy

The review prompt must:

- focus on newly added code
- avoid style-only and formatting-only comments
- avoid duplicating existing thread comments
- produce line-anchored findings only when the evidence is present in the diff
- return review metadata even when no comments are found

## Review Reply Prompt Policy

The reply prompt must:

- focus on the latest comment in the thread
- understand the full thread as context
- start the response with an `@user` mention
- return an empty or no-op result when no action is requested
- avoid generic filler

## Comment Policy

### Good Findings

- likely runtime bugs
- security issues
- regressions
- missing validation
- dangerous edge cases visible in the diff
- user-facing typos that should be fixed

### Avoid

- formatting advice
- generic code-style advice
- comments asking for comments or docs by default
- speculative null checks without evidence
- repository-wide assumptions not visible in the diff

## Severity Policy

### Critical

- likely merge-blocking issue
- clear security problem
- clear correctness bug

### Non-Critical

- important but not merge-blocking concern
- maintainability or performance issue with specific evidence

V1 posting rule:

- Inline-post critical comments and important typos.
- Summarize non-critical comments in the review summary instead of posting every one inline.

## Custom Review Rules

- Inject repository-specific rules into the review prompt.
- Treat rule violations as first-class findings.
- Do not let custom rules override core safety rules like diff-only reasoning and structured output validation.

## Versioning

- Version prompt templates explicitly.
- Keep schemas versioned with the prompts they support.
- Record prompt version in logs when possible.
