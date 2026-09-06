import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  authenticateUserMock,
  createClientMock,
} = vi.hoisted(() => ({
  authenticateUserMock: vi.fn(),
  createClientMock: vi.fn(),
}));

vi.mock('../../utils/authUtils', () => ({
  authenticateUser: (...args: unknown[]) => authenticateUserMock(...args),
}));
vi.mock('../../services/supabaseConfig', () => ({
  resolvedSupabaseUrl: 'https://project.supabase.co',
}));
vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
}));

import handler from '../person-media-migration';

const TREE_ID = '11111111-1111-4111-8111-111111111111';
const WEBP_BYTES = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
]);

const createResponse = () => ({
  statusCode: 200,
  body: undefined as unknown,
  headers: {} as Record<string, unknown>,
  setHeader(name: string, value: unknown) {
    this.headers[name] = value;
  },
  status(code: number) {
    this.statusCode = code;
    return this;
  },
  json(payload: unknown) {
    this.body = payload;
    return this;
  },
  end() {
    return this;
  },
});

const createQuery = (result: unknown, terminal: 'maybeSingle' | 'range') => {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    range: vi.fn(),
    maybeSingle: vi.fn(),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.order.mockReturnValue(query);
  if (terminal === 'maybeSingle') query.maybeSingle.mockResolvedValue(result);
  else query.range.mockResolvedValue(result);
  return query;
};

const createAdmin = (ownerId = 'owner-1') => {
  const treeQuery = createQuery({ data: { owner_id: ownerId }, error: null }, 'maybeSingle');
  const peopleQuery = createQuery({
    data: [{
      id: 'person-1',
      tree_id: TREE_ID,
      photo_path: `${TREE_ID}/person-1.webp`,
      photo_url: null,
      photo_version: 2,
      custom_fields: {},
    }],
    error: null,
  }, 'range');
  const download = vi.fn(async () => ({
    data: new Blob([WEBP_BYTES], { type: 'image/webp' }),
    error: null,
  }));
  const upload = vi.fn(async () => ({ error: null }));
  const remove = vi.fn(async () => ({ error: null }));
  const storageFrom = vi.fn((_bucket: string) => ({
    download,
    upload,
    remove,
  }));
  const rpc = vi.fn(async (name: string, _args: unknown) => ({ data: name === 'count_pending_person_media_cleanup' ? 0 : true, error: null }));
  const from = vi.fn((table: string) => {
    if (table === 'trees') return treeQuery;
    if (table === 'people') return peopleQuery;
    throw new Error(`Unexpected table: ${table}`);
  });
  return {
    admin: { from, storage: { from: storageFrom }, rpc },
    download,
    upload,
    remove,
    rpc,
    from,
  };
};

describe('person media migration API', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      APP_ORIGIN: 'http://localhost:5173',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
    };
    authenticateUserMock.mockResolvedValue({
      type: 'internal',
      token: 'session-token',
      uid: 'owner-1',
      email: 'owner@example.test',
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('requires an authenticated tree owner before reading legacy person rows', async () => {
    const fixture = createAdmin('another-owner');
    createClientMock.mockReturnValue(fixture.admin);
    const res = createResponse();

    await handler({
      method: 'POST',
      headers: { authorization: 'Bearer session-token', origin: 'http://localhost:5173' },
      body: { treeId: TREE_ID },
    } as never, res as never);

    expect(res.statusCode).toBe(403);
    expect(fixture.from).toHaveBeenCalledTimes(1);
    expect(fixture.download).not.toHaveBeenCalled();
  });

  it('moves an owner legacy profile image and returns counts without identifiers or paths', async () => {
    const fixture = createAdmin();
    createClientMock.mockReturnValue(fixture.admin);
    const res = createResponse();

    await handler({
      method: 'POST',
      headers: { authorization: 'Bearer session-token', origin: 'http://localhost:5173' },
      body: { treeId: TREE_ID, offset: 0, limit: 10 },
    } as never, res as never);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      scannedCount: 1,
      migratedCount: 1,
      cleanedCount: 1,
      blockedCount: 0,
      externalCount: 0,
      failedCount: 0,
      nextOffset: 1,
      complete: true,
      pendingCleanupCount: 0,
    });
    expect(fixture.download).toHaveBeenCalledWith(`${TREE_ID}/person-1.webp`);
    expect(fixture.upload).toHaveBeenCalledTimes(1);
    expect(fixture.upload).toHaveBeenCalledWith(expect.any(String), expect.any(Blob),
      expect.objectContaining({ cacheControl: '0', upsert: false }));
    expect(fixture.rpc.mock.calls.map(([name]) => name)).toEqual([
      'attach_legacy_profile_person_media',
      'finalize_legacy_profile_person_media',
      'claim_person_media_cleanup',
      'complete_person_media_cleanup',
      'count_pending_person_media_cleanup',
    ]);
    expect(JSON.stringify(res.body)).not.toContain('person-1');
    expect(JSON.stringify(res.body)).not.toContain('/person-1.webp');
  });

  it('rejects invalid tree IDs and disallowed origins before creating an admin client', async () => {
    let res = createResponse();
    await handler({
      method: 'POST',
      headers: { authorization: 'Bearer session-token', origin: 'http://localhost:5173' },
      body: { treeId: '../tree' },
    } as never, res as never);
    expect(res.statusCode).toBe(400);

    res = createResponse();
    await handler({
      method: 'POST',
      headers: { authorization: 'Bearer session-token', origin: 'https://attacker.example' },
      body: { treeId: TREE_ID },
    } as never, res as never);
    expect(res.statusCode).toBe(400);
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it('hides internal migration failures from the response', async () => {
    const serverLog = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const fixture = createAdmin();
    fixture.admin.from = vi.fn(() => {
      throw new Error('private storage path detail');
    });
    createClientMock.mockReturnValue(fixture.admin);
    const res = createResponse();

    await handler({
      method: 'POST',
      headers: { authorization: 'Bearer session-token', origin: 'http://localhost:5173' },
      body: { treeId: TREE_ID },
    } as never, res as never);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      error: {
        message: 'Person media migration failed.',
        code: 'PERSON_MEDIA_MIGRATION_FAILED',
      },
    });
    expect(JSON.stringify(res.body)).not.toContain('private storage path detail');
    expect(serverLog).toHaveBeenCalledWith('[PERSON_MEDIA_LEGACY_MIGRATION_FAILED]', { errorType: 'Error' });
    expect(JSON.stringify(serverLog.mock.calls)).not.toContain('private storage path detail');
    serverLog.mockRestore();
  });
});
