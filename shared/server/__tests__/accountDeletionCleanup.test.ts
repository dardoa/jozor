import type { SupabaseClient } from '@supabase/supabase-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { runAccountDeletionCleanup } from '../accountDeletionCleanup';

const id = '11111111-1111-4111-8111-111111111111';
const userId = '22222222-2222-4222-8222-222222222222';
const root = '33333333-3333-4333-8333-333333333333';
const leaseToken = '44444444-4444-4444-8444-444444444444';
const job = (stage = 'storage') => ({ id, userId, authId: userId, treeIds: [root], stage, leaseToken, objects: stage === 'auth' ? [] : [
  { bucket: 'avatars', path: `users/${userId}/old.png` }, { bucket: 'person-media', path: `${root}/nested/old.webp` },
] });
const fixture = (claims: unknown[]) => {
  const remove = vi.fn().mockResolvedValue({ error: null });
  const deleteUser = vi.fn().mockResolvedValue({ error: null });
  const finish = vi.fn().mockResolvedValue({ data: true, error: null });
  const retry = vi.fn().mockResolvedValue({ data: true, error: null });
  const rpc = vi.fn(async (name: string, args: unknown) => {
    if (name === 'claim_account_deletion_cleanup') return { data: claims.shift() ?? null, error: null };
    if (name === 'finish_account_deletion_cleanup') return finish(args);
    if (name === 'retry_account_deletion_cleanup') return retry(args);
    throw new Error(`Unexpected RPC ${name}`);
  });
  const from = vi.fn(() => ({ remove }));
  const client = { rpc, storage: { from }, auth: { admin: { deleteUser } } } as unknown as SupabaseClient;
  return { client, rpc, from, remove, deleteUser, finish, retry };
};

