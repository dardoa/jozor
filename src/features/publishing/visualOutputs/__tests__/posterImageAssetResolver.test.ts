import { describe, expect, it, vi } from 'vitest';

import { createPosterImageAssetResolver } from '../posterImageAssetResolver';
import { createPersonMediaAssetRef } from '../../../../types';
import { createPersonMediaPosterSource } from '../../../../services/personMediaAssetService';

const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0x00]);
const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const WEBP_BYTES = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);

describe('posterImageAssetResolver', () => {
  it('normalizes private image sources to embedded assets without leaking the source', async () => {
    const source = 'https://storage.example.com/avatar.jpg?token=private-token';
    const loadBytes = vi.fn(async () => JPEG_BYTES);
    const resolver = createPosterImageAssetResolver({ loadBytes });
    const result = await resolver.resolveImages([{ previewId: 'preview-node-1', source }]);

    expect(loadBytes).toHaveBeenCalledWith(source);
    expect(result.failedPreviewIds).toEqual([]);
    expect(result.assets['preview-node-1']).toEqual({
      previewId: 'preview-node-1',
      mimeType: 'image/jpeg',
      dataUri: 'data:image/jpeg;base64,/9j/AA==',
      byteLength: 4,
    });
    expect(JSON.stringify(result)).not.toContain('storage.example.com');
    expect(JSON.stringify(result)).not.toContain('private-token');
  });

  it('detects PNG bytes and caches duplicate sources', async () => {
    const loadBytes = vi.fn(async () => PNG_BYTES);
    const resolver = createPosterImageAssetResolver({ loadBytes });
    const result = await resolver.resolveImages([
      { previewId: 'preview-node-1', source: 'https://images.example.com/shared.png' },
      { previewId: 'preview-node-2', source: 'https://images.example.com/shared.png' },
    ]);

    expect(loadBytes).toHaveBeenCalledTimes(1);
    expect(result.assets['preview-node-1']?.mimeType).toBe('image/png');
    expect(result.assets['preview-node-2']?.dataUri).toBe(result.assets['preview-node-1']?.dataUri);
  });

  it('accepts a controlled private media source and embeds only its bytes', async () => {
    const asset = createPersonMediaAssetRef({
      treeId: 'tree-1',
      assetId: '123e4567-e89b-42d3-a456-426614174000',
      kind: 'profile-photo',
      mimeType: 'image/webp',
      byteLength: WEBP_BYTES.byteLength,
      createdAt: '2026-09-05T00:00:00.000Z',
    });
    const source = createPersonMediaPosterSource(asset);
    const resolver = createPosterImageAssetResolver({ loadBytes: vi.fn(async () => WEBP_BYTES) });

    const result = await resolver.resolveImages([{ previewId: 'preview-node-1', source }]);

    expect(result.assets['preview-node-1']?.mimeType).toBe('image/webp');
    expect(JSON.stringify(result)).not.toContain(asset.objectPath);
    expect(JSON.stringify(result)).not.toContain(asset.assetId);
  });

  it('deduplicates private bytes per resolution without retaining them across sessions', async () => {
    const asset = createPersonMediaAssetRef({
      treeId: 'tree-1',
      assetId: '123e4567-e89b-42d3-a456-426614174001',
      kind: 'profile-photo',
      mimeType: 'image/webp',
      byteLength: WEBP_BYTES.byteLength,
      createdAt: '2026-09-05T00:00:00.000Z',
    });
    const source = createPersonMediaPosterSource(asset);
    const loadBytes = vi.fn(async () => WEBP_BYTES);
    const resolver = createPosterImageAssetResolver({ loadBytes });

    await resolver.resolveImages([
      { previewId: 'preview-node-1', source },
      { previewId: 'preview-node-2', source },
    ]);
    expect(loadBytes).toHaveBeenCalledTimes(1);

    await resolver.resolveImages([{ previewId: 'preview-node-1', source }]);
    expect(loadBytes).toHaveBeenCalledTimes(2);
  });

  it('uses safe per-person fallback when a source or payload fails', async () => {
    const resolver = createPosterImageAssetResolver({
      loadBytes: async () => new Uint8Array([0x00, 0x01]),
    });
    const result = await resolver.resolveImages([
      { previewId: 'preview-node-1', source: 'ftp://private.example.com/avatar.jpg' },
      { previewId: 'preview-node-2', source: 'https://images.example.com/invalid.jpg' },
    ]);

    expect(result.assets).toEqual({});
    expect(result.failedPreviewIds).toEqual(['preview-node-1', 'preview-node-2']);
  });

  it('retries a source after a transient load failure', async () => {
    const source = 'https://images.example.com/transient.png';
    const loadBytes = vi.fn()
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce(PNG_BYTES);
    const resolver = createPosterImageAssetResolver({ loadBytes });

    await expect(resolver.resolveImages([{ previewId: 'preview-node-1', source }]))
      .resolves.toMatchObject({ failedPreviewIds: ['preview-node-1'] });
    const recovered = await resolver.resolveImages([{ previewId: 'preview-node-1', source }]);

    expect(recovered.failedPreviewIds).toEqual([]);
    expect(recovered.assets['preview-node-1']?.mimeType).toBe('image/png');
    expect(loadBytes).toHaveBeenCalledTimes(2);
  });

  it('enforces session ids, image count, and byte limits', async () => {
    const resolver = createPosterImageAssetResolver({
      maxBytesPerImage: 3,
      maxImageCount: 1,
      loadBytes: async () => JPEG_BYTES,
    });

    await expect(resolver.resolveImages([
      { previewId: 'raw-person-id', source: 'https://images.example.com/avatar.jpg' },
    ])).rejects.toThrow('session-isolated');

    await expect(resolver.resolveImages([
      { previewId: 'preview-node-1', source: 'https://images.example.com/a.jpg' },
      { previewId: 'preview-node-2', source: 'https://images.example.com/b.jpg' },
    ])).rejects.toThrow('image count limit');

    const oversized = await resolver.resolveImages([
      { previewId: 'preview-node-1', source: 'https://images.example.com/avatar.jpg' },
    ]);
    expect(oversized.assets).toEqual({});
    expect(oversized.failedPreviewIds).toEqual(['preview-node-1']);
  });
});
