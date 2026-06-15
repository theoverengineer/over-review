# over-review

AI-powered Pull Request reviewer using your own model. Supports automatic PR reviews, incremental reviews, manual `/review` commands, and review-thread replies. Bring Your Own Model from any OpenAI-compatible provider.

`over-review` reads GitHub credentials from environment variables and LLM settings from either action inputs, environment variables, or local CLI flags.

## What It Does

- **Automatic PR Review**: Triggers on `pull_request` (opened, synchronize) and `pull_request_review_comment` (created) events
- **Manual Review**: Run `/review` or `/ai-review` on PR comments to trigger reviews
- **Incremental Reviews**: Uses hidden state in overview comments to review only new commits
- **PR Summary**: Generates a summary comment with file overview table
- **Inline Comments**: Posts actionable findings as inline review comments
- **Thread Replies**: Responds in relevant review threads
- **PR Title Regeneration**: Updates PR title when explicitly mentioned with `@overreview`
- **Local CLI**: Dry-run mode for testing and debugging locally

## Basic GitHub Actions Setup

```yaml
name: PR Review

on:
  pull_request:
    types: [opened, synchronize]
  pull_request_review_comment:
    types: [created]
  issue_comment:
    types: [created]

permissions:
  contents: read
  pull-requests: write
  issues: write

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: over-review
        uses: theoverengineer/over-review@v1
        env:
          GITHUB_TOKEN: ${{ github.token }}
        with:
          llm-model: gpt-4o-mini
          llm-api-key: ${{ secrets.LLM_API_KEY }}
          llm-base-url: https://openrouter.ai/api/v1
```

## Configuration

### Required GitHub Environment Variables

| Environment Variable | Description |
|----------------------|-------------|
| `GITHUB_TOKEN` | Token used for GitHub API reads, review submission, comments, and PR title updates |

The action currently reads `GITHUB_TOKEN` from the environment, not from a `with:` input.

### Required LLM Inputs / Environment Variables

| Input | Environment Variable | Description |
|-------|---------------------|-------------|
| `llm-model` | `LLM_MODEL` | LLM model to use (e.g., `gpt-4o-mini`, `claude-3.5-sonnet`, `deepseek/deepseek-v4-flash`) |
| `llm-api-key` | `LLM_API_KEY` | API key for your LLM provider |

### Optional Inputs / Environment Variables

| Input | Environment Variable | Default | Description |
|-------|---------------------|---------|-------------|
| `llm-base-url` | `LLM_BASE_URL` | - | Base URL for OpenAI-compatible APIs (e.g., `https://openrouter.ai/api/v1`) |
| `llm-structured-outputs` | `LLM_STRUCTURED_OUTPUTS` | `true` | Enable schema-based structured JSON outputs for custom OpenAI-compatible endpoints |
| `llm-timeout-ms` | `LLM_TIMEOUT_MS` | `30000` | Timeout in milliseconds (0 = disable) |
| `full-mode` | `FULL_REVIEW` | `false` | Force full review instead of incremental |
| `review-mode` | `REVIEW_MODE` | `auto` | Review mode label: `auto`, `manual`, or `cli` |
| `style-guide-rules` | `STYLE_GUIDE_RULES` | - | Additional repository-specific review guidance text appended to the review prompt |
| `github-api-url` | `GITHUB_API_URL` | `https://api.github.com` | GitHub API URL (for GitHub Enterprise) |
| `github-server-url` | `GITHUB_SERVER_URL` | `https://github.com` | GitHub server URL (for GitHub Enterprise) |
| `debug` | `DEBUG` | `false` | Enable debug logging |
| `dry-run` | `DRY_RUN` | `false` | Skip GitHub write operations |

### Configuration Precedence

Configuration values are resolved in this order (highest to lowest priority):

1. **CLI flags** (when running locally)
2. **Environment variables** (e.g., `LLM_MODEL`, `GITHUB_TOKEN`)
3. **Action inputs** (in `action.yml`)
4. **Local `.env` file** (development only)

## Key Configuration Details

