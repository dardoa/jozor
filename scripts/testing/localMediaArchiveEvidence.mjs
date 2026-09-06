import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';
import { createClient } from '@supabase/supabase-js';
import { loadSupabaseIntegrationEnvironment } from './supabaseIntegrationEnvironment.mjs';

const verified = loadSupabaseIntegrationEnvironment({ envFile: 'output/private-media-local/.env.integration' });
assert.equal(verified.mode, 'local');
const directory = path.resolve('output/private-media-local/browser');
const fixture = JSON.parse(readFileSync(path.join(directory, 'fixture.json'), 'utf8'));
assert.match(fixture.email, /^media-browser-[a-f0-9-]+@example\.test$/);
const admin = createClient(verified.supabaseUrl, verified.serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const authState = JSON.parse(readFileSync(path.join(directory, 'auth.json'), 'utf8'));
const session = JSON.parse(authState.origins[0].localStorage.find(item => item.name === 'jozor-supabase-auth').value);
const check = result => { if (result.error) throw new Error(result.error.message); return result.data; };
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const save = (name, data) => writeFileSync(path.join(directory, name), JSON.stringify(data, null, 2) + '\n');
assert.equal(check(await admin.auth.admin.getUserById(fixture.ownerId)).user.email, fixture.email);

async function snapshot(treeId) {
  const tree = check(await admin.from('trees').select('owner_id, focus_id').eq('id', treeId).single());
  assert.equal(tree.owner_id, fixture.ownerId);
  const people = check(await admin.from('people').select('id, first_name, last_name, photo_url, custom_fields').eq('tree_id', treeId));
  const records = [];
  for (const person of people) {
    assert.equal(person.photo_url, null);
    const media = [];
    const fields = person.custom_fields;
    for (const item of [
      ...(fields.photoAsset ? [{ asset: fields.photoAsset }] : []),
      ...(fields.gallery ?? []),
    ]) {
      const asset = item.asset;
      assert.equal(asset.bucket, 'person-media');
      assert.ok(asset.objectPath.startsWith(`${treeId}/${asset.kind}/`));
      const blob = check(await admin.storage.from(asset.bucket).download(asset.objectPath));
      const gateway = new URL('http://127.0.0.1:3300/api/person-media');
      gateway.search = new URLSearchParams({ treeId, personId: person.id, assetId: asset.assetId, kind: asset.kind }).toString();
      const delivery = await fetch(gateway, { headers: { Authorization: `Bearer ${session.access_token}`, Origin: 'http://127.0.0.1:3300' } });
      assert.equal(delivery.status, 200, `HTTP delivery must succeed for ${asset.kind}`);
      assert.deepEqual(Buffer.from(await delivery.arrayBuffer()), Buffer.from(await blob.arrayBuffer()));
      const publicUrl = admin.storage.from(asset.bucket).getPublicUrl(asset.objectPath).data.publicUrl;
      assert.equal((await fetch(publicUrl)).ok, false, 'Private assets must not be public');
      media.push({ kind: asset.kind, assetId: asset.assetId, path: asset.objectPath,
        hash: digest(Buffer.from(await blob.arrayBuffer())), caption: item.caption ?? '', createdAt: item.createdAt ?? '' });
    }
    records.push({ id: person.id, name: `${person.first_name} ${person.last_name}`, isDeceased: fields.isDeceased === true, media });
  }
  const relationships = check(await admin.from('relationships').select('person_id, relative_id, type').eq('tree_id', treeId));
  const names = new Map(records.map(person => [person.id, person.name]));
  const edges = relationships.map(edge => {
    assert.ok(names.has(edge.person_id) && names.has(edge.relative_id));
    return edge.type === 'parent'
      ? `${names.get(edge.relative_id)} -> ${names.get(edge.person_id)}`
      : `${names.get(edge.person_id)} -> ${names.get(edge.relative_id)}`;
  }).sort();
  return { treeId, focusName: names.get(tree.focus_id) ?? null, people: records.sort((a, b) => a.name.localeCompare(b.name)), edges };
}

const command = process.argv[2];
if (command === 'capture-gallery-delete' || command === 'verify-gallery-delete') {
  if (command === 'capture-gallery-delete') {
    assert.ok(process.argv[3] && process.argv[3] !== fixture.treeId);
    const before = await snapshot(process.argv[3]);
    assert.equal(before.people.flatMap(person => person.media).filter(item => item.kind === 'gallery-photo').length, 1);
    save('archive-gallery-delete-baseline.json', before);
  } else {
    const before = JSON.parse(readFileSync(path.join(directory, 'archive-gallery-delete-baseline.json'), 'utf8'));
    assert.notEqual(before.treeId, fixture.treeId);
    const after = await snapshot(before.treeId);
    const removed = before.people.flatMap(person => person.media).filter(item => item.kind === 'gallery-photo');
    const expected = { ...before, people: before.people.map(person => ({ ...person, media: person.media.filter(item => item.kind !== 'gallery-photo') })) };
    assert.deepEqual(after, expected);
    for (const item of removed) {
      const slash = item.path.lastIndexOf('/');
      const objects = check(await admin.storage.from('person-media').list(item.path.slice(0, slash), { limit: 100 }));
      assert.ok(objects.length < 100);
      assert.equal(objects.some(object => object.name === item.path.slice(slash + 1)), false);
      assert.ok((await admin.storage.from('person-media').download(item.path)).error);
    }
    assert.deepEqual(await snapshot(fixture.treeId), JSON.parse(readFileSync(path.join(directory, 'archive-source.json'), 'utf8')));
    const evidence = { generatedAt: new Date().toISOString(), removedGalleryObjects: removed.length, profilePreserved: true, sourceTreeUnchanged: true };
    save('archive-gallery-delete-evidence.json', evidence);
    console.log(JSON.stringify(evidence));
  }
} else if (command === 'capture-rollback' || command === 'verify-rollback') {
  const trees = check(await admin.from('trees').select('id').eq('owner_id', fixture.ownerId)).map(tree => tree.id).sort();
  const objects = [];
  for (const treeId of trees) {
    for (const kind of ['profile-photo', 'gallery-photo']) {
      const prefix = `${treeId}/${kind}`;
      const items = check(await admin.storage.from('person-media').list(prefix, { limit: 100 }));
      assert.ok(items.length < 100);
      objects.push(...items.filter(item => item.id).map(item => `${prefix}/${item.name}`));
    }
  }
  const current = { trees, objects: objects.sort() };
  if (command === 'capture-rollback') save('archive-rollback-baseline.json', current);
  else {
    assert.deepEqual(current, JSON.parse(readFileSync(path.join(directory, 'archive-rollback-baseline.json'), 'utf8')));
    const evidence = { generatedAt: new Date().toISOString(), existingTrees: trees.length, existingObjects: objects.length, partialTrees: 0, extraObjects: 0 };
    save('archive-rollback-evidence.json', evidence);
    console.log(JSON.stringify(evidence));
  }
} else if (command === 'capture-source') {
  const source = await snapshot(fixture.treeId);
  assert.equal(source.people.length, 2);
  assert.equal(source.edges.length, 1);
  assert.equal(source.people.flatMap(person => person.media).length, 2);
  assert.ok(source.people.flatMap(person => person.media).some(item => item.caption));
  save('archive-source.json', source);
  console.log('Captured two people, one relationship, two private images and gallery caption.');
} else if (command === 'inspect-archive') {
  const source = JSON.parse(readFileSync(path.join(directory, 'archive-source.json'), 'utf8'));
  const bytes = readFileSync(path.resolve(process.argv[3]));
  const zip = await JSZip.loadAsync(bytes);
  const manifest = JSON.parse(await zip.file('manifest.json').async('string'));
  const treeText = await zip.file('tree.json').async('string');
  const tree = JSON.parse(treeText);
  assert.equal(manifest.metadata.personCount, 2);
  assert.equal(manifest.metadata.photoCount, 2);
  assert.equal(Object.keys(tree.people).length, 2);
  const allJson = treeText + JSON.stringify(manifest);
  assert.equal(/supabase-private|objectPath|Bearer |blob:/.test(allJson), false, 'Archive must not contain provider-bound media references');
  for (const person of Object.values(tree.people)) assert.equal(person.photoAsset, undefined);
  for (const person of source.people) {
    const files = [manifest.media.avatars[person.id], ...(manifest.media.gallery[person.id] ?? [])].filter(Boolean);
    assert.equal(files.length, person.media.length);
    for (const [index, file] of files.entries()) {
      assert.equal(digest(await zip.file(file).async('nodebuffer')), person.media[index].hash);
      if (person.media[index].kind === 'gallery-photo') {
        assert.equal(manifest.media.galleryMetadata?.[file]?.caption ?? '', person.media[index].caption);
        assert.equal(manifest.media.galleryMetadata?.[file]?.createdAt ?? '', person.media[index].createdAt);
      }
    }
    assert.equal(tree.people[person.id].firstName + ' ' + tree.people[person.id].lastName, person.name);
  }
  const evidence = { generatedAt: new Date().toISOString(), archiveSha256: digest(bytes), people: 2, images: 2, binaryParity: true, providerReferencesAbsent: true };
  save('archive-export-evidence.json', evidence);
  console.log(JSON.stringify(evidence));
} else if (command === 'verify-restored') {
  const source = JSON.parse(readFileSync(path.join(directory, 'archive-source.json'), 'utf8'));
  const trees = check(await admin.from('trees').select('id').eq('owner_id', fixture.ownerId).neq('id', fixture.treeId));
  const restoredId = process.argv[3] ?? (trees.length === 1 ? trees[0].id : undefined);
  assert.ok(restoredId && trees.some(tree => tree.id === restoredId), 'Specify an independently imported fixture tree');
  const restored = await snapshot(restoredId);
  assert.equal(restored.focusName, source.focusName, 'Original focal person must be restored');
  assert.deepEqual(restored.edges, source.edges);
  assert.deepEqual(restored.people.map(person => person.name), source.people.map(person => person.name));
  for (const [index, person] of restored.people.entries()) {
    const original = source.people[index];
    assert.equal(person.isDeceased, original.isDeceased, 'Life status must survive import');
    assert.notEqual(person.id, original.id);
    assert.equal(person.media.length, original.media.length);
    for (const [mediaIndex, item] of person.media.entries()) {
      const before = original.media[mediaIndex];
      assert.notEqual(item.assetId, before.assetId);
      assert.notEqual(item.path, before.path);
      assert.equal(item.hash, before.hash);
      assert.equal(item.caption, before.caption, 'Gallery caption must survive archive restoration');
      assert.equal(item.createdAt, before.createdAt, 'Gallery creation date must survive archive restoration');
    }
  }
  const evidence = { generatedAt: new Date().toISOString(), people: 2, images: 2, relationships: 1, independentIdentities: true, binaryParity: true, captionsPreserved: true, galleryDatesPreserved: true, focusPreserved: true, lifeStatusPreserved: true, httpDeliveryParity: true, privateStorage: true };
  save('archive-restore-evidence.json', evidence);
  console.log(JSON.stringify(evidence));
} else {
  throw new Error('Use capture-source, inspect-archive <path>, or verify-restored');
}