describe('bounded durable account cleanup worker', () => {
  afterEach(() => vi.restoreAllMocks());
  it('removes exact manifest keys then Auth, verifying each stage with the lease token', async () => {
    const f = fixture([job(), job('auth')]);
    expect(await runAccountDeletionCleanup(f.client, id)).toEqual({ steps: 2, completedJobs: 1, deferred: false });
    expect(f.remove.mock.calls).toEqual([[[`users/${userId}/old.png`]], [[`${root}/nested/old.webp`]]]);
    expect(f.from.mock.calls).toEqual([['avatars'], ['person-media']]);
    expect(f.deleteUser).toHaveBeenCalledExactlyOnceWith(userId);
    expect(f.finish.mock.calls).toEqual(Array(2).fill([{ p_job_id: id, p_lease_token: leaseToken }]));
    expect(f.finish.mock.invocationCallOrder[0]).toBeLessThan(f.deleteUser.mock.invocationCallOrder[0]);
  });
  it('retains failed storage work for a retry without advancing to Auth', async () => {
    const f = fixture([job(), job('auth')]); f.remove.mockResolvedValue({ error: { message: 'storage offline' } });
    expect(await runAccountDeletionCleanup(f.client, id)).toMatchObject({ completedJobs: 0, deferred: true });
    expect(f.retry).toHaveBeenCalledExactlyOnceWith({ p_job_id: id, p_lease_token: leaseToken });
    expect(f.finish).not.toHaveBeenCalled(); expect(f.deleteUser).not.toHaveBeenCalled();
  });
  it('retries Auth failure instead of falsely treating a not-found-looking 500 as success', async () => {
    const f = fixture([job('auth')]); f.deleteUser.mockResolvedValue({ error: { message: 'backend not found', status: 500 } });
    expect((await runAccountDeletionCleanup(f.client, id)).deferred).toBe(true);
    expect(f.finish).not.toHaveBeenCalled(); expect(f.retry).toHaveBeenCalledTimes(1);
  });
  it('accepts a genuine missing Auth user only after database absence verification', async () => {
    const f = fixture([job('auth')]); f.deleteUser.mockResolvedValue({ error: { status: 404 } });
    expect((await runAccountDeletionCleanup(f.client, id)).completedJobs).toBe(1);
    expect(f.finish).toHaveBeenCalledTimes(1);
  });
  it('does not delete an unrelated Auth identity for a custom Google subject', async () => {
    const f = fixture([{ ...job('auth'), userId: 'google-subject', authId: null }]);
    expect((await runAccountDeletionCleanup(f.client, id)).completedJobs).toBe(1);
    expect(f.deleteUser).not.toHaveBeenCalled();
  });
  it.each([false, null])('does not report completion when SQL returns %j', async data => {
    const f = fixture([job('auth')]); f.finish.mockResolvedValue({ data, error: null });
    expect((await runAccountDeletionCleanup(f.client, id)).completedJobs).toBe(0);
    expect(f.retry).toHaveBeenCalledTimes(1);
  });
  it('recovers a lost completion response using the durable lease instead of throwing away the job', async () => {
    const f = fixture([job('auth')]); f.finish.mockRejectedValue(new Error('response lost')); f.retry.mockRejectedValue(new Error('still offline'));
    expect((await runAccountDeletionCleanup(f.client, id)).deferred).toBe(true);
  });
  it.each([
    { ...job(), objects: [{ bucket: 'avatars', path: 'users/someone-else/old.png' }] },
    { ...job(), objects: [{ bucket: 'person-media', path: `${root}/../foreign.png` }] },
    { ...job(), objects: [{ bucket: 'person-media', path: `${root}/bad\u0000key.png` }] },
    { ...job(), objects: [{ bucket: 'person-media', path: `${root}/bad\u007fkey.png` }] },
    { ...job(), objects: Array(101).fill(job().objects[0]) },
    { ...job('auth'), authId: root },
    { ...job('auth'), id: root },
  ])('refuses unsafe or mismatched claims before any resource mutation', async data => {
    const f = fixture([data]);
    await expect(runAccountDeletionCleanup(f.client, id)).rejects.toThrow('Invalid account cleanup claim');
    expect(f.remove).not.toHaveBeenCalled(); expect(f.deleteUser).not.toHaveBeenCalled(); expect(f.finish).not.toHaveBeenCalled();
  });
  it('bounds one invocation to eight batches', async () => {
    const f = fixture(Array.from({ length: 12 }, () => job()));
    expect((await runAccountDeletionCleanup(f.client, id)).steps).toBe(8);
    expect(f.remove).toHaveBeenCalledTimes(16);
  });
  it('continues other scheduled jobs after a failed job has been deferred', async () => {
    const f = fixture([job('auth'), { ...job('auth'), id: root }]);
    f.deleteUser.mockResolvedValueOnce({ error: { status: 500 } }).mockResolvedValueOnce({ error: null });
    expect(await runAccountDeletionCleanup(f.client)).toEqual({ steps: 2, completedJobs: 1, deferred: true });
  });
  it('defers a malformed manifest using only its valid lease and processes the next scheduled job', async () => {
    const f = fixture([{ ...job(), objects: [{ bucket: 'person-media', path: 'foreign/path' }] }, { ...job('auth'), id: root }]);
    expect(await runAccountDeletionCleanup(f.client)).toEqual({ steps: 2, completedJobs: 1, deferred: true });
    expect(f.remove).not.toHaveBeenCalled();
    expect(f.retry).toHaveBeenCalledExactlyOnceWith({ p_job_id: id, p_lease_token: leaseToken });
    expect(f.deleteUser).toHaveBeenCalledOnce();
  });
  it('refuses to continue if a malformed claim cannot be safely deferred', async () => {
    const f = fixture([{ ...job(), objects: [] }]);
    f.retry.mockResolvedValue({ data: false, error: null });
    await expect(runAccountDeletionCleanup(f.client)).rejects.toThrow('Invalid account cleanup claim');
    expect(f.remove).not.toHaveBeenCalled(); expect(f.deleteUser).not.toHaveBeenCalled();
  });
  it('stops claiming new work when the per-invocation time budget expires', async () => {
    const f = fixture([job(), job()]);
    vi.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValue(16_000);
    expect((await runAccountDeletionCleanup(f.client, id)).steps).toBe(1);
  });
});
