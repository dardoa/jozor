import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPersonMediaAssetRef } from '../../types';

const {
  downloadMock,
  getSupabaseFullMock,
  getSupabaseSessionAccessTokenMock,
  storageFromMock,
} = vi.hoisted(() => {
  const download = vi.fn();
  const storageFrom = vi.fn(() => ({ download }));
  return {
    downloadMock: download,
    getSupabaseFullMock: vi.fn(() => ({ storage: { from: storageFrom } })),
    getSupabaseSessionAccessTokenMock: vi.fn(),
    storageFromMock: storageFrom,
  };
});

vi.mock('../supabaseClient', () => ({
  getSupabaseFull: getSupabaseFullMock,
  getSupabaseSessionAccessToken: getSupabaseSessionAccessTokenMock,
}));

import {
  buildPersonMediaGatewayUrl,
  createPersonMediaAssetResolver,
  createPersonMediaPosterSource,
  loadPersonMediaAssetBlob,
  loadPersonMediaAssetBlobForCurrentSession,
  parsePersonMediaPosterSource,
  type PersonMediaAssetRequest,
} from '../personMediaAssetService';

const asset = createPersonMediaAssetRef({
  treeId: 'tree-1',
  assetId: '123e4567-e89b-42d3-a456-426614174000',
  kind: 'profile-photo',
  mimeType: 'image/webp',
  byteLength: 4,
  createdAt: '2026-09-05T00:00:00.000Z',
});

const request: PersonMediaAssetRequest = {
  treeId: 'tree-1',
  personId: 'private-person-id',
  userId: 'user-1',
  role: 'owner',
  asset,
};

