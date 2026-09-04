import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AIProxyClientError, callAIProxy } from '../aiProxyClient';

const getPreferredSupabaseTokenMock = vi.hoisted(() => vi.fn());

vi.mock('../authTokenService', () => ({
  authTokenService: {
    getPreferredSupabaseToken: getPreferredSupabaseTokenMock,
  },
}));

describe('aiProxyClient', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    getPreferredSupabaseTokenMock.mockResolvedValue('trusted-session-token');
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns server usage with the successful proxy response', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      result: '{"category":"FAMILY_QUERY","confidence":0.9}',
      model: 'test-model',
      usage: {
        used: 12,
        limit: 30,
        resetAt: '2026-10-01T00:00:00.000Z',
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));

    await expect(callAIProxy({
      operation: 'kindi_plan',
      data: { redactedText: '[NAME_1] family' },
    })).resolves.toMatchObject({
      usage: {
        used: 12,
        limit: 30,
        resetAt: '2026-10-01T00:00:00.000Z',
      },
    });
    expect(fetchMock).toHaveBeenCalledWith('/api/ai-proxy', expect.objectContaining({
      headers: expect.objectContaining({
        Authorization: 'Bearer trusted-session-token',
      }),
    }));
  });

  it('preserves the server error code for authoritative quota handling', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      error: {
        message: 'Monthly quota exceeded.',
        code: 'AI_USAGE_LIMIT_EXCEEDED',
      },
    }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    }));

    await expect(callAIProxy({
      operation: 'kindi_plan',
      data: { redactedText: '[NAME_1] family' },
    })).rejects.toEqual(expect.objectContaining<Partial<AIProxyClientError>>({
      name: 'AIProxyClientError',
      message: 'Monthly quota exceeded.',
      code: 'AI_USAGE_LIMIT_EXCEEDED',
      status: 429,
    }));
  });

  it('forwards cancellation to fetch and stops before authentication when already aborted', async () => {
    getPreferredSupabaseTokenMock.mockClear();
    const activeController = new AbortController();
    fetchMock.mockImplementationOnce((_input, init?: RequestInit) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true });
    }));

    const requestPromise = callAIProxy({
      operation: 'kindi_plan',
      data: { redactedText: '[NAME_1] family' },
    }, { signal: activeController.signal });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(fetchMock.mock.calls[0][1]).toEqual(expect.objectContaining({
      signal: activeController.signal,
    }));

    activeController.abort();
    await expect(requestPromise).rejects.toMatchObject({ name: 'AbortError' });

    const abortedController = new AbortController();
    abortedController.abort();
    await expect(callAIProxy({
      operation: 'kindi_plan',
      data: { redactedText: '[NAME_1] family' },
    }, { signal: abortedController.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(getPreferredSupabaseTokenMock).toHaveBeenCalledTimes(1);
  });
});
