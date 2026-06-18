/**
 * over-review CLI entrypoint.
 * @packageDocumentation
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'child_process';
import {
  loadConfigWithMetadata,
  loadLocalEnv,
  type ConfigSource,
  type ConfigSourceMetadata,
} from './config';
import type { Config } from './config/schema';
import { GitHubClient } from './github/client';
import { createProvider } from './providers';
import { ReviewOrchestrator } from './review/orchestrator';
import { ThreadReplyOrchestrator } from './threads/reply-orchestrator';
import { createCliContext } from './runtime/cli-context';
import { routeEvent } from './runtime/event-router';
import { createLogger } from './runtime/logger';
import type { GitHubEvent, SupportedEventName } from './runtime/types';
import {
  listPullRequests as listPrs,
  fetchPullRequestIdentityByNumber,
  type ListPullRequestResult,
} from './github/pull-requests';

export interface CliOptions {
  event?: SupportedEventName | string;
  payload?: string;
  output?: string;
  writeOutput: boolean;
  listPrs: boolean;
  prNumber?: number;
  owner?: string;
  repo?: string;
  state?: string;
  limit?: number;
  env?: string | false;
  cliConfig: Partial<Config>;
}

/**
 * Log config sources for debugging without exposing secret values.
 */
function logConfigSources(
  logger: import('./runtime/logger').Logger,
  metadata: ConfigSourceMetadata
): void {
  logger.debug(`Resolved CLI config sources: ${JSON.stringify(metadata)}`);
}

interface GitHubTokenResolution {
  source: ConfigSource | 'missing';
  token?: string;
}

export function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    writeOutput: false,
    listPrs: false,
    env: undefined,
    cliConfig: {
      REVIEW_MODE: 'cli',
    },
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const nextValue = args[index + 1];

    switch (arg) {
      case '--event':
      case '-e':
        options.event = nextValue;
        index += 1;
        break;
      case '--payload':
      case '-p':
        options.payload = nextValue;
        index += 1;
        break;
      case '--out':
      case '--output':
        options.writeOutput = true;
        if (nextValue && !nextValue.startsWith('-')) {
          options.output = nextValue;
          index += 1;
        }
        break;
      case '--github-token':
        options.cliConfig.GITHUB_TOKEN = nextValue;
        index += 1;
        break;
      case '--llm-model':
        options.cliConfig.LLM_MODEL = nextValue;
        index += 1;
        break;
      case '--llm-api-key':
        options.cliConfig.LLM_API_KEY = nextValue;
        index += 1;
        break;
      case '--llm-base-url':
        options.cliConfig.LLM_BASE_URL = nextValue;
        index += 1;
        break;
      case '--llm-timeout-ms':
        options.cliConfig.LLM_TIMEOUT_MS = Number(nextValue);
        index += 1;
        break;
      case '--llm-structured-outputs':
        options.cliConfig.LLM_STRUCTURED_OUTPUTS = parseBooleanFlag(nextValue);
        index += 1;
        break;
      case '--github-api-url':
        options.cliConfig.GITHUB_API_URL = nextValue;
        index += 1;
        break;
      case '--github-server-url':
        options.cliConfig.GITHUB_SERVER_URL = nextValue;
        index += 1;
        break;
      case '--style-guide-rules':
        options.cliConfig.STYLE_GUIDE_RULES = nextValue;
        index += 1;
        break;
      case '--dry-run':
        options.cliConfig.DRY_RUN = true;
        break;
      case '--full':
        options.cliConfig.FULL_REVIEW = true;
        break;
      case '--debug':
        options.cliConfig.DEBUG = true;
        break;
      case '--no-structured-outputs':
        options.cliConfig.LLM_STRUCTURED_OUTPUTS = false;
        break;
      case '--list-prs':
        options.listPrs = true;
        break;
      case '--env':
        options.env = nextValue;
        index += 1;
        break;
      case '--pr':
        options.prNumber = Number(nextValue);
        index += 1;
        break;
      case '--owner':
        options.owner = nextValue;
        index += 1;
        break;
      case '--repo':
        options.repo = nextValue;
        index += 1;
        break;
      case '--state':
        options.state = nextValue;
        index += 1;
        break;
      case '--limit':
        options.limit = Number(nextValue);
        index += 1;
        break;
      case '--help':
      case '-h':
        printUsage();
        process.exit(0);
        break;
      default:
        break;
    }
  }

  return options;
}

