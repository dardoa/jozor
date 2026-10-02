import { EventEmitter } from 'node:events';
import { readFile } from 'node:fs/promises';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runBillingOperatorSession } from '../accountBillingTargetConnection.mjs';
import { executeReviewedBillingInsert, findBillingInsertReceipt, verifyBillingInsertSchema } from '../accountBillingInsertOperator.mjs';

vi.mock('../accountBillingInsertOperator.mjs', () => ({
  executeReviewedBillingInsert: vi.fn(), findBillingInsertReceipt: vi.fn(), verifyBillingInsertSchema: vi.fn(),
}));
vi.mock('node:fs/promises', () => { const fs = { readFile: vi.fn() }; return { ...fs, default: fs }; });

const project = 'abcdefghijklmnopqrst';
const password = 'database-SECRET@with:/symbols';
const env = { VITE_SUPABASE_URL: `https://${project}.supabase.co`, PADDLE_ENVIRONMENT: 'sandbox',
  VITE_PADDLE_ENVIRONMENT: 'sandbox', VITE_PADDLE_CLIENT_TOKEN: 'test_client-SECRET', PADDLE_API_KEY: 'pdl_sdbx_apikey_SECRET' };
const options = () => ({ env: { ...env }, linkedProjectRef: project,
  connectionString: `postgresql://postgres:${encodeURIComponent(password)}@db.${project}.supabase.co:5432/postgres` });
const prepared = () => ({ payload: { version: 1, request_id: '11111111-1111-4111-8111-111111111111',
  snapshot_fingerprint: 'a'.repeat(64), accounts: [{ user_id: 'owner-PRIVATE', inserts: [{ id: 'subscription-PRIVATE' }] }] },
review: { expectedProjectRef: project, providerEnvironment: 'sandbox', requestId: '11111111-1111-4111-8111-111111111111',
  snapshotFingerprint: 'a'.repeat(64), accountCount: 1, insertCount: 1 } });

interface Config { host: string; port: number; user: string; password: string; database: string;
  ssl: { rejectUnauthorized: boolean; servername: string; checkServerIdentity: unknown; minVersion: string; ca?: string } }
class Client extends EventEmitter {
  static instances: Client[] = [];
  connection = { stream: { encrypted: true, authorized: true,
    getPeerCertificate: () => ({ subjectaltname: `DNS:${this.config.host}` }), destroy: vi.fn() } };
  connect = vi.fn(async () => {});
  end = vi.fn(async () => {});
  query = vi.fn(async (_sql: string) => ({ rows: [{ database: 'postgres', sessionUser: 'postgres', currentUser: 'postgres', recovery: false }] }));
  constructor(public config: Config) { super(); Client.instances.push(this); }
}
const approved = async () => {
  const inspection = await runBillingOperatorSession(options(), Client);
  return { ...inspection.target, admissionShutdownConfirmed: true, requestId: prepared().review.requestId,
    snapshotFingerprint: 'a'.repeat(64), accountCount: 1, insertCount: 1 };
};

beforeEach(() => {
  vi.resetAllMocks(); Client.instances = [];
  vi.mocked(readFile).mockResolvedValue(project);
  vi.mocked(verifyBillingInsertSchema).mockResolvedValue(true);
  vi.mocked(executeReviewedBillingInsert).mockResolvedValue({ status: 'committed', mutationsPerformed: true });
  for (const key of Object.keys(process.env)) if (/^PG[A-Z_]/i.test(key)) vi.stubEnv(key, undefined);
  vi.stubEnv('NODE_TLS_REJECT_UNAUTHORIZED', undefined);
});
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });

