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
| `LLM_PROVIDER` | LLM provider (ai-sdk only in V1) |
| `STYLE_GUIDE_RULES` | Repository-specific review rules |
| `GITHUB_API_URL` | Alternate API URL |
| `GITHUB_SERVER_URL` | Alternate server URL |
| `DEBUG` | Enable debug logging |
| `DRY_RUN` | Skip GitHub write operations |
| `FULL_REVIEW` | Force full review |
| `REVIEW_MODE` | Review mode: auto, manual, or cli |
| `LLM_TIMEOUT_MS` | Timeout in milliseconds for LLM requests |
| `LLM_STRUCTURED_OUTPUTS` | Enable structured JSON outputs |

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

The action supports the following inputs:

- `github-token` - GitHub token for API authentication, typically wired from `${{ github.token }}`
- `llm-model` - LLM model to use for review
- `llm-api-key` - API key for the LLM provider
- `llm-base-url` - Base URL for the LLM API
- `llm-provider` - LLM provider (ai-sdk only in V1)
- `review-mode` - Review mode: auto, manual, or cli
- `full-mode` - Force full review instead of incremental
- `llm-structured-outputs` - Enable structured JSON outputs
- `style-guide-rules` - Additional repository-specific review guidance
- `llm-timeout-ms` - Timeout in milliseconds for LLM requests
- `github-api-url` - GitHub API URL for custom endpoints
- `github-server-url` - GitHub server URL for GitHub Enterprise
- `debug` - Enable debug logging
- `dry-run` - Skip GitHub write operations

## Configuration Precedence

Recommended order:

1. explicit CLI flags
2. environment variables
3. action inputs
4. `.env` file for local development only

## CLI Behavior

Supported commands:

- `node dist/cli.js --list-prs --owner <owner> --repo <repo> --state open --limit 5`
- `node dist/cli.js --pr 123 --owner <owner> --repo <repo> --dry-run`
- `node dist/cli.js --pr 123 --owner <owner> --repo <repo> --dry-run --out`
- `node dist/cli.js --pr 123 --owner <owner> --repo <repo> --full`
- `node dist/cli.js --pr 123 --owner <owner> --repo <repo> --dry-run`

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
