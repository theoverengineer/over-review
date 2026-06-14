# Configuration And Deployment

## Runtime Modes

- GitHub Action
- Local CLI

## Required Configuration

| Variable | Purpose |
| --- | --- |
| `GITHUB_TOKEN` | GitHub API authentication |
| `LLM_MODEL` | Selected model identifier |
| `LLM_API_KEY` | API key for the configured `ai-sdk` model/provider |

## Optional Configuration

| Variable | Purpose |
| --- | --- |
| `LLM_BASE_URL` | Custom OpenAI-compatible base URL |
| `STYLE_GUIDE_RULES` | Repository-specific review rules |
| `GITHUB_API_URL` | Alternate API URL |
| `GITHUB_SERVER_URL` | Alternate server URL |
| `DEBUG` | Enable local debug context |
| `DRY_RUN` | Skip GitHub write operations |
| `FULL_REVIEW` | Force full review |

## Action Wiring

Recommended workflow triggers:

```yaml
on:
  pull_request:
    types: [opened, synchronize]
  pull_request_review_comment:
    types: [created]
  issue_comment:
    types: [created]
```

Required permissions:

```yaml
permissions:
  contents: read
  pull-requests: write
  issues: write
```

## Action Inputs

The implementation should support action inputs for:

- `style_guide_rules`
- `github_api_url`
- `github_server_url`
- `llm_model`
- `llm_base_url`

The current repository does not declare all LLM inputs in `action.yml`; the rebuild should make declared inputs and runtime config consistent.

## Configuration Precedence

Recommended order:

1. explicit CLI flags
2. environment variables
3. action inputs
4. `.env` file for local development only

## CLI Behavior

Supported commands:

- `npm run review -- --list-prs --state open --limit 5`
- `npm run review -- --pr 123 --dry-run`
- `npm run review -- --pr 123 --dry-run --out`
- `npm run review -- --pr 123 --full`
- `npm run review -- --pr 123 --owner myorg --repo myrepo --dry-run`

CLI requirements:

- resolve GitHub token from env first, then `gh auth token`
- simulate GitHub context for local runs
- preserve the same review logic as the action path

## Deployment Constraints

- Same-repo PRs only in V1
- Fork PRs are silently skipped with no review, comment, or reaction
- No checkout of untrusted PR code required for core review flow
- Diff and metadata fetched through GitHub APIs

## Recommended Defaults

- V1 ships only the default `ai-sdk` provider
- dry-run off by default
- incremental review on by default
- title regeneration off unless explicit mention is present
