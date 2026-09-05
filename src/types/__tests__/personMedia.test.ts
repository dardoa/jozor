import { describe, expect, it } from 'vitest';
import {
  createPersonMediaAssetRef,
  detectPersonMediaImageMimeType,
  isPersonMediaImageMimeType,
  isPersonMediaAssetForTree,
  isPersonMediaAssetRef,
  PERSON_MEDIA_MAX_IMAGE_BYTES,
} from '../personMedia';

const ASSET_ID = '123e4567-e89b-42d3-a456-426614174000';

describe('PersonMediaAssetRef', () => {
  it('accepts only the image formats supported by the private bucket', () => {
    expect(isPersonMediaImageMimeType('image/jpeg')).toBe(true);
    expect(isPersonMediaImageMimeType('image/png')).toBe(true);
    expect(isPersonMediaImageMimeType('image/webp')).toBe(true);
    expect(isPersonMediaImageMimeType('image/svg+xml')).toBe(false);
    expect(isPersonMediaImageMimeType('image/gif')).toBe(false);
  });

  it('detects supported image formats from their binary signatures', () => {
    expect(detectPersonMediaImageMimeType(new Uint8Array([0xff, 0xd8, 0xff]))).toBe('image/jpeg');
    expect(detectPersonMediaImageMimeType(
      new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    )).toBe('image/png');
    expect(detectPersonMediaImageMimeType(
      new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])
    )).toBe('image/webp');
    expect(detectPersonMediaImageMimeType(new Uint8Array([0x3c, 0x73, 0x76, 0x67]))).toBeNull();
  });

  it('creates a canonical private image reference without a person ID in its path', () => {
    const asset = createPersonMediaAssetRef({
      treeId: '8beb27bc-7513-4349-9271-31cb39224986',
      assetId: ASSET_ID,
      kind: 'profile-photo',
      mimeType: 'image/webp',
      byteLength: 1024,
      createdAt: '2026-09-05T00:00:00.000Z',
    });

    expect(asset.objectPath).toBe(
      `8beb27bc-7513-4349-9271-31cb39224986/profile-photo/${ASSET_ID}.webp`
    );
    expect(isPersonMediaAssetRef(asset)).toBe(true);
    expect(isPersonMediaAssetForTree(asset, '8beb27bc-7513-4349-9271-31cb39224986')).toBe(true);
  });

  it.each([
    { objectPath: `tree-1/profile-photo/../${ASSET_ID}.webp` },
    { objectPath: `tree-1/gallery-photo/${ASSET_ID}.webp` },
    { objectPath: `https://storage.example/${ASSET_ID}.webp` },
    { assetId: 'person-raw-id' },
    { bucket: 'avatars' },
    { provider: 'public-url' },
    { mimeType: 'image/svg+xml' },
    { byteLength: 0 },
    { byteLength: PERSON_MEDIA_MAX_IMAGE_BYTES + 1 },
    { version: 0 },
    { unexpected: 'field' },
  ])('rejects malformed or transport-unsafe references: %o', (override) => {
    const valid = createPersonMediaAssetRef({
      treeId: 'tree-1',
      assetId: ASSET_ID,
      kind: 'profile-photo',
      mimeType: 'image/webp',
      byteLength: 1024,
      createdAt: '2026-09-05T00:00:00.000Z',
    });

    expect(isPersonMediaAssetRef({ ...valid, ...override })).toBe(false);
  });
});
