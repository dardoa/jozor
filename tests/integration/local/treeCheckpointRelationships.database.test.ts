import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const migration = (name: string) => readFileSync(path.resolve('supabase/migrations', name), 'utf8');
const treeId = '11111111-1111-4111-8111-111111111111';
const oldMigration = migration('20260905000400_include_private_photo_in_tree_checkpoints.sql');
const correction = migration('20260907000100_preserve_explicit_checkpoint_relationships.sql');

describe('recorded relationships in checkpoint SQL', () => {
  let db: PGlite;
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA private;
      CREATE TABLE people (
        id text PRIMARY KEY, tree_id uuid, first_name text, last_name text, middle_name text,
        birth_name text, nick_name text, suffix text, gender text, birth_date date, death_date date,
        birth_place text, death_place text, bio text, profession text, company text, interests text,
        photo_url text, photo_path text, photo_version integer, email text, website text,
        blog text, address text, custom_fields jsonb DEFAULT '{}', metadata jsonb DEFAULT '{}'
      );
      CREATE TABLE relationships (tree_id uuid, person_id text, relative_id text, type text);
      CREATE TABLE tree_operations (tree_id uuid, version_seq bigint);
      CREATE TABLE tree_checkpoints (tree_id uuid, version_seq bigint, people jsonb, created_at timestamptz,
        PRIMARY KEY(tree_id, version_seq));
    `);
  });
  afterAll(async () => { await db?.close(); });

  it('reproduces the former-spouse error, fixes new checkpoints, and does not rewrite historical snapshots', async () => {
    const fields = { photoAsset: { assetId: 'profile-fixture' }, isPrivate: true,
      gallery: [{ caption: 'Gallery caption' }], partnerDetails: { former: { type: 'divorced' } } };
    for (const id of ['father', 'mother', 'former', 'child']) {
      await db.query('INSERT INTO people (id,tree_id,first_name,custom_fields) VALUES ($1,$2,$1,$3)', [id, treeId, JSON.stringify(fields)]);
    }
    for (const [from, to, type] of [['father', 'mother', 'spouse'], ['father', 'former', 'spouse'],
      ['father', 'child', 'child'], ['child', 'mother', 'parent']]) {
      await db.query('INSERT INTO relationships VALUES ($1,$2,$3,$4)', [treeId, from, to, type]);
    }
    const generate = () => db.query('SELECT private.generate_tree_checkpoint($1)', [treeId]);
    const snapshot = async () => (await db.query<{ people: Record<string, { parents: string[]; children: string[]; spouses: string[] }> }>(
      'SELECT people FROM tree_checkpoints WHERE tree_id=$1', [treeId])).rows[0].people;
    await db.exec(oldMigration); await generate();
    const historical = await snapshot();
    expect(historical.child.parents.slice().sort()).toEqual(['father', 'former', 'mother']);
    await db.exec(correction);
    expect(await snapshot()).toEqual(historical);
    await generate();
    const fixed = await snapshot();
    expect(fixed.child.parents).toEqual(['father', 'mother']);
    expect(fixed.former.children).toEqual([]);
    expect(fixed.father.children).toEqual(['child']);
    expect(fixed.mother.children).toEqual(['child']);
    expect(fixed.father.spouses).toEqual(['former', 'mother']);
    expect(fixed.father).toMatchObject(fields);
    await db.exec(correction); await generate();
    expect(await snapshot()).toEqual(fixed);
    expect((await db.query('SELECT * FROM people')).rows).toHaveLength(4);
    expect((await db.query('SELECT * FROM relationships')).rows).toHaveLength(4);
  });

  it.each(['anon', 'authenticated'])('does not grant checkpoint execution to %s', async role => {
    const result = await db.query<{ allowed: boolean }>(
      "SELECT has_function_privilege($1, 'private.generate_tree_checkpoint(uuid)', 'EXECUTE') AS allowed", [role]);
    expect(result.rows[0].allowed).toBe(false);
  });
});
