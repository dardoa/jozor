import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const a = '11111111-1111-4111-8111-111111111111';
const b = '22222222-2222-4222-8222-222222222222';

describe('push endpoint uniqueness and owner RLS', () => {
  let db: PGlite;
  const asUser = async (uid: string) => {
    await db.exec('RESET ROLE');
    await db.query("SELECT set_config('request.jwt.claims', $1, false)", [JSON.stringify({ sub: uid })]);
    await db.exec('SET ROLE authenticated');
  };
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`CREATE ROLE authenticated; CREATE SCHEMA auth;
      CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
        SELECT (current_setting('request.jwt.claims')::jsonb->>'sub')::uuid $$;
      GRANT USAGE ON SCHEMA public, auth TO authenticated;
      INSERT INTO auth.users VALUES ('${a}'), ('${b}');`);
    await db.exec(readFileSync('supabase/migrations/20260404000100_add_push_subscriptions.sql', 'utf8'));
    await db.exec('GRANT SELECT, INSERT, UPDATE, DELETE ON push_subscriptions TO authenticated');
  });
  afterAll(async () => { await db?.close(); });

  it('cannot steal another account endpoint but can insert a rotated endpoint', async () => {
    await asUser(a);
    await db.query("INSERT INTO push_subscriptions(user_id,endpoint,keys) VALUES ($1,'https://push.example/old','{}')", [a]);
    await asUser(b);
    await expect(db.query(`INSERT INTO push_subscriptions(user_id,endpoint,keys) VALUES ($1,'https://push.example/old','{}')
      ON CONFLICT(endpoint) DO UPDATE SET user_id=excluded.user_id`, [b])).rejects.toThrow(/row-level security/);
    expect((await db.query('SELECT endpoint FROM push_subscriptions')).rows).toEqual([]);
    expect((await db.query("DELETE FROM push_subscriptions WHERE endpoint='https://push.example/old' RETURNING id")).rows).toEqual([]);
    await db.query("INSERT INTO push_subscriptions(user_id,endpoint,keys) VALUES ($1,'https://push.example/new','{}')", [b]);
    expect((await db.query('SELECT endpoint FROM push_subscriptions')).rows).toEqual([{ endpoint: 'https://push.example/new' }]);
    await asUser(a);
    expect((await db.query('SELECT user_id,endpoint FROM push_subscriptions')).rows)
      .toEqual([{ user_id: a, endpoint: 'https://push.example/old' }]);
  });
});
