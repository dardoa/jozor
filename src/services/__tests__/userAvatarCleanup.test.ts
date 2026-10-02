import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { cleanupMyUserAvatars, sweepUserAvatarCleanup } from '../userAvatarCleanup';

const target = { object_path: 'users/owner/profile-11111111-1111-4111-8111-111111111111.webp' };
const fixture = (inventory: unknown = [target]) => {
  const rpc = vi.fn(async (name: string) => ({ data: name.startsWith('list_') ? inventory : true, error: null as unknown }));
  const remove = vi.fn(async () => ({ error: null as unknown }));
  const from = vi.fn(() => ({ remove }));
  return { client: { rpc, storage: { from } } as unknown as SupabaseClient, rpc, remove, from };
};
describe('exact-object avatar cleanup', () => {
  it.each([cleanupMyUserAvatars, sweepUserAvatarCleanup])('claims, removes and completes a bounded recorded target', async cleanup => {
    const { client, rpc, remove, from } = fixture();
    expect(await cleanup(client)).toEqual({ checked: 1, removed: 1, retained: 0, failed: 0 });
    expect(from).toHaveBeenCalledWith('avatars'); expect(remove).toHaveBeenCalledWith([target.object_path]);
    expect(rpc.mock.calls.map(([name]) => name)).toEqual([cleanup === cleanupMyUserAvatars ? 'list_my_user_avatar_cleanup' : 'list_user_avatar_cleanup_candidates', 'claim_user_avatar_cleanup', 'complete_user_avatar_cleanup']);
    expect(rpc.mock.invocationCallOrder[1]).toBeLessThan(remove.mock.invocationCallOrder[0]);
    expect(remove.mock.invocationCallOrder[0]).toBeLessThan(rpc.mock.invocationCallOrder[2]);
  });
  it('retains current/foreign references and never removes an unclaimed target', async () => {
    const { client, rpc, remove } = fixture();
    rpc.mockImplementation(async name => ({ data: name.startsWith('list_') ? [target] : false, error: null }));
    expect(await cleanupMyUserAvatars(client)).toEqual({ checked: 1, removed: 0, retained: 1, failed: 0 });
    expect(remove).not.toHaveBeenCalled();
  });
  it('retries failed storage deletion without acknowledging its completion', async () => {
    const { client, rpc, remove } = fixture(); remove.mockResolvedValueOnce({ error: new Error('private path') });
    expect(await sweepUserAvatarCleanup(client)).toMatchObject({ failed: 1, removed: 0 });
    expect(rpc.mock.calls.map(([name]) => name)).not.toContain('complete_user_avatar_cleanup');
    expect(await sweepUserAvatarCleanup(client)).toMatchObject({ failed: 0, removed: 1 });
  });
  it.each(['claim_user_avatar_cleanup', 'complete_user_avatar_cleanup'])('keeps failed %s pending and returns only counts', async failedRpc => {
    const { client, rpc, remove } = fixture();
    rpc.mockImplementation(async name => ({ data: name.startsWith('list_') ? [target] : true, error: name === failedRpc ? new Error('private path') : null }));
    expect(await sweepUserAvatarCleanup(client)).toEqual({ checked: 1, removed: 0, retained: 0, failed: 1 });
    if (failedRpc === 'claim_user_avatar_cleanup') expect(remove).not.toHaveBeenCalled();
  });
  it.each([null, {}, [{ object_path: '../escape' }], [{ object_path: 'users/owner/arbitrary.png' }],
    [{ object_path: 'users/owner/nested/profile.webp' }], [{ object_path: 'users/owner/profile%2f.png' }],
    [{ ...target, bucket: 'person-media' }], [target, { object_path: 'https://remote.test/avatar.png' }], Array(21).fill(target)])('rejects malformed inventory before any deletion %j', async inventory => {
    const { client, remove } = fixture(inventory);
    await expect(cleanupMyUserAvatars(client)).rejects.toThrow(/inventory/i); expect(remove).not.toHaveBeenCalled();
  });
  it('fails closed on a missing inventory migration', async () => {
    const { client, rpc, remove } = fixture(); rpc.mockResolvedValue({ data: null, error: new Error('RPC absent') });
    await expect(cleanupMyUserAvatars(client)).rejects.toThrow('Avatar cleanup inventory failed');
    expect(remove).not.toHaveBeenCalled();
  });
});
