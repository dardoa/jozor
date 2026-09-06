import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { createClient } from '@supabase/supabase-js';
import { loadSupabaseIntegrationEnvironment } from './supabaseIntegrationEnvironment.mjs';

const verified = loadSupabaseIntegrationEnvironment({ envFile: 'output/private-media-local/.env.integration' });
assert.equal(verified.mode, 'local');
const fixture = JSON.parse(readFileSync('output/private-media-local/browser/fixture.json', 'utf8'));
assert.match(fixture.email, /^media-browser-[a-f0-9-]+@example\.test$/);
const admin = createClient(verified.supabaseUrl, verified.serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
const check = result => { if (result.error) throw new Error(result.error.message); return result.data; };
assert.equal(check(await admin.auth.admin.getUserById(fixture.ownerId)).user.email, fixture.email);
const treeId = process.argv[2];
assert.ok(treeId);
assert.equal(check(await admin.from('trees').select('owner_id').eq('id', treeId).single()).owner_id, fixture.ownerId);
const people = check(await admin.from('people').select('id, custom_fields').eq('tree_id', treeId));
const photo = people.map(person => person.custom_fields.photoAsset).find(Boolean);
assert.ok(photo && photo.bucket === 'person-media' && photo.objectPath.startsWith(`${treeId}/`));
const stored = Buffer.from(await check(await admin.storage.from('person-media').download(photo.objectPath)).arrayBuffer());
const base = 'output/playwright/private-photo-poster';
const svgText = readFileSync(`${base}.svg`, 'utf8');
const svgDom = new JSDOM(svgText, { contentType: 'image/svg+xml' });
const hiddenDom = new JSDOM(readFileSync(`${base}-hidden.svg`, 'utf8'), { contentType: 'image/svg+xml' });
const svg = svgDom.window.document.documentElement;
const photos = Array.from(svg.querySelectorAll('image.poster-photo'));
assert.equal(photos.length, 1);
const href = photos[0].getAttribute('href');
assert.ok(href?.startsWith(`data:${photo.mimeType};base64,`));
assert.deepEqual(Buffer.from(href.slice(href.indexOf(',') + 1), 'base64'), stored);
assert.equal(hiddenDom.window.document.querySelectorAll('image.poster-photo').length, 0);
for (const node of svg.querySelectorAll('image')) assert.match(node.getAttribute('href') ?? '', /^data:image\/(?:png|jpeg|webp);base64,/);
for (const identity of [treeId, fixture.ownerId, ...people.map(person => person.id)]) assert.equal(svgText.includes(identity), false);
assert.equal(/person-media:|objectPath|supabase-private|Bearer |storage\/v1|\uFFFD/.test(svgText), false);
assert.ok(svgText.includes('data:font/'));
assert.ok(svgText.includes('صور العائلة التجريبية'));
const nodes = svg.querySelectorAll('g.poster-node');
assert.equal(nodes.length, 2);
assert.equal(svg.querySelectorAll('path.poster-connector').length, 1);
for (const node of nodes) {
  for (const field of ['x', 'y', 'width', 'height']) {
    const attribute = node.getAttribute(`data-scene-${field}`);
    assert.notEqual(attribute, null);
    assert.ok(Number.isFinite(Number(attribute)));
    if (field === 'width' || field === 'height') assert.ok(Number(attribute) > 0);
  }
}
const png = readFileSync(`${base}.png`);
const pdf = readFileSync(`${base}.pdf`);
assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
assert.ok(width > 3000 && height > 2000 && width > height);
const pdfInfo = execFileSync('pdfinfo', [`${base}.pdf`], { encoding: 'utf8' });
assert.match(pdfInfo, /^Pages:\s+1\s*$/m);
const page = pdfInfo.match(/^Page size:\s+([\d.]+) x ([\d.]+) pts/m);
assert.ok(page);
assert.ok(Math.abs(Number(page[1]) - 420 * 72 / 25.4) < 0.02);
assert.ok(Math.abs(Number(page[2]) - 297 * 72 / 25.4) < 0.02);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const evidence = {
  generatedAt: new Date().toISOString(), nodes: nodes.length, connectors: 1,
  embeddedPhotoBytesMatchPrivateStorage: true, privateIdentifiersAbsentFromSvg: true,
  hiddenExportPhotoCount: 0, png: { width, height, effectiveDpi: width * 25.4 / 420 },
  pdf: { pages: 1, widthPt: Number(page[1]), heightPt: Number(page[2]) },
  hashes: { svg: digest(svgText), png: digest(png), pdf: digest(pdf) },
};
writeFileSync(`${base}-evidence.json`, JSON.stringify(evidence, null, 2) + '\n');
svgDom.window.close();
hiddenDom.window.close();
console.log(JSON.stringify(evidence));