function parseBooleanFlag(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (['true', 'yes', '1', 'on'].includes(normalized)) {
    return true;
  }
  if (['false', 'no', '0', 'off'].includes(normalized)) {
    return false;
  }
  throw new Error(`Invalid boolean value: "${value}". Expected true/false, yes/no, 1/0, on/off.`);
}

export async function runCli(args: string[] = process.argv.slice(2)): Promise<void> {
  const options = parseArgs(args);

  if (args.length === 0) {
    printUsage();
    return;
  }

  if (options.listPrs) {
    await listPullRequests(options);
    return;
  }

  if (typeof options.prNumber === 'number') {
    await runPrReview(options);
    return;
  }

  if (!options.event) {
    throw new Error('CLI requires --event or --pr.');
  }

  if (!options.payload) {
    throw new Error('CLI requires --payload.');
  }

  // CLI does not load .env by default; only load when --env is specified
  const envFilePath = options.env !== undefined ? options.env : false;

  const { config, metadata } = loadConfigWithMetadata({
    cli: options.cliConfig,
    envFilePath,
  });
  const event = loadEventPayload(options.payload);
  const context = createCliContext({
    eventName: options.event,
    event,
    dryRun: config.DRY_RUN,
    outputPath: options.output,
  });
  const logger = createLogger(
    {
      eventName: options.event,
      repo: context.repo,
      prNumber: context.prNumber,
      dryRun: context.isDryRun,
      provider: config.LLM_PROVIDER,
      model: config.LLM_MODEL,
    },
    config.DEBUG ? 'debug' : 'info'
  );

  // Debug log for config sources (without exposing secrets)
  if (config.DEBUG) {
    logConfigSources(logger, metadata);
  }

  logger.info('Starting CLI run');

  const client = new GitHubClient({
    token: config.GITHUB_TOKEN,
    baseUrl: config.GITHUB_API_URL,
    debug: config.DEBUG,
  });
  const provider = createProvider({
    provider: config.LLM_PROVIDER,
    model: config.LLM_MODEL,
    apiKey: config.LLM_API_KEY,
    baseUrl: config.LLM_BASE_URL,
    structuredOutputs: config.LLM_STRUCTURED_OUTPUTS,
  });

  const result = await routeEvent(event, options.event, client);

  if (result.outcome.type === 'skip' && result.outcome.reason === 'Fork PR silently skipped') {
    logger.info('Fork PR silently skipped', {
      prNumber: result.outcome.prNumber,
    });
    return;
  }

  let output: unknown = result;

  if (result.outcome.type === 'review') {
    if (options.event === 'pull_request' && 'pull_request' in event) {
      const orchestrator = new ReviewOrchestrator({
        client,
        provider,
        config,
        logger,
        dryRun: context.isDryRun,
      });

      output = await orchestrator.runPullRequestReview({
        repoFullName: event.repository.full_name,
        pullRequestNumber: event.pull_request.number,
        forceFullReview: result.outcome.fullMode || config.FULL_REVIEW,
      });
    } else if (options.event === 'issue_comment' && 'issue' in event) {
      const orchestrator = new ReviewOrchestrator({
        client,
        provider,
        config,
        logger,
        dryRun: context.isDryRun,
      });

      output = await orchestrator.runPullRequestReview({
        repoFullName: event.repository.full_name,
        pullRequestNumber: event.issue.number,
        forceFullReview: result.outcome.fullMode || config.FULL_REVIEW,
      });
    } else if (
      options.event === 'pull_request_review_comment' &&
      'pull_request' in event &&
      'comment' in event
    ) {
      const orchestrator = new ThreadReplyOrchestrator({
        client,
        provider,
        config,
        logger,
        dryRun: context.isDryRun,
      });

      output = await orchestrator.run({
        repoFullName: event.repository.full_name,
        pullRequestNumber: event.pull_request.number,
        commentId: event.comment.id,
      });
    }
  }

  logger.info('CLI run completed', {
    outcome: result.outcome.type,
    reason: result.outcome.reason,
  });

  const outputPath = resolveOutputPath(options, context.repo, context.prNumber);
  if (outputPath) {
    writeFileSync(resolve(process.cwd(), outputPath), JSON.stringify(output, null, 2), 'utf8');
    logger.info('Wrote CLI output', { filePath: outputPath });
  }
}

function loadEventPayload(payloadPath: string): GitHubEvent {
  try {
    return JSON.parse(readFileSync(resolve(process.cwd(), payloadPath), 'utf8')) as GitHubEvent;
  } catch (error) {
    throw Object.assign(
      new Error(
        `Failed to read CLI payload from ${payloadPath}: ${error instanceof Error ? error.message : String(error)}`
      ),
      { cause: error }
    );
  }
}

