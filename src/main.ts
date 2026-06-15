/**
 * over-review GitHub Action entrypoint.
 * @packageDocumentation
 */

import { readFileSync } from 'fs';
import { loadConfig } from './config';
import { GitHubClient } from './github/client';
import { createActionContext } from './runtime/action-context';
import { routeEvent } from './runtime/event-router';
import { createLogger } from './runtime/logger';
import type { GitHubEvent } from './runtime/types';

export async function main(): Promise<void> {
  const eventName = process.env.GITHUB_EVENT_NAME;
  const eventPath = process.env.GITHUB_EVENT_PATH;

  if (!eventName) {
    throw new Error('GITHUB_EVENT_NAME is not set.');
  }

  if (!eventPath) {
    throw new Error('GITHUB_EVENT_PATH is not set.');
  }

  const config = loadConfig();
  const event = loadEventPayload(eventPath);
  const context = createActionContext(eventName, event);
  const logger = createLogger(
    {
      eventName,
      repo: context.repo,
      prNumber: context.prNumber,
      dryRun: false,
      provider: config.LLM_PROVIDER,
      model: config.LLM_MODEL,
    },
    config.DEBUG ? 'debug' : 'info'
  );

  logger.info('Starting action run');

  const client = new GitHubClient({
    token: config.GITHUB_TOKEN,
    baseUrl: config.GITHUB_API_URL,
    debug: config.DEBUG,
  });

  const result = await routeEvent(event, eventName, client);

  logger.info('Action run completed', {
    outcome: result.outcome.type,
    reason: result.outcome.reason,
  });

  if (!result.handled) {
    logger.warn('Event was not handled', {
      outcome: result.outcome.type,
      reason: result.outcome.reason,
    });
  }
}

function loadEventPayload(eventPath: string): GitHubEvent {
  try {
    return JSON.parse(readFileSync(eventPath, 'utf8')) as GitHubEvent;
  } catch (error) {
    throw Object.assign(
      new Error(
        `Failed to read GitHub event payload from ${eventPath}: ${error instanceof Error ? error.message : String(error)}`
      ),
      { cause: error }
    );
  }
}

if (require.main === module) {
  void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