describe('bound target configuration before connection', () => {
  it.each(['direct', 'session-pooler'])('uses exact project routing and strict TLS for %s', async kind => {
    const input = options();
    if (kind === 'session-pooler') input.connectionString = `postgres://postgres.${project}:${encodeURIComponent(password)}@aws-1-ap-south-1.pooler.supabase.com:5432/postgres`;
    const result = await runBillingOperatorSession(input, Client);
    expect(result).toMatchObject({ status: 'inspected', databaseConnectionBound: true, schemaVerified: true,
      applyAllowed: false, mutationsPerformed: false, connectionClosed: true,
      target: { projectRef: project, providerEnvironment: 'sandbox', connectionMode: kind } });
    expect(result.target?.targetFingerprint).toMatch(/^[a-f0-9]{64}$/);
    const client = Client.instances[0];
    expect(client.config).not.toHaveProperty('connectionString');
    expect(client.config).toMatchObject({ password, database: 'postgres', port: 5432,
      ssl: { rejectUnauthorized: true, servername: client.config.host, minVersion: 'TLSv1.2', checkServerIdentity: expect.any(Function) } });
    expect(client.query.mock.calls.map(([sql]) => sql).slice(1)).toEqual(['BEGIN READ ONLY', 'ROLLBACK']);
    expect(client.end).toHaveBeenCalledOnce();
    expect(executeReviewedBillingInsert).not.toHaveBeenCalled();
    for (const secret of [password, 'SECRET', 'postgres://', 'postgresql://']) expect(JSON.stringify(result)).not.toContain(secret);
  });
  it.each([
    'http://postgres:secret@db.abcdefghijklmnopqrst.supabase.co:5432/postgres',
    'postgres://postgres:secret@db.zzzzzzzzzzzzzzzzzzzz.supabase.co:5432/postgres',
    'postgres://postgres:secret@db.abcdefghijklmnopqrst.supabase.co.evil.test:5432/postgres',
    'postgres://postgres:secret@127.0.0.1:5432/postgres',
    'postgres://postgres:secret@localhost:5432/postgres',
    'postgres://postgres:secret@db.abcdefghijklmnopqrst.supabase.co:6543/postgres',
    'postgres://postgres:secret@db.abcdefghijklmnopqrst.supabase.co/postgres',
    'postgres://postgres:secret@db.abcdefghijklmnopqrst.supabase.co:5432/other',
    'postgres://postgres:secret@db.abcdefghijklmnopqrst.supabase.co:5432/postgres?sslmode=no-verify',
    'postgres://postgres:secret@db.abcdefghijklmnopqrst.supabase.co:5432/postgres?options=anything',
    'postgres://postgres:secret@db.abcdefghijklmnopqrst.supabase.co:5432/postgres#fragment',
    'postgres://postgres@db.abcdefghijklmnopqrst.supabase.co:5432/postgres',
    'postgres://postgres:bad%ZZ@db.abcdefghijklmnopqrst.supabase.co:5432/postgres',
    'postgres://postgres:%00@db.abcdefghijklmnopqrst.supabase.co:5432/postgres',
    'postgres://authenticated:secret@db.abcdefghijklmnopqrst.supabase.co:5432/postgres',
    'postgres://postgres:secret@aws-1-ap-south-1.pooler.supabase.com:5432/postgres',
    'postgres://postgres.zzzzzzzzzzzzzzzzzzzz:secret@aws-1-ap-south-1.pooler.supabase.com:5432/postgres',
    'postgres://postgres.abcdefghijklmnopqrst:secret@aws-1-ap-south-1.pooler.supabase.com:6543/postgres',
    'postgres://postgres.abcdefghijklmnopqrst:secret@aws-1-ap-south-1.pooler.supabase.com.evil.test:5432/postgres',
  ])('rejects unsafe DSN before opening any socket: %#', async connectionString => {
    expect(await runBillingOperatorSession({ ...options(), connectionString }, Client)).toEqual({ status: 'rejected',
      code: 'target-configuration-rejected', mutationsPerformed: false });
    expect(Client.instances).toHaveLength(0);
  });
  it.each(['project', 'rest-url', 'server-url', 'server-mode', 'browser-mode', 'token', 'key', 'legacy-key', 'PGHOST', 'PGOPTIONS', 'TLS'])('refuses cross-target or ambient configuration: %s', async kind => {
    const input = options();
    if (kind === 'project') input.linkedProjectRef = 'z'.repeat(20);
    if (kind === 'rest-url') input.env.VITE_SUPABASE_URL += '.evil.test';
    if (kind === 'server-url') Object.assign(input.env, { SUPABASE_URL: 'https://other.supabase.co' });
    if (kind === 'server-mode') input.env.PADDLE_ENVIRONMENT = 'production';
    if (kind === 'browser-mode') input.env.VITE_PADDLE_ENVIRONMENT = 'production';
    if (kind === 'token') input.env.VITE_PADDLE_CLIENT_TOKEN = 'live_other';
    if (kind === 'key') input.env.PADDLE_API_KEY = 'pdl_live_apikey_other';
    if (kind === 'legacy-key') input.env.PADDLE_API_KEY = 'unknown';
    if (kind.startsWith('PG')) vi.stubEnv(kind, 'unsafe-SECRET');
    if (kind === 'TLS') vi.stubEnv('NODE_TLS_REJECT_UNAUTHORIZED', '0');
    expect((await runBillingOperatorSession(input, Client)).code).toBe('target-configuration-rejected');
    expect(Client.instances).toHaveLength(0);
  });
  it('accepts consistent production routing without treating Vercel target as Paddle environment', async () => {
    const input = options(); Object.assign(input.env, { PADDLE_ENVIRONMENT: 'production', VITE_PADDLE_ENVIRONMENT: 'production',
      VITE_PADDLE_CLIENT_TOKEN: 'live_secret', PADDLE_API_KEY: 'pdl_live_apikey_secret', VERCEL_ENV: 'preview' });
    expect((await runBillingOperatorSession(input, Client)).target?.providerEnvironment).toBe('production');
  });
  it.each(['wrong', 'missing'])('refuses a %s repository project binding even if DSN and env agree', async kind => {
    if (kind === 'wrong') vi.mocked(readFile).mockResolvedValue('z'.repeat(20));
    else vi.mocked(readFile).mockRejectedValue(new Error('SECRET'));
    expect((await runBillingOperatorSession(options(), Client)).code).toBe(kind === 'wrong' ? 'linked-project-mismatch' : 'linked-project-unavailable');
    expect(Client.instances).toHaveLength(0);
  });
  it('passes a supplied CA without disabling certificate or hostname checks', async () => {
    const ca = '-----BEGIN CERTIFICATE-----\nsynthetic-test-only\n-----END CERTIFICATE-----';
    await runBillingOperatorSession({ ...options(), ca }, Client);
    expect(Client.instances[0].config.ssl).toMatchObject({ ca, rejectUnauthorized: true, checkServerIdentity: expect.any(Function) });
  });
  it.each(['secret', '-----BEGIN CERTIFICATE-----\n-----BEGIN PRIVATE KEY-----', 'x'.repeat(65537)])('rejects invalid CA input before connection: %#', async ca => {
    expect((await runBillingOperatorSession({ ...options(), ca }, Client)).code).toBe('target-configuration-rejected');
    expect(Client.instances).toHaveLength(0);
  });
});

