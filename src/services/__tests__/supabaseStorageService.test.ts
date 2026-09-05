import { beforeEach, describe, expect, it, vi } from 'vitest';

const { compressionMock, fromMock, rpcMock, uploadMock } = vi.hoisted(() => ({
  compressionMock: vi.fn(),
  fromMock: vi.fn(),
  rpcMock: vi.fn(),
  uploadMock: vi.fn(),
}));

vi.mock('browser-image-compression', () => ({
  default: compressionMock,
}));

vi.mock('../supabaseClient', () => ({
  getSupabaseFull: vi.fn(() => ({
    storage: { from: fromMock },
    rpc: rpcMock,
  })),
}));

vi.mock('../../utils/errorLogger', () => ({ logError: vi.fn() }));

import { SupabaseStorageService } from '../supabaseStorageService';

const WEBP_BYTES = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
]);
const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe('SupabaseStorageService person photos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    compressionMock.mockResolvedValue(new Blob([WEBP_BYTES], { type: 'image/webp' }));
    uploadMock.mockResolvedValue({ error: null });
    fromMock.mockReturnValue({ upload: uploadMock });
  });

  it('uploads an immutable object to the private bucket without publishing a URL or mutating the database', async () => {
    const result = await SupabaseStorageService.uploadAndCompressImage({
      treeId: '8beb27bc-7513-4349-9271-31cb39224986',
      personId: 'raw-person-id-must-not-enter-path',
      file: new File(['image'], 'photo.png', { type: 'image/png' }),
      uid: 'user-1',
      email: 'owner@example.test',
      token: 'session-token',
      currentVersion: 3,
    });

    expect(fromMock).toHaveBeenCalledWith('person-media');
    const [objectPath, , uploadOptions] = uploadMock.mock.calls[0];
    expect(objectPath).toMatch(/^8beb27bc-7513-4349-9271-31cb39224986\/profile-photo\/[0-9a-f-]+\.webp$/);
    expect(objectPath).not.toContain('raw-person-id-must-not-enter-path');
    expect(uploadOptions).toMatchObject({ upsert: false, contentType: 'image/webp' });
    expect(result.asset.objectPath).toBe(objectPath);
    expect(result.photoVersion).toBe(4);
    expect(result).not.toHaveProperty('publicUrl');
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('rejects a compressor result that is not the declared WebP format', async () => {
    compressionMock.mockResolvedValue(new Blob([PNG_BYTES], { type: 'image/jpeg' }));

    await expect(SupabaseStorageService.uploadAndCompressImage({
      treeId: '8beb27bc-7513-4349-9271-31cb39224986',
      personId: 'person-1',
      file: new File(['image'], 'photo.png', { type: 'image/png' }),
      uid: 'user-1',
      email: 'owner@example.test',
    })).rejects.toThrow('valid WebP');

    expect(uploadMock).not.toHaveBeenCalled();
  });

  it('uploads an archive blob using its verified binary signature and normalizes its MIME type', async () => {
    const asset = await SupabaseStorageService.uploadPersonMediaBlob({
      treeId: '8beb27bc-7513-4349-9271-31cb39224986',
      personId: 'person-1',
      blob: new Blob([PNG_BYTES]),
      kind: 'gallery-photo',
      uid: 'user-1',
      email: 'owner@example.test',
      token: 'session-token',
    });

    expect(asset).toMatchObject({ kind: 'gallery-photo', mimeType: 'image/png', byteLength: 8 });
    expect(asset.objectPath).toMatch(/\/gallery-photo\/[0-9a-f-]+\.png$/);
    const [, uploadedBlob, options] = uploadMock.mock.calls[0];
    expect(uploadedBlob).toMatchObject({ type: 'image/png', size: 8 });
    expect(options).toMatchObject({ contentType: 'image/png', upsert: false });
  });

  it.each([
    ['unsupported bytes', new Blob([new Uint8Array([1, 2, 3])])],
    ['mismatched declared MIME', new Blob([PNG_BYTES], { type: 'image/webp' })],
  ])('rejects %s before an archive media upload', async (_label, blob) => {
    await expect(SupabaseStorageService.uploadPersonMediaBlob({
      treeId: '8beb27bc-7513-4349-9271-31cb39224986',
      personId: 'person-1', blob, kind: 'profile-photo',
      uid: 'user-1', email: 'owner@example.test',
    })).rejects.toThrow(/Person media upload/);
    expect(uploadMock).not.toHaveBeenCalled();
  });
});