/**
 * Resolve GitHub token from explicit flag/env first, then actual env, then env file (if specified), then `gh auth token` as fallback.
 * When envFilePath is undefined, .env is NOT loaded (CLI default behavior).
 * Precedence: CLI flag > process.env > .env file (if --env specified) > gh auth token
 */
function resolveGitHubToken(token?: string, envFilePath?: string | false): GitHubTokenResolution {
  if (token && token.trim() !== '') {
    return { token: token.trim(), source: 'cli' };
  }

  const envToken = process.env.GITHUB_TOKEN?.trim();
  if (envToken) {
    return { token: envToken, source: 'env' };
  }

  if (envFilePath !== undefined && envFilePath !== false) {
    const localEnvToken = getLocalEnvGitHubToken(envFilePath);
    if (localEnvToken) {
      return { token: localEnvToken, source: 'env-file' };
    }
  }

  const ghAuthToken = getGhAuthToken();
  if (ghAuthToken) {
    return { token: ghAuthToken, source: 'gh-auth' };
  }

  return { source: 'missing' };
}

/**
 * Get GitHub token from an explicit env file path.
 */
function getLocalEnvGitHubToken(envFilePath?: string): string | undefined {
  try {
    return loadLocalEnv(process.cwd(), envFilePath).GITHUB_TOKEN?.trim();
  } catch {
    return undefined;
  }
}

/**
 * Get GitHub token from `gh auth token` command.
 * Returns undefined if gh CLI is not available or fails.
 */
