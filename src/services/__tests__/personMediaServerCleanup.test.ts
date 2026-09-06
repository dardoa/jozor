import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cleanPersonMediaObject, sweepPersonMediaOrphans } from '../personMediaServerCleanup';

const target = { bucket: 'person-media' as const, object_path: 'test-path' };
const fixture = (claim = true) => {
  const rpc = vi.fn(async (name: string) => ({ data: name === 'list_person_media_cleanup_candidates' ? [target] : claim, error: null }));
  const remove = vi.fn(async () => ({ error: null as { message: string } | null }));
  const client = { rpc, storage: { from: vi.fn(() => ({ remove })) } } as unknown as SupabaseClient;
  return { client, rpc, remove };
};

describe('server media cleanup fencing', () => {
  it('never calls Storage remove when the database reports a live reference', async () => {
    const { client, remove } = fixture(false);
    expect(await cleanPersonMediaObject(client, target)).toBe(false);
    expect(remove).not.toHaveBeenCalled();
  });
  it('deletes only after claiming, then acknowledges after Storage succeeds', async () => {
    const { client, rpc, remove } = fixture();
    expect(await cleanPersonMediaObject(client, target)).toBe(true);
    expect(rpc.mock.calls.map(([name]) => name)).toEqual(['claim_person_media_cleanup', 'complete_person_media_cleanup']);
    expect(rpc.mock.invocationCallOrder[0]).toBeLessThan(remove.mock.invocationCallOrder[0]);
    expect(remove.mock.invocationCallOrder[0]).toBeLessThan(rpc.mock.invocationCallOrder[1]);
  });
  it('does not acknowledge failed deletion and lets the next sweep retry', async () => {
    const { client, rpc, remove } = fixture();
    remove.mockResolvedValueOnce({ error: { message: 'offline' } });
    expect(await sweepPersonMediaOrphans(client)).toEqual({ checked: 1, removed: 0, retained: 0, failed: 1 });
    expect(rpc.mock.calls.map(([name]) => name)).not.toContain('complete_person_media_cleanup');
    expect(await sweepPersonMediaOrphans(client)).toEqual({ checked: 1, removed: 1, retained: 0, failed: 0 });
  });
});
