# Security And Trust Boundaries

## V1 Trust Model

- Same-repo PRs only
- No external persistence
- No execution of PR code required for review
- Diff, PR metadata, and comments are treated as untrusted input

## Trust Boundaries

| Boundary | Risk |
| --- | --- |
| GitHub event payload | Missing or manipulated fields |
| PR title, body, comments | Prompt injection and abusive input |
| Diff text | Oversized or malicious prompt content |
| LLM provider | Invalid or hallucinated output |
| Tokens and secrets | Accidental exposure in logs or prompts |

## Required Controls

- Validate all structured model outputs before use.
- Never include secrets in prompts.
- Never trust bot ownership from username alone; use hidden signatures.
- Restrict review scope to the PR diff and related metadata.
- Ignore self-authored bot comments to prevent loops.

## Token Usage

- `GITHUB_TOKEN` must have only the permissions needed to read content and write PR or issue comments.
- Provider credentials must be sourced from secrets or local env.
- Tokens must never be logged.

## Prompt Injection Mitigation

- Keep system prompts authoritative.
- Treat PR text and comment text as untrusted.
- Keep prompts narrowly scoped to review tasks.
- Require structured output and reject invalid responses.

## Data Handling Rules

- Send only the minimum PR context required for the prompt.
- Do not send repository secrets, local files outside the PR context, or unrelated issue history.
- Redact sensitive runtime values from logs.

## Abuse Controls

- Handle only supported trigger events.
- Require explicit slash commands for manual reruns.
- Ignore non-relevant review threads.
- Bound retry counts and request timeouts.

## Deferred Security Work

These are intentionally out of scope for V1:

- forked PR support
- richer command authorization policy
- organization-wide audit storage
- per-team data residency controls