function getGhAuthToken(): string | undefined {
  try {
    const token = execSync('gh auth token', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();
    return token || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Fetch and list pull requests for a repository.
 */
async function listPullRequests(options: CliOptions): Promise<void> {
  const owner = options.owner;
  const repo = options.repo;

  if (!owner || !repo) {
    throw new Error('--list-prs requires --owner and --repo.');
  }

  const tokenResolution = resolveGitHubToken(options.cliConfig.GITHUB_TOKEN, options.env);

  const client = new GitHubClient({
    token: tokenResolution.token,
    baseUrl: options.cliConfig.GITHUB_API_URL,
    debug: options.cliConfig.DEBUG,
  });

  const state = (options.state as 'open' | 'closed' | 'all' | undefined) || 'open';
  const limit = options.limit || 10;

  try {
    const prs = await listPrs(client, {
      owner,
      repo,
      state,
      limit,
    });

    printPullRequestList(prs, owner, repo, state, limit);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw Object.assign(new Error(`Failed to list PRs: ${message}`), { cause: error });
  }
}

/**
 * Run a direct PR review using the PR number instead of an event payload.
 */
async function runPrReview(options: CliOptions): Promise<void> {
  const prNumber = options.prNumber;
  if (typeof prNumber !== 'number') {
    throw new Error('--pr requires a valid PR number.');
  }

  const owner = options.owner;
  const repo = options.repo;

  if (!owner || !repo) {
    throw new Error('--pr requires --owner and --repo.');
  }

  const tokenResolution = resolveGitHubToken(options.cliConfig.GITHUB_TOKEN, options.env);

  const client = new GitHubClient({
    token: tokenResolution.token,
    baseUrl: options.cliConfig.GITHUB_API_URL,
    debug: options.cliConfig.DEBUG,
  });

  // Fetch PR identity using shared helper
  const prIdentity = await fetchPullRequestIdentityByNumber(client, owner, repo, prNumber);

  if (!prIdentity) {
    throw new Error(`Failed to fetch PR #${prNumber} for ${owner}/${repo}`);
  }

  // Fork PR silently skip - exit quietly with no writes and no output
  if (prIdentity.isFork) {
    return;
  }

  // CLI does not load .env by default; only load when --env is specified
  const envFilePath = options.env !== undefined ? options.env : false;

  const { config, metadata } = loadConfigWithMetadata({
    cli: { ...options.cliConfig, GITHUB_TOKEN: tokenResolution.token },
    envFilePath,
  });
  metadata.sources.GITHUB_TOKEN =
    tokenResolution.source === 'missing' ? 'default' : tokenResolution.source;
  const repoFullName = `${owner}/${repo}`;

  const logger = createLogger(
    {
      eventName: 'pull_request',
      repo: repoFullName,
      prNumber,
      dryRun: config.DRY_RUN,
      provider: config.LLM_PROVIDER,
      model: config.LLM_MODEL,
    },
    config.DEBUG ? 'debug' : 'info'
  );

  // Debug log for config sources (without exposing secrets)
  if (config.DEBUG) {
    logConfigSources(logger, metadata);
  }

  logger.info('Starting CLI PR review');

  const provider = createProvider({
    provider: config.LLM_PROVIDER,
    model: config.LLM_MODEL,
    apiKey: config.LLM_API_KEY,
    baseUrl: config.LLM_BASE_URL,
    structuredOutputs: config.LLM_STRUCTURED_OUTPUTS,
  });

  const orchestrator = new ReviewOrchestrator({
    client,
    provider,
    config,
    logger,
    dryRun: config.DRY_RUN,
  });

  const result = await orchestrator.runPullRequestReview({
    repoFullName,
    pullRequestNumber: prNumber,
    forceFullReview: config.FULL_REVIEW,
  });

  const output: unknown = result;

  logger.info('CLI PR review completed', {
    outcome: 'review',
    reviewMode: result.reviewMode,
  });

  const outputPath = resolveOutputPath(options, repoFullName, prNumber);
  if (outputPath) {
    writeFileSync(resolve(process.cwd(), outputPath), JSON.stringify(output, null, 2), 'utf8');
    logger.info('Wrote CLI output', { filePath: outputPath });
  }
}

/**
 * Get default output path for CLI PR review.
 */
function getDefaultOutputPath(owner: string, repo: string, prNumber: number): string {
  const safeOwner = owner.replace('/', '-');
  const safeRepo = repo.replace('/', '-');
  return `over-review-${safeOwner}-${safeRepo}-pr-${prNumber}.json`;
}

/**
 * Print output for a list of PRs.
 */
function resolveOutputPath(
  options: Pick<CliOptions, 'writeOutput' | 'output'>,
  repoFullName: string,
  prNumber?: number
): string | undefined {
  if (!options.writeOutput) {
    return undefined;
  }

  if (options.output) {
    return options.output;
  }

  if (!prNumber) {
    return 'over-review-output.json';
  }

  const [owner = 'repo', repo = 'pull-request'] = repoFullName.split('/');
  return getDefaultOutputPath(owner, repo, prNumber);
}

function printPullRequestList(
  prs: ListPullRequestResult[],
  owner: string,
  repo: string,
  state: 'open' | 'closed' | 'all',
  limit: number
): void {
  console.log(`Pull requests for ${owner}/${repo} (state: ${state}, limit: ${limit}):`);
  console.log('');

  for (const pr of prs) {
    const forkIndicator = pr.isFork ? ' [fork]' : '';
    console.log(`  #${pr.number}: ${pr.title}${forkIndicator}`);
  }
}

function printUsage(): void {
  console.log(`
over-review CLI

Usage:
  node dist/cli.js --event pull_request --payload payloads/pull-request-opened.json
  node dist/cli.js --list-prs --owner <owner> --repo <repo> [--state open|closed|all] [--limit <n>]
  node dist/cli.js --pr <number> --owner <owner> --repo <repo> [--dry-run] [--out [path]]

Options:
  --event, -e <name>           GitHub event name (e.g., pull_request)
  --payload, -p <path>         Path to event payload JSON file
  --dry-run                    Perform a dry run without writing to GitHub
  --out, --output [path]       Write JSON output, optionally to a custom path
  --full                       Perform a full review
  --github-token <token>       GitHub personal access token
  --llm-model <model>          LLM model name
  --llm-api-key <key>          LLM API key
  --llm-base-url <url>         LLM base URL
  --llm-timeout-ms <ms>        LLM timeout in milliseconds
  --llm-structured-outputs <true|false>
  --no-structured-outputs
  --github-api-url <url>       GitHub API URL
  --github-server-url <url>    GitHub server URL
  --style-guide-rules <rules>  Style guide rules
  --env <path>                 Path to .env file to use (default: none)
  --debug                      Enable debug logging
  --list-prs                   List pull requests for a repository
  --pr <number>                Run review for a specific PR number
  --owner <owner>              Repository owner (required for --list-prs and --pr)
  --repo <repo>                Repository name (required for --list-prs and --pr)
  --state <state>              PR state filter for --list-prs (open|closed|all)
  --limit <n>                  Maximum number of PRs to list
  --help, -h                   Show this help message
`);
}

if (require.main === module) {
  void runCli().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
