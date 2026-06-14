/**
 * over-review - GitHub Action entrypoint
 * Handles GitHub events and routes them to appropriate handlers
 * @packageDocumentation
 */

import { readFileSync } from 'fs';
import { GitHubClient } from './github/client';
import { routeEvent } from './runtime/event-router';
import type { GitHubEvent } from './runtime/types';

/**
 * Main entrypoint for the GitHub Action.
 * Reads the event from GITHUB_EVENT_PATH and routes it appropriately.
 */
export async function main(): Promise<void> {
  const eventName = process.env.GITHUB_EVENT_NAME;
  const eventPath = process.env.GITHUB_EVENT_PATH;

  if (!eventName) {
    console.error('Error: GITHUB_EVENT_NAME is not set');
    process.exit(1);
  }

  if (!eventPath) {
    console.error('Error: GITHUB_EVENT_PATH is not set');
    process.exit(1);
  }

  let event: GitHubEvent;
  try {
    const eventRaw = readFileSync(eventPath, 'utf8');
    event = JSON.parse(eventRaw) as GitHubEvent;
  } catch (error) {
    console.error(`Error reading event file ${eventPath}:`, error);
    process.exit(1);
  }

  // Create a GitHub client if a token is available (for PR identity lookup)
  const client = process.env.GITHUB_TOKEN
    ? new GitHubClient({ token: process.env.GITHUB_TOKEN })
    : undefined;

  const result = await routeEvent(event, eventName, client);
  logOutcome(result.outcome);

  if (!result.handled) {
    console.warn(`Warning: Event ${eventName} was not handled`);
  }
}

/**
 * Log the outcome of event processing.
 */
function logOutcome(outcome: {
  type: string;
  reason?: string;
  prNumber?: number;
  actor?: string;
}): void {
  console.log(
    JSON.stringify({
      outcome: outcome.type,
      prNumber: outcome.prNumber,
      actor: outcome.actor,
      reason: outcome.reason,
    })
  );
}

if (require.main === module) {
  void main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
