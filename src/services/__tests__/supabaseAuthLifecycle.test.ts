import { AuthClient } from '@supabase/auth-js';
import { afterEach, describe, expect, it, vi } from 'vitest';

const adapter = vi.hoisted(() => ({ client: null as AuthClient | null }));
vi.mock('../supabaseClient', () => ({ supabaseAuth: { get auth() { return adapter.client!; } } }));

const jwt = (exp: number) => `${btoa('{"alg":"HS256","typ":"JWT"}')}.${btoa(JSON.stringify({ sub: 'new-user', exp }))}.signature`;
const session = (refreshToken: string, expiresIn: number) => ({
  access_token: jwt(Math.floor(Date.now() / 1000) + expiresIn), refresh_token: refreshToken,
  token_type: 'bearer', expires_in: expiresIn, expires_at: Math.floor(Date.now() / 1000) + expiresIn,
  user: { id: 'new-user', aud: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' },
});

describe('retained AuthClient after local account deletion', () => {
  afterEach(async () => {
    await adapter.client?.stopAutoRefresh();
    adapter.client = null;
    vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); localStorage.clear();
  });
  it('refreshes the next login and retains SDK visibility handling and listeners', async () => {
    vi.resetModules(); vi.useFakeTimers(); localStorage.clear();
    vi.stubGlobal('BroadcastChannel', undefined);
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    const requests: { url: string; body: Record<string, unknown> }[] = [];
    const transport = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (!url.startsWith('http://127.0.0.1/auth/v1/token?grant_type=')) throw new Error('Unexpected auth request');
      requests.push({ url, body: JSON.parse(String(init?.body)) as Record<string, unknown> });
      return new Response(JSON.stringify(session(url.endsWith('password') ? 'new-session-refresh-token' : 'refreshed-token',
        url.endsWith('password') ? 120 : 3600)), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });
    adapter.client = new AuthClient({ url: 'http://127.0.0.1/auth/v1', storage: localStorage,
      storageKey: 'jozor-supabase-auth', persistSession: true, autoRefreshToken: true,
      detectSessionInUrl: false, fetch: transport });
    await adapter.client.initialize();
    await vi.advanceTimersByTimeAsync(0);
    const events: string[] = [];
    const listener = adapter.client.onAuthStateChange(event => { events.push(event); });
    const { supabaseAuthService: service } = await import('../supabaseAuthService');
    await service.forgetDeletedAccount();
    await service.signInWithPassword('new@example.test', 'password');
    visibility.mockReturnValue('hidden');
    window.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(60000);
    expect(requests.filter(request => request.url.endsWith('refresh_token'))).toHaveLength(0);
    visibility.mockReturnValue('visible');
    window.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(60000);
    const refreshed = requests.filter(request => request.url.endsWith('refresh_token'));
    expect(refreshed).toHaveLength(1);
    expect(refreshed[0].body.refresh_token).toBe('new-session-refresh-token');
    expect(events).toContain('SIGNED_IN');
    expect(events).toContain('TOKEN_REFRESHED');
    expect((await service.getSession()).data.session?.refresh_token).toBe('refreshed-token');
    listener.data.subscription.unsubscribe();
  });
});
