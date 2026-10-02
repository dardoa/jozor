/** PostgREST validates the bearer and checks the durable account generation.
 * Never cache positive results: deletion must invalidate the next request.
 */
export async function isAccountSessionActive(
  token: string,
  supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY,
): Promise<boolean> {
  if (!token || token.length > 8192 || !supabaseUrl || !anonKey) return false;
  try {
    const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/rpc/is_my_account_session_active`, {
      method: 'POST',
      headers: { apikey: anonKey, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: '{}',
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(5000),
    });
    return response.ok && await response.json() === true;
  } catch {
    return false;
  }
}
