/**
 * over-review GitHub Action entrypoint.
 * @packageDocumentation
 */

import { readFileSync } from 'fs';
import { loadConfig } from './config';
import { GitHubClient } from './github/client';
import { createProvider } from './providers';
import { ReviewOrchestrator } from './review/orchestrator';
import { ThreadReplyOrchestrator } from './threads/reply-orchestrator';
import { createActionContext } from './runtime/action-context';
import { routeEvent } from './runtime/event-router';
import { createLogger } from './runtime/logger';
import type {
  GitHubEvent,
  IssueCommentEvent,
  PullRequestEvent,
  ReviewCommentEvent,
} from './runtime/types';

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
  const provider = createProvider({
    provider: config.LLM_PROVIDER,
    model: config.LLM_MODEL,
    apiKey: config.LLM_API_KEY,
    baseUrl: config.LLM_BASE_URL,
  });

  const result = await routeEvent(event, eventName, client);

  if (result.outcome.type === 'review') {
    if (eventName === 'pull_request' && 'pull_request' in event) {
      const orchestrator = new ReviewOrchestrator({
        client,
        provider,
        config,
        logger,
        dryRun: false,
      });
      const reviewResult = await orchestrator.runPullRequestReview({
        repoFullName: event.repository.full_name,
        pullRequestNumber: (event as PullRequestEvent).pull_request.number,
        forceFullReview: result.outcome.fullMode,
      });

      logger.info('Automatic review finished', {
        reviewMode: reviewResult.reviewMode,
        commitCount: reviewResult.commitCount,
        fileCount: reviewResult.fileCount,
        submittedCommentCount: reviewResult.inlineFindings.length,
        skippedCommentCount: reviewResult.skippedFindingCount,
        summarySuccess: Boolean(reviewResult.summary),
      });
    } else if (eventName === 'issue_comment' && 'issue' in event) {
      const orchestrator = new ReviewOrchestrator({
        client,
        provider,
        config,
        logger,
        dryRun: false,
      });
      const reviewResult = await orchestrator.runPullRequestReview({
        repoFullName: event.repository.full_name,
        pullRequestNumber: (event as IssueCommentEvent).issue.number,
        forceFullReview: result.outcome.fullMode,
      });

      logger.info('Manual review finished', {
        reviewMode: reviewResult.reviewMode,
        commitCount: reviewResult.commitCount,
        fileCount: reviewResult.fileCount,
        submittedCommentCount: reviewResult.inlineFindings.length,
        skippedCommentCount: reviewResult.skippedFindingCount,
        summarySuccess: Boolean(reviewResult.summary),
      });
    } else if (eventName === 'pull_request_review_comment' && 'comment' in event) {
      const orchestrator = new ThreadReplyOrchestrator({
        client,
        provider,
        config,
        logger,
        dryRun: false,
      });
      const replyResult = await orchestrator.run({
        repoFullName: event.repository.full_name,
        pullRequestNumber: (event as ReviewCommentEvent).pull_request.number,
        commentId: (event as ReviewCommentEvent).comment.id,
      });

      logger.info('Thread reply finished', {
        outcome: replyResult.actionRequested ? 'reply_posted' : 'reply_skipped',
        reason: replyResult.reason,
      });
    }
  }

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
