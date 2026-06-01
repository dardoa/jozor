import { describe, expect, it } from 'vitest';

import { resolveSupabaseConfig } from '../supabaseConfig';

describe('resolveSupabaseConfig', () => {
  it('returns undefined values when browser and server environment values are absent', () => {
    expect(resolveSupabaseConfig(undefined, undefined)).toEqual({
      url: undefined,
      key: undefined,
    });
  });

  it('prefers browser-safe Vite values over server fallbacks', () => {
    expect(resolveSupabaseConfig(
      {
        VITE_SUPABASE_URL: 'https://client.example.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'client-key',
      },
      {
        SUPABASE_URL: 'https://server.example.supabase.co',
        SUPABASE_ANON_KEY: 'server-key',
      }
    )).toEqual({
      url: 'https://client.example.supabase.co',
      key: 'client-key',
    });
  });
});
