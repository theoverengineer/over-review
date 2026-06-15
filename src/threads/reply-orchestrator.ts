/**
 * Review-thread reply orchestration.
 * @packageDocumentation
 */

import type { AIProvider } from '../contracts/provider';
import type { Config } from '../config/schema';
import { createReviewCommentReply, listReviewComments } from '../github/comments';
import type { GitHubClient } from '../github/client';
import { ThreadReplyOutputSchema, type ThreadReplyOutput } from '../prompts/schemas';
import { buildThreadReplyPrompt } from '../prompts/thread-reply';
import { appendInlineSignature } from '../render/hidden-state';
import type { Logger } from '../runtime/logger';
import { reconstructReviewThread } from './reconstruct';
import { isRelevantReviewThread } from './relevance';

export interface ThreadReplyOrchestratorOptions {
  client: GitHubClient;
  provider: AIProvider;
  config: Config;
  logger: Logger;
  dryRun?: boolean;
}

export interface ThreadReplyRequest {
  repoFullName: string;
  pullRequestNumber: number;
  commentId: number;
}

export interface ThreadReplyResult {
  handled: boolean;
  relevant: boolean;
  actionRequested: boolean;
  reason?: string;
  replyBody?: string;
  replyCommentId?: number;
}

export class ThreadReplyOrchestrator {
  constructor(private readonly options: ThreadReplyOrchestratorOptions) {}

  async run(request: ThreadReplyRequest): Promise<ThreadReplyResult> {
    const { client, provider, config, logger, dryRun } = this.options;
    const comments = await listReviewComments(
      client,
      request.repoFullName,
      request.pullRequestNumber
    );
    const thread = reconstructReviewThread(comments, request.commentId);

    if (!thread) {
      logger.warn('Review thread could not be reconstructed', {
        reason: 'thread_not_found',
      });

      return {
        handled: false,
        relevant: false,
        actionRequested: false,
        reason: 'Review thread could not be reconstructed',
      };
    }

    if (!isRelevantReviewThread(thread)) {
      logger.info('Irrelevant review thread skipped', {
        reason: 'irrelevant_thread',
      });

      return {
        handled: true,
        relevant: false,
        actionRequested: false,
        reason: 'Irrelevant review thread',
      };
    }

    const inference = await provider.runInference({
      prompt: buildThreadReplyPrompt({
        thread,
        styleGuideRules: config.STYLE_GUIDE_RULES,
      }),
      schema: ThreadReplyOutputSchema,
      schemaName: 'ThreadReply',
      schemaDescription: 'Structured pull request review thread reply',
      timeoutMs: config.LLM_TIMEOUT_MS,
      maxRetries: 2,
    });
    const reply = inference.output;

    if (!shouldPostReply(reply)) {
      logger.info('No action requested for review thread', {
        reason: 'no_action_requested',
      });

      return {
        handled: true,
        relevant: true,
        actionRequested: false,
        reason: 'No action requested',
      };
    }

    const replyBody = appendInlineSignature(
      ensureLeadingMention(reply.content.trim(), thread.latestComment.author)
    );

    let replyCommentId: number | undefined;

    if (!dryRun) {
      replyCommentId = await createReviewCommentReply(
        client,
        request.repoFullName,
        request.pullRequestNumber,
        thread.replyToCommentId,
        replyBody
      );
    }

    logger.info('Review thread reply prepared', {
      reason: dryRun ? 'dry_run' : 'posted',
    });

    return {
      handled: true,
      relevant: true,
      actionRequested: true,
      replyBody,
      replyCommentId,
    };
  }
}

function shouldPostReply(
  reply: ThreadReplyOutput
): reply is Extract<ThreadReplyOutput, { action_requested: true }> {
  return reply.action_requested && Boolean(reply.content?.trim());
}

function ensureLeadingMention(content: string, author: string): string {
  const expectedMention = `@${author}`;
  return content.startsWith(expectedMention) ? content : `${expectedMention} ${content}`;
}
