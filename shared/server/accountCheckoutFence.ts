import type { SupabaseClient } from '@supabase/supabase-js';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Only cancels unpaid, server-created transactions during an explicit deletion request. */
export async function reconcileAccountCheckouts(admin: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await admin.rpc('get_pending_account_checkouts', { p_user_id: userId });
  if (error || !Array.isArray(data)) throw new Error('Checkout status unavailable');
  if (!data.length) return true;
  if (data.length > 21) return false;
  const key = process.env.PADDLE_API_KEY?.trim();
  if (!key) return false;
  const environment = process.env.PADDLE_ENVIRONMENT || process.env.VITE_PADDLE_ENVIRONMENT || 'sandbox';
  if (environment !== 'sandbox' && environment !== 'production') return false;
  const host = environment === 'production' ? 'api.paddle.com' : 'sandbox-api.paddle.com';
  const started = Date.now();
  for (const attempt of data.slice(0, 20)) {
    if (Date.now() - started > 10000) return false;
    if (!attempt || typeof attempt.id !== 'string' || !uuid.test(attempt.id)
      || typeof attempt.transactionId !== 'string' || !/^txn_[a-z0-9]+$/.test(attempt.transactionId)) return false;
    const url = `https://${host}/transactions/${attempt.transactionId}`;
    const options = { headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, redirect: 'error' as const, signal: AbortSignal.timeout(5000) };
    const response = await fetch(url, options);
    if (!response.ok) return false;
    let transaction = (await response.json()).data;
    if (transaction?.id !== attempt.transactionId || transaction.custom_data?.userId !== userId
      || transaction.custom_data?.checkoutAttemptId !== attempt.id) return false;
    if (transaction.status === 'draft' || transaction.status === 'ready') {
      const canceled = await fetch(url, { ...options, signal: AbortSignal.timeout(5000), method: 'PATCH', body: JSON.stringify({ status: 'canceled' }) });
      if (!canceled.ok) return false;
      transaction = (await canceled.json()).data;
      if (transaction?.id !== attempt.transactionId || transaction.status !== 'canceled') return false;
    }
    if (transaction.status !== 'canceled' && transaction.status !== 'completed') return false;
    const result = await admin.rpc('record_account_checkout', {
      p_attempt_id: attempt.id, p_transaction_id: attempt.transactionId,
      p_canceled: transaction.status === 'canceled', p_subscription_id: typeof transaction.subscription_id === 'string' ? transaction.subscription_id : null,
    });
    if (result.error || result.data !== true) return false;
  }
  // Completed transactions without their subscription webhook stay unresolved.
  const remaining = await admin.rpc('get_pending_account_checkouts', { p_user_id: userId });
  return !remaining.error && Array.isArray(remaining.data) && remaining.data.length === 0;
}
