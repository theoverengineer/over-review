/**
 * over-review CLI entrypoint.
 * @packageDocumentation
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { loadConfig } from './config';
import type { Config } from './config/schema';
import { GitHubClient } from './github/client';
import { createProvider } from './providers';
import { ReviewOrchestrator } from './review/orchestrator';
import { ThreadReplyOrchestrator } from './threads/reply-orchestrator';
import { createCliContext } from './runtime/cli-context';
import { routeEvent } from './runtime/event-router';
import { createLogger } from './runtime/logger';
import type { GitHubEvent, SupportedEventName } from './runtime/types';

export interface CliOptions {
  event?: SupportedEventName | string;
  payload?: string;
  output?: string;
  listPrs: boolean;
  cliConfig: Partial<Config>;
}

export function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    listPrs: false,
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
        options.output = nextValue;
        index += 1;
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
      case '--list-prs':
        options.listPrs = true;
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

export async function runCli(args: string[] = process.argv.slice(2)): Promise<void> {
  const options = parseArgs(args);

  if (args.length === 0) {
    printUsage();
    return;
  }

  if (options.listPrs) {
    console.log('CLI PR listing is reserved for a later milestone.');
    return;
  }

  if (!options.event) {
    throw new Error('CLI requires --event.');
  }

  if (!options.payload) {
    throw new Error('CLI requires --payload.');
  }

  const config = loadConfig({ cli: options.cliConfig });
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
        forceFullReview: result.outcome.fullMode,
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
        forceFullReview: result.outcome.fullMode,
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

  if (options.output) {
    writeFileSync(resolve(process.cwd(), options.output), JSON.stringify(output, null, 2), 'utf8');
    logger.info('Wrote CLI output', { reason: options.output });
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

function printUsage(): void {
  console.log(`
over-review CLI

Usage:
  node dist/cli.js --event pull_request --payload payloads/pull-request-opened.json

Options:
  --event, -e <name>
  --payload, -p <path>
  --dry-run
  --out, --output <path>
  --full
  --github-token <token>
  --llm-model <model>
  --llm-api-key <key>
  --llm-base-url <url>
  --llm-timeout-ms <ms>
  --github-api-url <url>
  --github-server-url <url>
  --style-guide-rules <rules>
  --debug
  --list-prs
`);
}

if (require.main === module) {
  void runCli().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