describe('live connection verification and cleanup', () => {
  it.each(['plaintext', 'untrusted', 'hostname', 'database', 'sessionUser', 'currentUser', 'recovery', 'connect-error'])('closes and rejects %s before operator SQL', async kind => {
    class WrongClient extends Client {
      constructor(config: Config) {
        super(config);
        if (kind === 'plaintext') this.connection.stream.encrypted = false;
        if (kind === 'untrusted') this.connection.stream.authorized = false;
        if (kind === 'hostname') this.connection.stream.getPeerCertificate = () => ({ subjectaltname: 'DNS:other.supabase.co' });
        if (kind === 'connect-error') this.connect.mockRejectedValue(new Error('postgres://SECRET@host/owner-PRIVATE'));
        if (['database', 'sessionUser', 'currentUser', 'recovery'].includes(kind)) {
          this.query.mockResolvedValue({ rows: [{ database: 'postgres', sessionUser: 'postgres', currentUser: 'postgres', recovery: false,
            [kind]: kind === 'recovery' ? true : 'wrong' }] });
        }
      }
    }
    const result = await runBillingOperatorSession(options(), WrongClient);
    expect(result).toEqual({ status: 'rejected', code: 'target-session-unavailable', mutationsPerformed: false, connectionClosed: true });
    expect(Client.instances[0].end).toHaveBeenCalledOnce();
    expect(verifyBillingInsertSchema).not.toHaveBeenCalled(); expect(executeReviewedBillingInsert).not.toHaveBeenCalled();
  });
  it('keeps an old schema unapproved even on the verified target', async () => {
    vi.mocked(verifyBillingInsertSchema).mockResolvedValue(false);
    expect(await runBillingOperatorSession(options(), Client)).toMatchObject({ status: 'inspected', schemaVerified: false,
      applyAllowed: false, connectionClosed: true });
  });
  it('sanitizes schema read failures and closes the connection', async () => {
    vi.mocked(verifyBillingInsertSchema).mockRejectedValue(new Error('SECRET'));
    expect(await runBillingOperatorSession(options(), Client)).toEqual({ status: 'rejected', code: 'target-session-unavailable',
      mutationsPerformed: false, connectionClosed: true });
  });
  it('handles an asynchronous connection error without letting it reach the operator', async () => {
    class Disconnected extends Client {
      connect = vi.fn(async () => { this.emit('error', new Error('SECRET')); });
    }
    expect(await runBillingOperatorSession(options(), Disconnected)).toMatchObject({ status: 'rejected', connectionClosed: true });
    expect(executeReviewedBillingInsert).not.toHaveBeenCalled();
  });
});

