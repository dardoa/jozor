import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountDeletionCheckoutError, AccountDeletionRetainedFilesError, AccountDeletionSubscriptionError, deleteUserAccount } from '../supabaseProfileService';

vi.mock('../supabaseTreeClient', () => ({ getTreeClient: vi.fn() }));
vi.mock('../../utils/errorLogger', () => ({ logError: vi.fn(), logWarn: vi.fn() }));

describe('account deletion error contract', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it('translates the exact billing conflict into a typed recoverable error', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      code: 'ACCOUNT_HAS_OPEN_SUBSCRIPTION', error: 'Server text is not UI copy',
    }), { status: 409 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(deleteUserAccount('user-1', 'user@example.test', 'session-token'))
      .rejects.toBeInstanceOf(AccountDeletionSubscriptionError);
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('/api/auth/delete-account', expect.objectContaining({
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer session-token' },
      body: expect.stringMatching(/"receipt":"[0-9a-f]{64}"/),
    }));
  });

  it.each(['null', '{}', 'not-json', '{"code":"UNRECOGNIZED"}'])(
    'handles other or malformed errors without misclassifying them: %s', async body => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body, { status: 409 })));
      const error = await deleteUserAccount('user-1').catch(value => value);
      expect(error).toBeInstanceOf(Error);
      expect(error).not.toBeInstanceOf(AccountDeletionSubscriptionError);
      expect(error.message).toBe('Failed to delete account');
    }
  );

  it('does not treat a server failure carrying the billing code as an actionable conflict', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 'ACCOUNT_HAS_OPEN_SUBSCRIPTION' }), { status: 503 })));
    const error = await deleteUserAccount('user-1').catch(value => value);
    expect(error).not.toBeInstanceOf(AccountDeletionSubscriptionError);
  });

  it('accepts successful deletion', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"success":true}', { status: 200 })));
    await expect(deleteUserAccount('user-1')).resolves.toBe('complete');
  });
  it.each([
    ['ACCOUNT_HAS_PENDING_CHECKOUT', AccountDeletionCheckoutError],
    ['ACCOUNT_HAS_RETAINED_UPLOADS', AccountDeletionRetainedFilesError],
  ])('surfaces %s as an unaccepted deletion and clears its unused receipt', async (code, errorType) => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ code }), { status: 409 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(deleteUserAccount('user-1')).rejects.toBeInstanceOf(errorType);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(sessionStorage.getItem('jozor-account-deletion-receipt')).toBeNull();
  });

  it('distinguishes a durable pending deletion from completed cleanup', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"success":true,"status":"pending"}', { status: 202 })));
    await expect(deleteUserAccount('user-1')).resolves.toBe('pending');
  });

  it.each(['{}', 'null', 'not-json', '{"success":true,"status":"complete"}'])(
    'does not log the user out on an unconfirmed accepted response %s', async body => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body, { status: 202 })));
      await expect(deleteUserAccount('user-1')).rejects.toThrow('Unable to confirm account deletion');
    }
  );

  it('recovers a lost reply using the pre-persisted receipt, without sending the revoked bearer', async () => {
    const fetchMock = vi.fn().mockImplementationOnce(async () => {
      expect(sessionStorage.getItem('jozor-account-deletion-receipt')).not.toContain('session-token');
      throw new Error('response lost');
    }).mockResolvedValueOnce(new Response('{"status":"pending"}'));
    vi.stubGlobal('fetch', fetchMock);
    await expect(deleteUserAccount('user-1', '', 'session-token')).resolves.toBe('pending');
    const original = JSON.parse(fetchMock.mock.calls[0][1].body);
    const recovery = fetchMock.mock.calls[1][1];
    expect(JSON.parse(recovery.body)).toEqual({ action: 'status', receipt: original.receipt });
    expect(recovery.headers).not.toHaveProperty('Authorization');
  });

  it('resumes after a connection failure without repeating the destructive request', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('offline'));
    vi.stubGlobal('fetch', fetchMock);
    await expect(deleteUserAccount('user-1', '', 'session-token')).rejects.toThrow();
    fetchMock.mockReset().mockResolvedValue(new Response('{"status":"complete"}'));
    await expect(deleteUserAccount('user-1', '', 'session-token')).resolves.toBe('complete');
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).action).toBe('status');
    expect(sessionStorage.getItem('jozor-account-deletion-receipt')).toBeNull();
  });

  it('does not mistake an old receipt for deletion of a recreated account session', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"success":true,"status":"pending"}', { status: 202 }));
    vi.stubGlobal('fetch', fetchMock);
    await deleteUserAccount('user-1', '', 'old-session');
    const old = JSON.parse(fetchMock.mock.calls[0][1].body).receipt;
    fetchMock.mockReset().mockResolvedValue(new Response('{"success":true,"status":"pending"}', { status: 202 }));
    await deleteUserAccount('user-1', '', 'new-session');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).receipt).not.toBe(old);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).not.toHaveProperty('action');
  });
});
