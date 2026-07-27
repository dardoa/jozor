import { describe, expect, it, vi } from 'vitest';

import { createPosterImageAssetResolver } from '../posterImageAssetResolver';

const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0x00]);
const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

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
