import { describe, expect, it, vi } from 'vitest';

import { routeEvent } from '../../../src/runtime/event-router';
import type { GitHubClient } from '../../../src/github/client';
import type { IssueCommentEvent } from '../../../src/runtime/types';

describe('integration/action issue_comment unauthorized', () => {
  it('returns only an eyes reaction outcome and does not start review work', async () => {
    const event: IssueCommentEvent = {
      action: 'created',
      repository: {
        full_name: 'owner/repo',
        name: 'repo',
        owner: { login: 'owner', type: 'Organization' },
      },
      issue: {
        number: 123,
        title: 'PR title',
        pull_request: { url: 'https://api.github.com/repos/owner/repo/pulls/123' },
        author_association: 'NONE',
      },
      comment: {
        id: 456,
        body: '/review',
        user: { login: 'outsider' },
        author_association: 'NONE',
      },
      sender: { login: 'outsider', type: 'User' },
    };

    const client = {
      get: vi.fn(),
    } as unknown as GitHubClient;

    const result = await routeEvent(event, 'issue_comment', client);

    expect(result.outcome).toMatchObject({
      type: 'unauthorized',
      command: '/review',
      eyesReaction: true,
    });
    expect(client.get).not.toHaveBeenCalled();
  });
});