describe('review, approval and uncertain commit ownership', () => {
  it.each(['absent', 'project', 'environment', 'target', 'request', 'snapshot', 'counts', 'shutdown', 'review'])('rejects mismatched approval without connecting: %s', async kind => {
    const approval = await approved(); const batch = prepared(); Client.instances = [];
    if (kind === 'project') approval.projectRef = 'z'.repeat(20);
    if (kind === 'environment') approval.providerEnvironment = 'production';
    if (kind === 'target') approval.targetFingerprint = 'b'.repeat(64);
    if (kind === 'request') approval.requestId = 'other';
    if (kind === 'snapshot') approval.snapshotFingerprint = 'b'.repeat(64);
    if (kind === 'counts') approval.insertCount = 2;
    if (kind === 'shutdown') approval.admissionShutdownConfirmed = false;
    if (kind === 'review') batch.review.expectedProjectRef = 'z'.repeat(20);
    expect((await runBillingOperatorSession({ ...options(), mode: 'apply', prepared: batch,
      approval: kind === 'absent' ? undefined : approval }, Client)).status).toBe('rejected');
    expect(Client.instances).toHaveLength(0); expect(executeReviewedBillingInsert).not.toHaveBeenCalled();
  });
  it('owns the reviewed payload and approval before connecting', async () => {
    const approval = await approved(); const batch = prepared();
    const operation = runBillingOperatorSession({ ...options(), mode: 'apply', prepared: batch, approval }, Client);
    batch.payload.accounts[0].inserts[0].id = 'swapped'; approval.insertCount = 2;
    expect(await operation).toMatchObject({ status: 'committed', mutationsPerformed: true, connectionClosed: true });
    expect(executeReviewedBillingInsert).toHaveBeenCalledWith(Client.instances[1], expect.objectContaining({
      accounts: [{ user_id: 'owner-PRIVATE', inserts: [{ id: 'subscription-PRIVATE' }] }],
    }), expect.objectContaining({ insertCount: 1 }));
  });
  it('never retries uncertain commit and recovers through a separately opened read-only session', async () => {
    const approval = await approved();
    vi.mocked(executeReviewedBillingInsert).mockResolvedValue({ status: 'commit-unconfirmed', requestId: prepared().payload.request_id,
      discardConnection: true, requiresReceiptLookup: true });
    const result = await runBillingOperatorSession({ ...options(), mode: 'apply', prepared: prepared(), approval }, Client);
    expect(result).toMatchObject({ status: 'commit-unconfirmed', connectionClosed: true, requiresReceiptLookup: true });
    expect(result).not.toHaveProperty('mutationsPerformed');
    vi.mocked(findBillingInsertReceipt).mockResolvedValue({ requestId: prepared().payload.request_id, insertedCount: 1 });
    const lookup = await runBillingOperatorSession({ ...options(), mode: 'receipt', prepared: prepared() }, Client);
    expect(lookup).toMatchObject({ status: 'receipt-found', connectionClosed: true, mutationsPerformed: false });
    expect(Client.instances[1]).not.toBe(Client.instances[2]);
    expect(Client.instances[2].query.mock.calls.slice(1).map(([sql]) => sql)).toEqual(['BEGIN READ ONLY', 'ROLLBACK']);
    expect(executeReviewedBillingInsert).toHaveBeenCalledOnce();
  });
  it('preserves uncertainty on an unexpected operator failure', async () => {
    const approval = await approved(); vi.mocked(executeReviewedBillingInsert).mockRejectedValue(new Error('SECRET'));
    const result = await runBillingOperatorSession({ ...options(), mode: 'apply', prepared: prepared(), approval }, Client);
    expect(result).toMatchObject({ status: 'commit-unconfirmed', connectionClosed: true });
    expect(result).not.toHaveProperty('mutationsPerformed'); expect(JSON.stringify(result)).not.toContain('SECRET');
  });
  it('does not turn a missing receipt into an automatic retry', async () => {
    vi.mocked(findBillingInsertReceipt).mockResolvedValue(null);
    expect(await runBillingOperatorSession({ ...options(), mode: 'receipt', prepared: prepared() }, Client))
      .toMatchObject({ status: 'receipt-not-found', receipt: null, connectionClosed: true });
    expect(executeReviewedBillingInsert).not.toHaveBeenCalled();
  });
  it('preserves the commit result and destroys a connection whose close fails', async () => {
    const approval = await approved();
    class EndFailure extends Client { end = vi.fn().mockRejectedValue(new Error('SECRET')); }
    expect(await runBillingOperatorSession({ ...options(), mode: 'apply', prepared: prepared(), approval }, EndFailure))
      .toMatchObject({ status: 'committed', mutationsPerformed: true, connectionClosed: false });
    expect(Client.instances[1].connection.stream.destroy).toHaveBeenCalledOnce();
  });
  it('bounds a hanging socket close without changing an acknowledged commit', async () => {
    const approval = await approved(); vi.useFakeTimers();
    class HangingClose extends Client { end = vi.fn(() => new Promise<void>(() => {})); }
    const operation = runBillingOperatorSession({ ...options(), mode: 'apply', prepared: prepared(), approval }, HangingClose);
    await vi.advanceTimersByTimeAsync(5001);
    expect(await operation).toMatchObject({ status: 'committed', mutationsPerformed: true, connectionClosed: false });
    expect(Client.instances[1].connection.stream.destroy).toHaveBeenCalledOnce();
  });
});