### `LLM_BASE_URL` / `llm-base-url`

Specify a custom OpenAI-compatible API endpoint. This is the setting to use for providers such as OpenRouter, DeepSeek-compatible gateways, LM Studio, or your own OpenAI-format proxy:

```yaml
with:
  llm-base-url: https://openrouter.ai/api/v1
```

Or via environment variable:
```bash
LLM_BASE_URL=https://openrouter.ai/api/v1
```

### `LLM_STRUCTURED_OUTPUTS` / `llm-structured-outputs`

Controls whether to use structured JSON outputs from the LLM on custom OpenAI-compatible endpoints. **Set to `false` if your provider does not support schema-based structured outputs.**

- **Default**: `true`
- **Set to `false` for**: Custom OpenAI-compatible endpoints that warn on JSON schema or structured output requests
- **Effect when disabled**: The provider skips schema-based output requests and falls back to plain-text JSON extraction

For official providers without `llm-base-url`, the AI SDK structured output path is still used.

### `REVIEW_MODE`

Accepted values:

- `auto` (default)
- `manual`
- `cli`

This value is part of the shared config surface. In practice, GitHub event routing determines most runtime behavior, and the CLI sets `cli` automatically.

### `FULL_REVIEW` / `full-mode`

Force a full review instead of incremental:

```yaml
with:
  full-mode: 'true'
```

When enabled, the action reviews all files in the PR regardless of prior state.

### `DEBUG`

Enable verbose logging for troubleshooting:

```yaml
with:
  debug: 'true'
```

### `DRY_RUN`

Run without writing review comments, PR updates, or other GitHub writes (useful for testing):

```yaml
with:
  dry-run: 'true'
```

### `LLM_TIMEOUT_MS`

Set request timeout in milliseconds. Use `0` to disable timeout:

```yaml
with:
  llm-timeout-ms: '60000'  # 60 seconds
```

## Minimal CLI / Development Usage

The action can be run locally for testing:

```bash
# Install dependencies
npm install

# Build
npm run build

# Run with event payload
GITHUB_TOKEN=github-token \
LLM_MODEL=gpt-4o-mini \
LLM_API_KEY=provider-key \
node dist/cli.js --event pull_request --payload payloads/pull-request-opened.json

# With options
node dist/cli.js \
  --event pull_request \
  --payload payloads/pull-request-opened.json \
  --dry-run \
  --full \
  --out result.json
```

### CLI Options

```
--event, -e <name>           Event name (e.g., pull_request, issue_comment)
--payload, -p <path>         Path to event payload JSON file
--dry-run                    Skip GitHub writes
--out, --output <path>       Save output to file
--full                       Force full review
--github-token <token>       GitHub token
--llm-model <model>          LLM model
--llm-api-key <key>          LLM API key
--llm-base-url <url>         LLM base URL
--llm-timeout-ms <ms>        LLM timeout in ms
--llm-structured-outputs <true\|false>
--no-structured-outputs      Disable structured outputs
--github-api-url <url>       GitHub API URL
--github-server-url <url>    GitHub server URL
--style-guide-rules <rules>  Additional review guidance text
--debug                      Enable debug logging
--list-prs                   List PRs (reserved for future)
--help, -h                   Show help
```

## Supported Events

| Event | Action | Behavior |
|-------|--------|----------|
| `pull_request` (opened, synchronize) | Automatic review | Reviews same-repo PRs incrementally or fully |
| `issue_comment` (created) | `/review` command | Manual review via comment |
| `pull_request_review_comment` (created) | Thread reply | Replies in relevant review threads |

## Notes

- **Same-repo only**: Fork PRs are silently skipped (no review, comment, or reaction)
- **Ignore markers**: Add `@overreview skip` or `@overreview ignore` to PR title/body to skip review
- **Title regeneration**: Only happens when PR title explicitly mentions `@overreview`
- **Manual commands**: Supported PR comment commands are `/review`, `/ai-review`, and their `--full` variants
- **Provider**: V1 supports only `ai-sdk`
