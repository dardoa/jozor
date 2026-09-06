import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { loadSupabaseIntegrationEnvironment } from './supabaseIntegrationEnvironment.mjs';

const verified = loadSupabaseIntegrationEnvironment({ envFile: 'output/private-media-local/.env.integration' });
assert.equal(verified.mode, 'local', 'Browser fixtures require the isolated local backend');
const directory = path.resolve('output/private-media-local/browser');
const manifestPath = path.join(directory, 'fixture.json');
const authPath = path.join(directory, 'auth.json');
const admin = createClient(verified.supabaseUrl, verified.serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const check = (result) => { if (result.error) throw new Error(result.error.message); return result.data; };
const save = (file, value) => writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
const command = process.argv[2];

if (command === 'create') {
  assert.equal(existsSync(manifestPath), false, 'Clean up the previous browser fixture first');
  mkdirSync(directory, { recursive: true });
  const fixture = { ownerId: null, treeId: randomUUID(), personId: randomUUID(), email: `media-browser-${randomUUID()}@example.test` };
  save(manifestPath, fixture);
  const password = `Local-${randomUUID()}!`;
  const user = check(await admin.auth.admin.createUser({ email: fixture.email, password, email_confirm: true }));
  fixture.ownerId = user.user.id;
  save(manifestPath, fixture);
  check(await admin.from('user_profiles').upsert({ id: fixture.ownerId, tier: 'family', display_name: 'Media Review Owner' }));
  check(await admin.from('trees').insert({ id: fixture.treeId, owner_id: fixture.ownerId, name: 'Private Media UI Review' }));
  check(await admin.from('people').insert({ id: fixture.personId, tree_id: fixture.treeId, first_name: 'Media', last_name: 'Review', gender: 'male', custom_fields: { isDeceased: true } }));
  if (process.argv.includes('--archive')) {
    const childId = randomUUID();
    check(await admin.from('people').insert({ id: childId, tree_id: fixture.treeId, first_name: 'Archive', last_name: 'Child', gender: 'female' }));
    check(await admin.from('relationships').insert({ tree_id: fixture.treeId, person_id: fixture.personId, relative_id: childId, type: 'child' }));
  }
  check(await admin.from('trees').update({ focus_id: fixture.personId }).eq('id', fixture.treeId));
  const client = createClient(verified.supabaseUrl, verified.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const session = check(await client.auth.signInWithPassword({ email: fixture.email, password })).session;
  assert.ok(session);
  save(authPath, { cookies: [], origins: [{ origin: 'http://127.0.0.1:3300', localStorage: [
    { name: 'jozor-supabase-auth', value: JSON.stringify(session) },
    { name: 'jozor_supabase_token', value: session.access_token },
  ] }] });
  console.log(`Synthetic browser fixture ready: http://127.0.0.1:3300/tree/${fixture.treeId}`);
} else if (['inspect', 'verify-http', 'verify-legacy', 'cleanup'].includes(command)) {
  const fixture = JSON.parse(readFileSync(manifestPath, 'utf8'));
  assert.match(fixture.email, /^media-browser-[a-f0-9-]+@example\.test$/);
  const tree = check(await admin.from('trees').select('owner_id').eq('id', fixture.treeId).maybeSingle());
  if (tree) assert.equal(tree.owner_id, fixture.ownerId);
  const paths = [];
  for (const kind of ['profile-photo', 'gallery-photo']) {
    const prefix = `${fixture.treeId}/${kind}`;
    const objects = check(await admin.storage.from('person-media').list(prefix, { limit: 100 }));
    paths.push(...objects.filter(item => item.id).map(item => `${prefix}/${item.name}`));
  }
  if (command === 'verify-legacy') {
    const state = JSON.parse(readFileSync(authPath, 'utf8'));
    const session = JSON.parse(state.origins[0].localStorage.find(item => item.name === 'jozor-supabase-auth').value);
    const personId = randomUUID();
    const sourcePath = `${fixture.treeId}/${personId}.png`;
    const bytes = readFileSync(path.resolve('public/favicon.png'));
    check(await admin.storage.from('avatars').upload(sourcePath, bytes, { contentType: 'image/png' }));
    const legacyUrl = admin.storage.from('avatars').getPublicUrl(sourcePath).data.publicUrl;
    check(await admin.from('people').insert({ id: personId, tree_id: fixture.treeId, first_name: 'Legacy fixture', photo_url: legacyUrl, photo_path: sourcePath }));
    const response = await fetch('http://127.0.0.1:3300/api/person-media-migration', {
      method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, Origin: 'http://127.0.0.1:3300', 'Content-Type': 'application/json' },
      body: JSON.stringify({ treeId: fixture.treeId }),
    });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.migratedCount, 1);
    assert.equal(result.failedCount, 0);
    assert.equal(result.complete, true);
    const person = check(await admin.from('people').select('photo_path, photo_url, custom_fields').eq('id', personId).single());
    assert.equal(person.photo_path, null);
    assert.equal(person.photo_url, null);
    const asset = person.custom_fields.photoAsset;
    assert.equal(asset.bucket, 'person-media');
    assert.equal(asset.kind, 'profile-photo');
    const stored = check(await admin.storage.from('person-media').download(asset.objectPath));
    assert.deepEqual(Buffer.from(await stored.arrayBuffer()), bytes);
    assert.equal((await fetch(legacyUrl)).ok, false);
    const evidence = { generatedAt: new Date().toISOString(), migratedCount: 1, binaryParity: true, legacyObjectRemoved: true, legacyReferencesCleared: true };
    save(path.join(directory, 'legacy-evidence.json'), evidence);
    console.log(JSON.stringify(evidence));
  } else if (command === 'verify-http') {
    const state = JSON.parse(readFileSync(authPath, 'utf8'));
    const session = JSON.parse(state.origins[0].localStorage.find(item => item.name === 'jozor-supabase-auth').value);
    const person = check(await admin.from('people').select('custom_fields').eq('id', fixture.personId).single());
    const asset = person.custom_fields.photoAsset;
    assert.ok(asset, 'Upload and sync a photo through the UI before verifying HTTP');
    const origin = 'http://127.0.0.1:3300';
    const url = new URL('/api/person-media', origin);
    url.search = new URLSearchParams({ treeId: fixture.treeId, personId: fixture.personId, assetId: asset.assetId, kind: asset.kind }).toString();
    const headers = { Authorization: `Bearer ${session.access_token}`, Origin: origin };
    const response = await fetch(url, { headers });
    assert.equal(response.status, 200, 'Real local media handler must return image bytes');
    assert.equal(response.headers.get('cache-control'), 'private, no-store, max-age=0');
    assert.equal(response.headers.get('content-type'), asset.mimeType);
    const stored = check(await admin.storage.from('person-media').download(asset.objectPath));
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), Buffer.from(await stored.arrayBuffer()));
    assert.equal((await fetch(url)).status, 401);
    const migration = await fetch(new URL('/api/person-media-migration', origin), {
      method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ treeId: fixture.treeId }),
    });
    assert.equal(migration.status, 200);
    const result = await migration.json();
    assert.equal(result.failedCount, 0);
    assert.equal(result.migratedCount, 0);
    assert.equal(result.complete, true);
    const evidence = { generatedAt: new Date().toISOString(), binaryParity: true, noStore: true, unauthenticatedStatus: 401, migrationRoute: 'verified-empty-batch' };
    save(path.join(directory, 'http-evidence.json'), evidence);
    console.log(JSON.stringify(evidence));
  } else if (command === 'inspect') {
    const person = check(await admin.from('people').select('photo_url, custom_fields').eq('id', fixture.personId).single());
    console.log(JSON.stringify({ privateObjectCount: paths.length, photoUrl: person.photo_url, fields: person.custom_fields }, null, 2));
  } else {
    if (fixture.ownerId) {
      const owner = check(await admin.auth.admin.getUserById(fixture.ownerId));
      assert.equal(owner.user.email, fixture.email, 'Cleanup must target the synthetic fixture account');
      const ownedTrees = check(await admin.from('trees').select('id').eq('owner_id', fixture.ownerId));
      assert.ok(ownedTrees.length <= 10, 'Unexpected fixture tree count; inspect before cleanup');
      for (const ownedTree of ownedTrees) {
        for (const [bucket, prefix] of [
          ['person-media', `${ownedTree.id}/profile-photo`],
          ['person-media', `${ownedTree.id}/gallery-photo`],
          ['avatars', ownedTree.id],
        ]) {
          const objects = check(await admin.storage.from(bucket).list(prefix, { limit: 100 }));
          assert.ok(objects.length < 100, 'Fixture cleanup requires a complete object listing');
          const objectPaths = objects.filter(item => item.id).map(item => `${prefix}/${item.name}`);
          if (objectPaths.length) check(await admin.storage.from(bucket).remove(objectPaths));
        }
        check(await admin.from('trees').delete().eq('id', ownedTree.id).eq('owner_id', fixture.ownerId));
      }
      check(await admin.from('user_profiles').delete().eq('id', fixture.ownerId));
      check(await admin.auth.admin.deleteUser(fixture.ownerId));
    }
    rmSync(authPath, { force: true });
    rmSync(manifestPath);
    console.log('Synthetic browser tree, media, profile, account and local auth state removed.');
  }
} else {
  throw new Error('Use create, inspect, verify-http, verify-legacy or cleanup');
}
