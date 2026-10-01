import { afterEach, describe, expect, it, vi } from 'vitest';
import { isAccountSessionActive } from '../accountSession';

describe('account session server gate', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('uses only the caller bearer, no service role, no cache and no redirects', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('true'));
    vi.stubGlobal('fetch', fetchMock);
    expect(await isAccountSessionActive('signed-token', 'https://project.supabase.co/', 'anon-key')).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith('https://project.supabase.co/rest/v1/rpc/is_my_account_session_active', {
      method: 'POST', headers: { apikey: 'anon-key', Authorization: 'Bearer signed-token', 'Content-Type': 'application/json' },
      body: '{}', cache: 'no-store', redirect: 'error', signal: expect.any(AbortSignal),
    });
  });
  it.each(['false', 'null', '"true"', '{}', '[true]', 'not-json'])(
    'fails closed for %s instead of coercing truthiness', async body => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body)));
      expect(await isAccountSessionActive('token', 'https://project.supabase.co', 'key')).toBe(false);
    }
  );
  it.each([401, 403, 404, 500, 503])('refuses unavailable or denied HTTP %s', async status => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('true', { status })));
    expect(await isAccountSessionActive('token', 'https://project.supabase.co', 'key')).toBe(false);
  });
  it('fails closed for a network error or timeout', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network unavailable')));
    expect(await isAccountSessionActive('token', 'https://project.supabase.co', 'key')).toBe(false);
  });
  it('does not cache a positive result across deletion', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response('true')).mockResolvedValueOnce(new Response('false'));
    vi.stubGlobal('fetch', fetchMock);
    expect(await isAccountSessionActive('token', 'https://project.supabase.co', 'key')).toBe(true);
    expect(await isAccountSessionActive('token', 'https://project.supabase.co', 'key')).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it('does not issue requests for missing configuration or malformed credentials', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    for (const args of [['', 'url', 'key'], ['token', '', 'key'], ['token', 'url', ''], ['x'.repeat(8193), 'url', 'key']]) {
      expect(await isAccountSessionActive(args[0], args[1], args[2])).toBe(false);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
