import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { loadSupabaseIntegrationEnvironment } from '../../scripts/testing/supabaseIntegrationEnvironment.mjs';
import { createLegacyPersonMediaMigrationAdapter, migrateLegacyPersonMediaBatch } from '../../src/api/person-media-migration';
import { migrateLegacyPersonMediaPlan, planLegacyPersonMediaMigration } from '../../src/services/privatePersonMediaLegacyMigration';
import { cleanPersonMediaObject, sweepPersonMediaOrphans } from '../../src/services/personMediaServerCleanup';
import { createPersonMediaAssetRef } from '../../src/types/personMedia';

const environment = loadSupabaseIntegrationEnvironment();
if (environment.mode !== 'local') throw new Error('Lifecycle fault injection is local-only.');
const { supabaseUrl, anonKey, serviceRoleKey } = environment;
const auth = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false };
const admin = createClient(supabaseUrl, serviceRoleKey, { auth });
const bytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');

describe('real Storage migration, cleanup and viewer invalidation', () => {
  const accounts: { id: string; email: string; client: ReturnType<typeof createClient> }[] = [];
  let treeId: string;
  let sourcePath: string;
  const adapter = createLegacyPersonMediaMigrationAdapter(admin);
  const row = (id = randomUUID()) => ({ id, tree_id: treeId, first_name: 'Synthetic living name', photo_path: sourcePath, custom_fields: {} });
  const asset = () => createPersonMediaAssetRef({ treeId, assetId: randomUUID(), kind: 'profile-photo', mimeType: 'image/png', byteLength: bytes.length, version: 1, createdAt: new Date().toISOString() });
  const readRow = async (id: string) => {
    const result = await admin.from('people').select('*').eq('id', id).single();
    expect(result.error).toBeNull();
    return result.data!;
  };
  const uploadLegacy = async () => {
    expect((await admin.storage.from('avatars').upload(sourcePath, bytes, { contentType: 'image/png' })).error).toBeNull();
  };
  const readBytes = async (bucket: string, path: string) => {
    const result = await admin.storage.from(bucket).download(path);
    expect(result.error).toBeNull();
    return Buffer.from(await result.data!.arrayBuffer());
  };

  beforeAll(async () => {
    for (const role of ['owner', 'editor', 'viewer']) {
      const email = `lifecycle-${role}-${randomUUID()}@example.test`;
      const password = `Local-${randomUUID()}!`;
      const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
      expect(created.error).toBeNull();
      const account = { id: created.data.user!.id, email, client: createClient(supabaseUrl, anonKey, { auth }) };
      accounts.push(account);
      expect((await account.client.auth.signInWithPassword({ email, password })).error).toBeNull();
    }
    expect((await admin.from('user_profiles').upsert({ id: accounts[0].id, tier: 'family' })).error).toBeNull();
  });
  beforeEach(async () => {
    treeId = randomUUID();
    sourcePath = `${treeId}/legacy.png`;
    expect((await admin.from('trees').insert({ id: treeId, owner_id: accounts[0].id, name: 'Synthetic lifecycle test' })).error).toBeNull();
    expect((await admin.from('tree_collaborators').insert(accounts.slice(1).map((account, index) => ({
      tree_id: treeId, collaborator_uid: account.id, email: account.email, role: index === 0 ? 'editor' : 'viewer', invited_by: accounts[0].id,
    })))).error).toBeNull();
  });
  afterEach(async () => {
    await Promise.all(accounts.map(account => account.client.removeAllChannels()));
    for (const [bucket, prefix] of [['avatars', treeId], ['person-media', `${treeId}/profile-photo`], ['person-media', `${treeId}/gallery-photo`]]) {
      const list = await admin.storage.from(bucket).list(prefix, { limit: 1000 });
      expect(list.error).toBeNull();
      const paths = (list.data ?? []).filter(item => item.id).map(item => `${prefix}/${item.name}`);
      if (paths.length) expect((await admin.storage.from(bucket).remove(paths)).error).toBeNull();
      expect((await admin.storage.from(bucket).list(prefix)).data).toEqual([]);
    }
    expect((await admin.from('trees').delete().eq('id', treeId)).error).toBeNull();
    // Tombstones intentionally do not cascade in production. This UUID belongs
    // solely to this fixture, so isolated test teardown can remove it explicitly.
    execFileSync('docker', ['exec', 'supabase_db_private-media-local', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c',
      `DELETE FROM private.person_media_cleanup WHERE tree_id = '${treeId}'::uuid;`], { stdio: 'pipe' });
  });
  afterAll(async () => {
    for (const account of accounts) {
      await account.client.auth.signOut();
      expect((await admin.from('user_profiles').delete().eq('id', account.id)).error).toBeNull();
      expect((await admin.auth.admin.deleteUser(account.id)).error).toBeNull();
    }
  });

  it('resumes after an attachment committed but its HTTP acknowledgement was lost', async () => {
    await uploadLegacy();
    const person = row();
    expect((await admin.from('people').insert(person)).error).toBeNull();
    const result = await migrateLegacyPersonMediaPlan(planLegacyPersonMediaMigration(person, supabaseUrl), {
      ...adapter, attachPrivateAsset: async (task, media) => {
        expect(await adapter.attachPrivateAsset(task, media)).toBe(true);
        throw new Error('Synthetic lost acknowledgement');
      },
    });
    expect(result.failedCount).toBe(1);
    const attached = await readRow(person.id);
    const media = attached.custom_fields.photoAsset;
    expect(await readBytes('person-media', media.objectPath)).toEqual(bytes);
    expect(await readBytes('avatars', sourcePath)).toEqual(bytes);
    const resumed = await migrateLegacyPersonMediaPlan(planLegacyPersonMediaMigration(attached, supabaseUrl), adapter);
    expect(resumed).toEqual({ migratedCount: 0, cleanedCount: 1, failedCount: 0 });
    expect((await readRow(person.id)).custom_fields.photoAsset).toEqual(media);
    expect((await admin.storage.from('avatars').download(sourcePath)).data).toBeNull();
  });

  it('retains a shared public source until both people in separate batches have migrated', async () => {
    await uploadLegacy();
    expect((await admin.from('people').insert([row(), row()])).error).toBeNull();
    expect((await migrateLegacyPersonMediaBatch(admin, treeId, 0, 1, supabaseUrl)).failedCount).toBe(0);
    expect(await readBytes('avatars', sourcePath)).toEqual(bytes);
    expect((await migrateLegacyPersonMediaBatch(admin, treeId, 1, 1, supabaseUrl)).failedCount).toBe(0);
    expect((await admin.storage.from('avatars').download(sourcePath)).data).toBeNull();
    const people = await admin.from('people').select('custom_fields,photo_path').eq('tree_id', treeId);
    expect(people.data).toHaveLength(2);
    for (const person of people.data!) {
      expect(person.photo_path).toBeNull();
      expect(await readBytes('person-media', person.custom_fields.photoAsset.objectPath)).toEqual(bytes);
    }
  });

  it('preserves a concurrent profile replacement and removes only the losing unreferenced copy', async () => {
    await uploadLegacy();
    const person = row();
    expect((await admin.from('people').insert(person)).error).toBeNull();
    const winner = asset();
    await adapter.uploadPrivateObject(winner, new Blob([bytes], { type: 'image/png' }));
    let losingPath = '';
    const result = await migrateLegacyPersonMediaPlan(planLegacyPersonMediaMigration(person, supabaseUrl), {
      ...adapter, attachPrivateAsset: async (task, media) => {
        losingPath = media.objectPath;
        expect((await admin.from('people').update({ photo_path: null, custom_fields: { photoAsset: winner } }).eq('id', person.id)).error).toBeNull();
        return adapter.attachPrivateAsset(task, media);
      },
    });
    expect(result.failedCount).toBe(1);
    expect((await readRow(person.id)).custom_fields.photoAsset).toEqual(winner);
    expect(await readBytes('person-media', winner.objectPath)).toEqual(bytes);
    expect((await admin.storage.from('person-media').download(losingPath)).data).toBeNull();
    expect(await readBytes('avatars', sourcePath)).toEqual(bytes);
  });

  it('does not finalize a gallery item changed after verification', async () => {
    await uploadLegacy();
    const person = { ...row(), photo_path: null, custom_fields: { gallery: [{ path: sourcePath, caption: 'Original' }] } };
    expect((await admin.from('people').insert(person)).error).toBeNull();
    const result = await migrateLegacyPersonMediaPlan(planLegacyPersonMediaMigration(person, supabaseUrl), {
      ...adapter, finalizeLegacyReference: async (task, media) => {
        const current = await readRow(person.id);
        current.custom_fields.gallery[0].caption = 'Concurrent caption';
        expect((await admin.from('people').update({ custom_fields: current.custom_fields }).eq('id', person.id)).error).toBeNull();
        return adapter.finalizeLegacyReference(task, media);
      },
    });
    expect(result.failedCount).toBe(1);
    expect((await readRow(person.id)).custom_fields.gallery[0]).toMatchObject({ caption: 'Concurrent caption', path: sourcePath });
    expect(await readBytes('avatars', sourcePath)).toEqual(bytes);
    const resumed = await migrateLegacyPersonMediaPlan(planLegacyPersonMediaMigration(await readRow(person.id), supabaseUrl), adapter);
    expect(resumed).toEqual({ migratedCount: 0, cleanedCount: 1, failedCount: 0 });
    expect((await readRow(person.id)).custom_fields.gallery[0]).toMatchObject({ caption: 'Concurrent caption' });
    expect((await readRow(person.id)).custom_fields.gallery[0]).not.toHaveProperty('path');
  });

  it('retries queued cleanup after Storage interruption and rejects a delayed attachment', async () => {
    await uploadLegacy();
    const person = row();
    expect((await admin.from('people').insert(person)).error).toBeNull();
    const result = await migrateLegacyPersonMediaPlan(planLegacyPersonMediaMigration(person, supabaseUrl), {
      ...adapter, removeLegacyObject: async () => { throw new Error('Synthetic Storage outage'); },
    });
    expect(result.cleanedCount).toBe(1);
    expect(await readBytes('avatars', sourcePath)).toEqual(bytes);
    expect((await sweepPersonMediaOrphans(admin)).removed).toBe(1);
    expect((await admin.storage.from('avatars').download(sourcePath)).data).toBeNull();
    expect((await admin.from('people').update({ photo_path: sourcePath }).eq('id', person.id)).error?.code).toBe('23514');
  });

  it('sweeps old orphan uploads, preserves fresh uploads/history references, and fences private reattachment', async () => {
    const orphan = asset(); const fresh = asset(); const historical = asset();
    for (const media of [orphan, fresh, historical]) await adapter.uploadPrivateObject(media, new Blob([bytes], { type: 'image/png' }));
    expect((await admin.from('tree_checkpoints').insert({ tree_id: treeId, version_seq: 1, people: { synthetic: { photoAsset: historical } } })).error).toBeNull();
    execFileSync('docker', ['exec', 'supabase_db_private-media-local', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c',
      `UPDATE storage.objects SET created_at = now() - interval '25 hours' WHERE bucket_id = 'person-media' AND name IN ('${orphan.objectPath}', '${historical.objectPath}');`], { stdio: 'pipe' });
    expect(await sweepPersonMediaOrphans(admin)).toMatchObject({ removed: 1, retained: 1, failed: 0 });
    expect((await admin.storage.from('person-media').download(orphan.objectPath)).data).toBeNull();
    for (const media of [fresh, historical]) expect(await readBytes('person-media', media.objectPath)).toEqual(bytes);
    expect((await admin.from('people').insert({ ...row(), photo_path: null, custom_fields: { photoAsset: orphan } })).error?.code).toBe('23514');
    expect(await cleanPersonMediaObject(admin, { bucket: 'person-media', object_path: historical.objectPath })).toBe(false);
    expect((await accounts[2].client.rpc('claim_person_media_cleanup', { p_bucket: 'person-media', p_object_path: fresh.objectPath })).error).not.toBeNull();
  });

  it('cannot simultaneously attach and claim the same private object for deletion', async () => {
    const media = asset();
    await adapter.uploadPrivateObject(media, new Blob([bytes], { type: 'image/png' }));
    const person = { ...row(), photo_path: null };
    expect((await admin.from('people').insert(person)).error).toBeNull();
    const [attachment, claim] = await Promise.all([
      admin.from('people').update({ custom_fields: { photoAsset: media } }).eq('id', person.id),
      admin.rpc('claim_person_media_cleanup', { p_bucket: media.bucket, p_object_path: media.objectPath }),
    ]);
    expect(claim.error).toBeNull();
    expect(Number(attachment.error === null) + Number(claim.data === true)).toBe(1);
    if (attachment.error === null) {
      expect((await readRow(person.id)).custom_fields.photoAsset).toEqual(media);
      expect(await readBytes('person-media', media.objectPath)).toEqual(bytes);
    } else {
      expect(attachment.error.code).toBe('23514');
      expect((await readRow(person.id)).custom_fields).not.toHaveProperty('photoAsset');
    }
  });

  it('delivers only payload-free viewer signals and blocks raw operations even after role downgrade', async () => {
    const person = { ...row(), photo_path: null };
    expect((await admin.from('people').insert(person)).error).toBeNull();
    const viewer = accounts[2].client;
    const signals: Record<string, unknown>[] = [];
    const leakedOperations: unknown[] = [];
    const editorOperations: unknown[] = [];
    const rawChannel = viewer.channel(`raw-${treeId}`).on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'tree_operations', filter: `tree_id=eq.${treeId}`,
    }, payload => leakedOperations.push(payload.new));
    const signalChannel = viewer.channel(`safe-${treeId}`).on('postgres_changes', {
      event: '*', schema: 'public', table: 'tree_change_signals', filter: `tree_id=eq.${treeId}`,
    }, payload => signals.push(payload.new));
    const editorChannel = accounts[1].client.channel(`editor-${treeId}`).on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'tree_operations', filter: `tree_id=eq.${treeId}`,
    }, payload => editorOperations.push(payload.new));
    for (const channel of [rawChannel, signalChannel, editorChannel]) {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Local realtime subscribe timeout')), 10000);
        channel.subscribe((status, error) => {
          if (status === 'SUBSCRIBED') { clearTimeout(timeout); resolve(); }
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            clearTimeout(timeout); reject(new Error(`Local realtime ${status}: ${error?.message ?? 'no detail'}`));
          }
        });
      });
    }
    const sync = await accounts[0].client.rpc('sync_tree_batch', { p_ops: [{
      tree_id: treeId, type: 'UPDATE_PROP', created_at: new Date().toISOString(),
      payload: { id: person.id, updates: { firstName: 'PRIVATE-REALTIME-SENTINEL' }, client_id: 'local-lifecycle', client_version: 1 },
    }] });
    expect(sync.error).toBeNull();
    await expect.poll(() => signals.length, { timeout: 10000 }).toBeGreaterThan(0);
    await expect.poll(() => editorOperations.length, { timeout: 10000 }).toBe(1);
    for (const signal of signals) {
      expect(Object.keys(signal).sort()).toEqual(['revision', 'tree_id']);
      expect(JSON.stringify(signal)).not.toContain('PRIVATE-REALTIME-SENTINEL');
    }
    expect((await accounts[0].client.from('tree_operations').select('*').eq('tree_id', treeId)).data).toHaveLength(1);
    expect((await accounts[1].client.from('tree_operations').select('*').eq('tree_id', treeId)).data).toHaveLength(1);
    const denied = await viewer.from('tree_operations').select('*').eq('tree_id', treeId);
    expect(denied.error).toBeNull(); expect(denied.data).toEqual([]);
    const masked = await viewer.from('people_secure').select('first_name').eq('id', person.id).single();
    expect(masked.error).toBeNull(); expect(masked.data?.first_name).not.toBe('PRIVATE-REALTIME-SENTINEL');
    expect((await admin.from('tree_collaborators').update({ role: 'viewer' }).eq('tree_id', treeId).eq('collaborator_uid', accounts[1].id)).error).toBeNull();
    expect((await accounts[1].client.from('tree_operations').select('*').eq('tree_id', treeId)).data).toEqual([]);
    const signalCount = signals.length;
    expect((await accounts[0].client.rpc('sync_tree_batch', { p_ops: [{
      tree_id: treeId, type: 'UPDATE_PROP', created_at: new Date().toISOString(),
      payload: { id: person.id, updates: { firstName: 'SECOND-PRIVATE-SENTINEL' }, client_id: 'local-lifecycle', client_version: 2 },
    }] })).error).toBeNull();
    await expect.poll(() => signals.length, { timeout: 10000 }).toBeGreaterThan(signalCount);
    // Give the same committed change a bounded delivery window on both sockets.
    await new Promise(resolve => setTimeout(resolve, 1000));
    expect(leakedOperations).toEqual([]);
    expect(editorOperations).toHaveLength(1);
    expect((await admin.from('tree_collaborators').delete().eq('tree_id', treeId).eq('collaborator_uid', accounts[2].id)).error).toBeNull();
    expect((await viewer.from('tree_change_signals').select('*').eq('tree_id', treeId)).data).toEqual([]);
    const revokedSignalCount = signals.length;
    expect((await admin.from('people').update({ first_name: 'AFTER-REVOCATION' }).eq('id', person.id)).error).toBeNull();
    await new Promise(resolve => setTimeout(resolve, 1000));
    expect(signals).toHaveLength(revokedSignalCount);
  });
});
