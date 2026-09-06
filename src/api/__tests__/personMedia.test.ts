import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPersonMediaAssetRef } from '../../types';

const authenticateUserMock = vi.fn();
const createSupabaseClientForUserMock = vi.fn();
const adminDownloadMock = vi.fn();
const adminFromMock = vi.fn(() => ({ download: adminDownloadMock }));

vi.mock('../../utils/authUtils', () => ({
  authenticateUser: (...args: unknown[]) => authenticateUserMock(...args),
  createSupabaseClientForUser: (...args: unknown[]) => createSupabaseClientForUserMock(...args),
}));

vi.mock('@supabase/supabase-js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@supabase/supabase-js')>();
  return {
    ...actual,
    createClient: vi.fn(() => ({
      storage: { from: adminFromMock },
    })),
  };
});

import handler, { resolveAuthorizedPersonMediaAsset } from '../person-media';

const TREE_ID = '8beb27bc-7513-4349-9271-31cb39224986';
const PERSON_ID = '7beb27bc-7513-4349-9271-31cb39224986';
const ASSET_ID = '123e4567-e89b-42d3-a456-426614174000';
const asset = createPersonMediaAssetRef({
  treeId: TREE_ID,
  assetId: ASSET_ID,
  kind: 'profile-photo',
  mimeType: 'image/webp',
  byteLength: 12,
  createdAt: '2026-09-05T00:00:00.000Z',
});

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
  send(payload: unknown) {
    this.body = payload;
    return this;
  },
  end() {
    return this;
  },
});

const createSecurePersonQuery = (row: unknown) => {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(() => Promise.resolve({ data: row, error: null })),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  return { from: vi.fn(() => query), query };
};

