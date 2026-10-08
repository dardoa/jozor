import type { SupabaseClient } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reconcileAccountCheckouts } from '../accountCheckoutFence';

const id = '11111111-1111-4111-8111-111111111111';
const transaction = (status = 'ready') => ({ data: { id: 'txn_test', status, custom_data: { userId: 'owner', checkoutAttemptId: id } } });
const fixture = () => {
  const rpc = vi.fn().mockResolvedValueOnce({ data: [{ id, transactionId: 'txn_test' }], error: null })
    .mockResolvedValueOnce({ data: true, error: null }).mockResolvedValue({ data: [], error: null });
  return { rpc, admin: { rpc } as unknown as SupabaseClient };
};
describe('account checkout deletion fence', () => {
  beforeEach(() => { vi.stubEnv('PADDLE_API_KEY', 'synthetic-key'); vi.stubEnv('PADDLE_ENVIRONMENT', 'sandbox'); });
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
  it('cancels only a matching unpaid checkout and requires confirmed persistence and an empty pending queue', async () => {
    const f = fixture(); const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(transaction())))
      .mockResolvedValueOnce(new Response(JSON.stringify(transaction('canceled'))));
    vi.stubGlobal('fetch', fetchMock);
    expect(await reconcileAccountCheckouts(f.admin, 'owner')).toBe(true);
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: 'PATCH', body: '{"status":"canceled"}', redirect: 'error' });
    expect(f.rpc).toHaveBeenCalledWith('record_account_checkout', { p_attempt_id: id, p_transaction_id: 'txn_test', p_canceled: true, p_subscription_id: null });
  });
  it.each(['billed', 'paid', 'past_due', 'unknown'])('never cancels or marks a %s transaction safe for deletion', async status => {
    const f = fixture(); const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(transaction(status))));
    vi.stubGlobal('fetch', fetchMock);
    expect(await reconcileAccountCheckouts(f.admin, 'owner')).toBe(false);
    expect(fetchMock).toHaveBeenCalledOnce(); expect(f.rpc).toHaveBeenCalledOnce();
  });
  it('leaves a transaction with unknown identity unresolved without guessing provider targets', async () => {
    const f = fixture(); f.rpc.mockReset().mockResolvedValue({ data: [{ id, transactionId: null }], error: null });
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    expect(await reconcileAccountCheckouts(f.admin, 'owner')).toBe(false); expect(fetchMock).not.toHaveBeenCalled();
  });
  it('makes bounded progress instead of permanently refusing a queue of more than twenty attempts', async () => {
    const pending = Array.from({ length: 21 }, (_, index) => ({ id, transactionId: `txn_test${index}` }));
    const rpc = vi.fn(async (name: string) => ({ data: name === 'get_pending_account_checkouts' ? pending : true, error: null }));
    const fetchMock = vi.fn(async (url: string) => new Response(JSON.stringify({ data: {
      id: url.split('/').at(-1), status: 'canceled', custom_data: { userId: 'owner', checkoutAttemptId: id },
    } })));
    vi.stubGlobal('fetch', fetchMock);
    expect(await reconcileAccountCheckouts({ rpc } as unknown as SupabaseClient, 'owner')).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(20);
    expect(rpc.mock.calls.filter(([name]) => name === 'record_account_checkout')).toHaveLength(20);
  });
  it('rejects mismatched provider custom-data before cancellation', async () => {
    const f = fixture(); const data = transaction(); data.data.custom_data.userId = 'another-owner';
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(data))); vi.stubGlobal('fetch', fetchMock);
    expect(await reconcileAccountCheckouts(f.admin, 'owner')).toBe(false); expect(fetchMock).toHaveBeenCalledOnce();
  });
  it('keeps completed checkouts blocked until their local subscription is synchronized', async () => {
    const f = fixture(); f.rpc.mockResolvedValue({ data: [{ id, transactionId: 'txn_test' }], error: null });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(transaction('completed')))));
    expect(await reconcileAccountCheckouts(f.admin, 'owner')).toBe(false);
  });
});
