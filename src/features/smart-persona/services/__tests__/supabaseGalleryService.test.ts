import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fromMock, processImageFileMock, uploadMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  processImageFileMock: vi.fn(),
  uploadMock: vi.fn(),
}));

const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0x00]);

vi.mock('../../../../services/supabaseClient', () => ({
  getSupabaseFull: vi.fn(() => ({ storage: { from: fromMock } })),
}));

vi.mock('../../../../utils/imageLogic', () => ({
  processImageFile: processImageFileMock,
}));

vi.mock('../../../../utils/errorLogger', () => ({ logError: vi.fn() }));

import { SupabaseGalleryService } from '../supabaseGalleryService';

describe('SupabaseGalleryService private uploads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    processImageFileMock.mockResolvedValue(new Blob([JPEG_BYTES], { type: 'image/jpeg' }));
    uploadMock.mockResolvedValue({ error: null });
    fromMock.mockReturnValue({ upload: uploadMock });
  });

  it('uses the processed JPEG MIME type consistently in the asset, path, and upload', async () => {
    const result = await SupabaseGalleryService.uploadToGallery({
      treeId: '8beb27bc-7513-4349-9271-31cb39224986',
      personId: 'raw-person-id-must-not-enter-path',
      file: new File(['image'], 'photo.png', { type: 'image/png' }),
      uid: 'user-1',
      email: 'owner@example.test',
    });

    expect(fromMock).toHaveBeenCalledWith('person-media');
    const [objectPath, uploadedBlob, uploadOptions] = uploadMock.mock.calls[0];
    expect(objectPath).toMatch(
      /^8beb27bc-7513-4349-9271-31cb39224986\/gallery-photo\/[0-9a-f-]+\.jpg$/
    );
    expect(objectPath).not.toContain('raw-person-id-must-not-enter-path');
    expect(uploadedBlob.type).toBe('image/jpeg');
    expect(uploadOptions).toMatchObject({ contentType: 'image/jpeg', upsert: false });
    expect(result.asset).toBeDefined();
    if (!result.asset) throw new Error('Expected a private gallery asset reference.');
    expect(result.asset.mimeType).toBe('image/jpeg');
    expect(result.asset.objectPath).toBe(objectPath);
    expect(result.createdAt).toBe(result.asset.createdAt);
  });

  it('rejects an unsupported processor result before storage upload', async () => {
    processImageFileMock.mockResolvedValue(new Blob([JPEG_BYTES], { type: 'image/gif' }));

    await expect(SupabaseGalleryService.uploadToGallery({
      treeId: '8beb27bc-7513-4349-9271-31cb39224986',
      personId: 'person-1',
      file: new File(['image'], 'photo.png', { type: 'image/png' }),
      uid: 'user-1',
      email: 'owner@example.test',
    })).rejects.toThrow('unsupported file type');

    expect(uploadMock).not.toHaveBeenCalled();
  });
});