describe('person media delivery API', () => {
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
      uid: 'user-1',
      email: 'user@example.test',
    });
    adminDownloadMock.mockResolvedValue({
      data: {
        size: 12,
        type: 'image/webp',
        arrayBuffer: vi.fn(async () => new Uint8Array([
          0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
        ]).buffer),
      },
      error: null,
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('resolves only the exact asset referenced by the secure person row', () => {
    const row = {
      id: PERSON_ID,
      tree_id: TREE_ID,
      custom_fields: { photoAsset: asset },
    };

    expect(resolveAuthorizedPersonMediaAsset(row, 'profile-photo', ASSET_ID)).toEqual(asset);
    expect(resolveAuthorizedPersonMediaAsset(row, 'profile-photo', crypto.randomUUID())).toBeNull();
    expect(resolveAuthorizedPersonMediaAsset({ ...row, custom_fields: {} }, 'profile-photo', ASSET_ID)).toBeNull();
  });

  it('returns bytes without returning the private object path or a signed URL', async () => {
    const secureQuery = createSecurePersonQuery({
      id: PERSON_ID,
      tree_id: TREE_ID,
      custom_fields: { photoAsset: asset },
    });
    createSupabaseClientForUserMock.mockReturnValue(secureQuery);
    const res = createResponse();

    await handler({
      method: 'GET',
      headers: { authorization: 'Bearer session-token', origin: 'http://localhost:5173' },
      query: { treeId: TREE_ID, personId: PERSON_ID, assetId: ASSET_ID, kind: 'profile-photo' },
    } as never, res as never);

    expect(res.statusCode).toBe(200);
    expect(res.headers['Content-Type']).toBe('image/webp');
    expect(res.headers['Cache-Control']).toBe('private, no-store, max-age=0');
    expect(res.headers.Vary).toBe('Origin, Authorization');
    expect(res.headers['X-Content-Type-Options']).toBe('nosniff');
    expect(Buffer.isBuffer(res.body)).toBe(true);
    expect(adminFromMock).toHaveBeenCalledWith('person-media');
    expect(adminDownloadMock).toHaveBeenCalledWith(asset.objectPath);
    expect(JSON.stringify(res.headers)).not.toContain(asset.objectPath);
  });

  it('fails closed when people_secure masks or withholds the asset', async () => {
    const secureQuery = createSecurePersonQuery({
      id: PERSON_ID,
      tree_id: TREE_ID,
      custom_fields: { gallery: [] },
    });
    createSupabaseClientForUserMock.mockReturnValue(secureQuery);
    const res = createResponse();

    await handler({
      method: 'GET',
      headers: { authorization: 'Bearer session-token' },
      query: { treeId: TREE_ID, personId: PERSON_ID, assetId: ASSET_ID, kind: 'profile-photo' },
    } as never, res as never);

    expect(res.statusCode).toBe(404);
    expect(adminDownloadMock).not.toHaveBeenCalled();
  });

  it.each(['owner', 'editor', 'viewer', 'removed', 'lookup-error'])('authorizes asset-only reads with current %s access', async (role) => {
    const rpc = vi.fn(async (name: string) => ({
      data: name === 'is_tree_owner' ? role === 'owner' : role === 'editor',
      error: role === 'lookup-error' ? new Error('Permission lookup failed') : null,
    }));
    createSupabaseClientForUserMock.mockReturnValue({ rpc });
    const res = createResponse();
    await handler({ method: 'GET', headers: { authorization: 'Bearer session-token' },
      query: { treeId: TREE_ID, assetId: ASSET_ID, kind: asset.kind,
        mimeType: asset.mimeType, byteLength: String(asset.byteLength) },
    } as never, res as never);
    expect(rpc).toHaveBeenCalledWith('is_tree_owner', { p_tree_id: TREE_ID });
    if (role === 'owner' || role === 'editor') {
      expect(res.statusCode).toBe(200);
      expect(adminDownloadMock).toHaveBeenCalledWith(asset.objectPath);
    } else {
      expect(res.statusCode).toBe(404);
      expect(adminDownloadMock).not.toHaveBeenCalled();
    }
    if (role === 'editor') expect(rpc).toHaveBeenCalledWith('is_tree_collaborator', {
      p_tree_id: TREE_ID, p_required_role: 'editor',
    });
  });

  it.each([
    { mimeType: 'image/svg+xml', byteLength: '12' },
    { mimeType: 'image/webp', byteLength: '5242881' },
    { mimeType: 'image/webp', byteLength: '12.5' },
    { mimeType: 'image/webp', byteLength: '0' },
    { mimeType: 'image/webp', byteLength: ['12'] },
    { mimeType: ['image/webp'], byteLength: '12' },
  ])('rejects malformed asset-only contracts before authorization', async (query) => {
    const res = createResponse();
    await handler({ method: 'GET', headers: { authorization: 'Bearer session-token' },
      query: { treeId: TREE_ID, assetId: ASSET_ID, kind: asset.kind, ...query },
    } as never, res as never);
    expect(res.statusCode).toBe(400);
    expect(createSupabaseClientForUserMock).not.toHaveBeenCalled();
    expect(adminDownloadMock).not.toHaveBeenCalled();
  });

  it('fails closed when stored bytes do not match the authorized media contract', async () => {
    const secureQuery = createSecurePersonQuery({
      id: PERSON_ID,
      tree_id: TREE_ID,
      custom_fields: { photoAsset: asset },
    });
    createSupabaseClientForUserMock.mockReturnValue(secureQuery);
    adminDownloadMock.mockResolvedValue({
      data: {
        size: 8,
        type: 'image/png',
        arrayBuffer: vi.fn(async () => new Uint8Array([
          0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        ]).buffer),
      },
      error: null,
    });
    const res = createResponse();

    await handler({
      method: 'GET',
      headers: { authorization: 'Bearer session-token' },
      query: { treeId: TREE_ID, personId: PERSON_ID, assetId: ASSET_ID, kind: 'profile-photo' },
    } as never, res as never);

    expect(res.statusCode).toBe(404);
    expect(res.body).not.toBeInstanceOf(Buffer);
  });

  it('rejects a missing session before querying the secure view', async () => {
    authenticateUserMock.mockResolvedValue(null);
    const res = createResponse();

    await handler({
      method: 'GET',
      headers: {},
      query: { treeId: TREE_ID, personId: PERSON_ID, assetId: ASSET_ID, kind: 'profile-photo' },
    } as never, res as never);

    expect(res.statusCode).toBe(401);
    expect(createSupabaseClientForUserMock).not.toHaveBeenCalled();
  });

  it.each([
    { treeId: 'not-a-tree-uuid', personId: PERSON_ID, assetId: ASSET_ID },
    { treeId: TREE_ID, personId: `person-${'x'.repeat(257)}`, assetId: ASSET_ID },
    { treeId: TREE_ID, personId: 'person\u0000id', assetId: ASSET_ID },
    { treeId: TREE_ID, personId: PERSON_ID, assetId: 'not-an-asset-uuid' },
  ])('rejects malformed identifiers before querying people_secure', async (query) => {
    const res = createResponse();

    await handler({
      method: 'GET',
      headers: { authorization: 'Bearer session-token' },
      query: { ...query, kind: 'profile-photo' },
    } as never, res as never);

    expect(res.statusCode).toBe(400);
    expect(createSupabaseClientForUserMock).not.toHaveBeenCalled();
    expect(adminDownloadMock).not.toHaveBeenCalled();
  });
});