describe('personMediaAssetService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSupabaseSessionAccessTokenMock.mockResolvedValue('session-token');
    downloadMock.mockResolvedValue({
      data: new Blob(['RIFF'], { type: 'image/webp' }),
      error: null,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('deduplicates object URL acquisition and revokes it at the last release', async () => {
    const loadBlob = vi.fn(async () => new Blob(['RIFF'], { type: 'image/webp' }));
    const createObjectUrl = vi.fn(() => 'blob:private-person-media');
    const revokeObjectUrl = vi.fn();
    const resolver = createPersonMediaAssetResolver({ loadBlob, createObjectUrl, revokeObjectUrl });

    await expect(resolver.acquireObjectUrl(request)).resolves.toBe('blob:private-person-media');
    await expect(resolver.acquireObjectUrl(request)).resolves.toBe('blob:private-person-media');
    expect(loadBlob).toHaveBeenCalledTimes(1);

    resolver.releaseObjectUrl(request);
    expect(revokeObjectUrl).not.toHaveBeenCalled();
    resolver.releaseObjectUrl(request);
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:private-person-media');
  });

  it('rejects a cross-tree reference before contacting the loader', async () => {
    const loadBlob = vi.fn(async () => new Blob(['RIFF'], { type: 'image/webp' }));
    const resolver = createPersonMediaAssetResolver({ loadBlob });

    await expect(resolver.acquireObjectUrl({ ...request, treeId: 'tree-2' }))
      .rejects.toThrow('does not belong to the active tree');
    expect(loadBlob).not.toHaveBeenCalled();
  });

  it('builds a gateway URL with identity selectors but no storage path', () => {
    const url = buildPersonMediaGatewayUrl(request);

    expect(url).toContain(`assetId=${asset.assetId}`);
    expect(url).toContain('kind=profile-photo');
    expect(url).not.toContain(encodeURIComponent(asset.objectPath));
    expect(url).not.toContain('person-media%2F');
  });

  it('round-trips a validated private poster source and rejects tampering', () => {
    const source = createPersonMediaPosterSource(asset);

    expect(parsePersonMediaPosterSource(source)).toEqual(asset);
    expect(source).not.toMatch(/^https?:/);
    expect(parsePersonMediaPosterSource(`${source}tampered`)).toBeNull();
    expect(parsePersonMediaPosterSource('https://storage.example/private.webp')).toBeNull();
  });

  it.each(['owner', 'editor', 'viewer'] as const)('routes %s media through the gateway without a direct Storage read', async (role) => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => ({
      ok: true,
      blob: async () => new Blob(['RIFF'], { type: 'image/webp' }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const blob = await loadPersonMediaAssetBlob({ ...request, role });

    expect(blob.type).toBe('image/webp');
    expect(getSupabaseFullMock).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledOnce();
    const [gatewayUrl, init] = fetchMock.mock.calls[0];
    expect(gatewayUrl).toContain('/api/person-media?');
    expect(gatewayUrl).not.toContain(asset.objectPath);
    expect(JSON.stringify(init)).not.toContain(asset.objectPath);
    expect(init).toMatchObject({
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Authorization: 'Bearer session-token' },
    });
    expect(storageFromMock).not.toHaveBeenCalled();
  });

  it('routes asset-only archive/poster loads through fresh server authorization', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, blob: async () => new Blob(['RIFF'], { type: 'image/webp' }) }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(loadPersonMediaAssetBlobForCurrentSession(asset)).resolves.toBeInstanceOf(Blob);
    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    const params = new URL(url, 'https://app.example.test').searchParams;
    expect(params.has('personId')).toBe(false);
    expect(params.get('mimeType')).toBe(asset.mimeType);
    expect(params.get('byteLength')).toBe(String(asset.byteLength));
    expect(url).not.toContain(asset.objectPath);
    expect(getSupabaseFullMock).not.toHaveBeenCalled();
  });

  it('does not fall back to direct Storage when the gateway rejects stale access', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404 })));
    await expect(loadPersonMediaAssetBlob(request)).rejects.toThrow('(404)');
    await expect(loadPersonMediaAssetBlobForCurrentSession(asset)).rejects.toThrow('(404)');
    expect(getSupabaseFullMock).not.toHaveBeenCalled();
  });

  it('rejects media bytes whose size does not match the immutable reference', async () => {
    const loadBlob = vi.fn(async () => new Blob(['larger-payload'], { type: 'image/webp' }));
    const resolver = createPersonMediaAssetResolver({ loadBlob });

    await expect(resolver.acquireObjectUrl(request)).rejects.toThrow('size does not match');
    await expect(resolver.loadBytes(request)).rejects.toThrow('size does not match');
  });

  it.each(['resolve', 'reject'] as const)('does not let an expired request %s overwrite a new cache entry', async (outcome) => {
    let resolveOld!: (blob: Blob) => void;
    let rejectOld!: (error: Error) => void;
    const oldLoad = new Promise<Blob>((resolve, reject) => { resolveOld = resolve; rejectOld = reject; });
    const blob = new Blob(['RIFF'], { type: 'image/webp' });
    const loadBlob = vi.fn().mockReturnValueOnce(oldLoad).mockResolvedValue(blob);
    const createObjectUrl = vi.fn(() => 'blob:current-media');
    const revokeObjectUrl = vi.fn();
    const resolver = createPersonMediaAssetResolver({ loadBlob, createObjectUrl, revokeObjectUrl });
    const oldRequest = resolver.acquireObjectUrl(request);
    const expired = expect(oldRequest).rejects.toThrow();
    await Promise.resolve();
    resolver.clear();
    await expect(resolver.acquireObjectUrl(request)).resolves.toBe('blob:current-media');
    if (outcome === 'resolve') resolveOld(blob);
    else rejectOld(new Error('Old download failed'));
    await expired;
    await expect(resolver.acquireObjectUrl(request)).resolves.toBe('blob:current-media');
    expect(loadBlob).toHaveBeenCalledTimes(2);
    expect(createObjectUrl).toHaveBeenCalledOnce();
    resolver.releaseObjectUrl(request);
    expect(revokeObjectUrl).not.toHaveBeenCalled();
    resolver.releaseObjectUrl(request);
    expect(revokeObjectUrl).toHaveBeenCalledExactlyOnceWith('blob:current-media');
  });

  it('does not create an object URL for a download with no remaining consumers', async () => {
    const createObjectUrl = vi.fn();
    const loadBlob = vi.fn(async () => new Blob(['RIFF'], { type: 'image/webp' }));
    const resolver = createPersonMediaAssetResolver({ createObjectUrl, loadBlob });
    const pending = resolver.acquireObjectUrl(request);
    resolver.releaseObjectUrl(request);
    await expect(pending).rejects.toThrow('request expired');
    expect(createObjectUrl).not.toHaveBeenCalled();
  });

  it('does not reuse an owner-loaded object URL after the role changes to viewer', async () => {
    const loadBlob = vi.fn(async () => new Blob(['RIFF'], { type: 'image/webp' }));
    const createObjectUrl = vi.fn()
      .mockReturnValueOnce('blob:owner-media')
      .mockReturnValueOnce('blob:viewer-media');
    const resolver = createPersonMediaAssetResolver({ loadBlob, createObjectUrl });

    await expect(resolver.acquireObjectUrl(request)).resolves.toBe('blob:owner-media');
    await expect(resolver.acquireObjectUrl({ ...request, role: 'viewer' }))
      .resolves.toBe('blob:viewer-media');

    expect(loadBlob).toHaveBeenCalledTimes(2);
  });
});
