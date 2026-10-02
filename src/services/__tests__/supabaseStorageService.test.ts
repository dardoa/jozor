import { beforeEach, describe, expect, it, vi } from 'vitest';

const { compressionMock, fromMock, rpcMock, uploadMock, profileFromMock, profileQueryMock, removeMock, publicUrlMock } = vi.hoisted(() => ({
  compressionMock: vi.fn(),
  fromMock: vi.fn(),
  rpcMock: vi.fn(),
  uploadMock: vi.fn(),
  profileFromMock: vi.fn(), profileQueryMock: vi.fn(), removeMock: vi.fn(), publicUrlMock: vi.fn(),
}));

vi.mock('browser-image-compression', () => ({
  default: compressionMock,
}));

vi.mock('../supabaseClient', () => ({
  getSupabaseFull: vi.fn(() => ({
    storage: { from: fromMock },
    rpc: rpcMock,
    from: profileFromMock,
  })),
}));

vi.mock('../../utils/errorLogger', () => ({ logError: vi.fn() }));

import { SupabaseStorageService } from '../supabaseStorageService';
import { supabaseUrl } from '../supabaseConfig';

const avatarUrl = (path: string) => `${supabaseUrl}/storage/v1/object/public/avatars/${path}`;
const oldPath = 'users/user-1/profile.png';
const avatarFile = () => new File(['image'], 'profile.png', { type: 'image/png' });
const changeAvatar = () => SupabaseStorageService.uploadUserAvatar('user-1', 'owner@example.test', avatarFile(), 'session-token', 999);

const WEBP_BYTES = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
]);
const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe('SupabaseStorageService person photos', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    compressionMock.mockResolvedValue(new Blob([WEBP_BYTES], { type: 'image/webp' }));
    uploadMock.mockResolvedValue({ error: null });
    fromMock.mockReturnValue({ upload: uploadMock });
    profileQueryMock.mockResolvedValue({ data: { photo_path: oldPath, photo_url: avatarUrl(oldPath), photo_version: 2 }, error: null });
    profileFromMock.mockReturnValue({ select: vi.fn(() => ({ eq: vi.fn(() => ({ single: profileQueryMock })) })) });
    publicUrlMock.mockImplementation((path: string) => ({ data: { publicUrl: avatarUrl(path) } }));
    removeMock.mockResolvedValue({ error: null });
    rpcMock.mockImplementation(async (name: string, args?: Record<string, unknown>) => ({
      error: null,
      data: name === 'replace_user_avatar' ? { photoPath: args?.p_photo_path, photoVersion: 3 }
        : name === 'list_my_user_avatar_cleanup' ? [{ object_path: oldPath }] : true,
    }));
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
    expect(uploadOptions).toMatchObject({ cacheControl: '0', upsert: false, contentType: 'image/webp' });
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

  it('uses fresh account-avatar keys, including when a recreated account resets its photo version', async () => {
    fromMock.mockReturnValue({ upload: uploadMock, getPublicUrl: publicUrlMock, remove: removeMock });
    const result = await SupabaseStorageService.uploadUserAvatar('user-1', 'owner@example.test',
      new File(['image'], 'profile.png', { type: 'image/png' }), 'session-token', 2);
    expect(fromMock).toHaveBeenCalledWith('avatars');
    const path = uploadMock.mock.calls[0][0];
    expect(path).toMatch(/^users\/user-1\/profile-[0-9a-f-]{36}\.webp$/);
    expect(uploadMock).toHaveBeenCalledWith(path, expect.any(Blob), {
      upsert: false, contentType: 'image/webp',
    });
    expect(rpcMock).toHaveBeenCalledWith('replace_user_avatar', {
      p_photo_url: avatarUrl(path), p_photo_path: path, p_expected_photo_path: oldPath, p_expected_photo_version: 2,
    });
    expect(result).toEqual({ publicUrl: `${avatarUrl(path)}?v=3`, photoPath: path, photoVersion: 3 });
    profileQueryMock.mockResolvedValueOnce({ data: { photo_path: null, photo_url: null, photo_version: null }, error: null });
    rpcMock.mockImplementation(async (name: string, args?: Record<string, unknown>) => ({
      error: null, data: name === 'replace_user_avatar' ? { photoPath: args?.p_photo_path, photoVersion: 1 } : name === 'list_my_user_avatar_cleanup' ? [] : true,
    }));
    const recreated = await SupabaseStorageService.uploadUserAvatar('user-1', 'owner@example.test',
      new File(['image'], 'profile.png', { type: 'image/png' }), 'new-session-token', 0);
    expect(recreated.photoPath).not.toBe(path);
    expect(recreated.photoPath).not.toBe('users/user-1/profile.webp');
    expect(recreated.photoVersion).toBe(1);
  });

  it('uses the database snapshot and committed version and removes only after commit', async () => {
    fromMock.mockReturnValue({ upload: uploadMock, getPublicUrl: publicUrlMock, remove: removeMock });
    const result = await changeAvatar();
    expect(profileQueryMock.mock.invocationCallOrder[0]).toBeLessThan(uploadMock.mock.invocationCallOrder[0]);
    expect(result.photoVersion).toBe(3);
    expect(removeMock).toHaveBeenCalledWith([oldPath]);
    expect(removeMock).not.toHaveBeenCalledWith([result.photoPath]);
    expect(rpcMock.mock.calls.map(([name]) => name)).toEqual(['replace_user_avatar', 'list_my_user_avatar_cleanup', 'claim_user_avatar_cleanup', 'complete_user_avatar_cleanup']);
    expect(rpcMock.mock.invocationCallOrder[0]).toBeLessThan(removeMock.mock.invocationCallOrder[0]);
  });
  it('reports a committed upload as successful despite cleanup failure and retries at the next change', async () => {
    fromMock.mockReturnValue({ upload: uploadMock, getPublicUrl: publicUrlMock, remove: removeMock });
    removeMock.mockResolvedValueOnce({ error: { message: 'offline' } });
    await expect(changeAvatar()).resolves.toMatchObject({ photoVersion: 3 });
    expect(rpcMock.mock.calls.map(([name]) => name)).not.toContain('complete_user_avatar_cleanup');
    await changeAvatar();
    expect(removeMock).toHaveBeenCalledTimes(2);
    expect(rpcMock).toHaveBeenCalledWith('complete_user_avatar_cleanup', { p_object_path: oldPath });
  });
  it('reconciles a lost commit response from the current own profile without queuing it', async () => {
    fromMock.mockReturnValue({ upload: uploadMock, getPublicUrl: publicUrlMock, remove: removeMock });
    rpcMock.mockImplementation(async (name: string) => {
      if (name === 'replace_user_avatar') throw new Error('lost response');
      return { data: name === 'list_my_user_avatar_cleanup' ? [{ object_path: oldPath }] : true, error: null };
    });
    profileQueryMock.mockImplementationOnce(async () => ({ data: { photo_path: oldPath, photo_url: avatarUrl(oldPath), photo_version: 2 }, error: null }))
      .mockImplementationOnce(async () => { const path = uploadMock.mock.calls[0][0] as string; return { data: { photo_path: path, photo_url: avatarUrl(path), photo_version: 8 }, error: null }; });
    const result = await changeAvatar();
    expect(result.photoVersion).toBe(8);
    expect(rpcMock.mock.calls.map(([name]) => name)).not.toContain('request_user_avatar_cleanup');
    expect(removeMock).not.toHaveBeenCalledWith([result.photoPath]);
  });
  it('does not claim another winning upload as success and retires only its uncertain upload', async () => {
    fromMock.mockReturnValue({ upload: uploadMock, getPublicUrl: publicUrlMock, remove: removeMock });
    rpcMock.mockImplementation(async (name: string) => ({ data: name === 'list_my_user_avatar_cleanup' ? [] : true, error: name === 'replace_user_avatar' ? { message: 'conflict' } : null }));
    await expect(changeAvatar()).rejects.toThrow(/Profile update/);
    expect(rpcMock).toHaveBeenCalledWith('request_user_avatar_cleanup', { p_object_path: uploadMock.mock.calls[0][0] });
    expect(removeMock).not.toHaveBeenCalled();
  });
  it('does not delete when reconciliation or migration support is unavailable', async () => {
    fromMock.mockReturnValue({ upload: uploadMock, getPublicUrl: publicUrlMock, remove: removeMock });
    rpcMock.mockResolvedValue({ data: null, error: { message: 'missing migration' } });
    profileQueryMock.mockResolvedValueOnce({ data: { photo_path: oldPath, photo_url: avatarUrl(oldPath), photo_version: 2 }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'offline' } });
    await expect(changeAvatar()).rejects.toThrow(/Profile update/);
    expect(removeMock).not.toHaveBeenCalled();
  });
  it.each(['https://other.test/storage/v1/object/public/avatars/foreign', `${supabaseUrl}/storage/v1/object/public/avatars/users/user-1/wrong.webp`])('rejects a mismatched public URL %s', async url => {
    fromMock.mockReturnValue({ upload: uploadMock, getPublicUrl: publicUrlMock, remove: removeMock });
    publicUrlMock.mockReturnValue({ data: { publicUrl: url } });
    await expect(changeAvatar()).rejects.toThrow(/Avatar|avatar/);
    expect(rpcMock.mock.calls.map(([name]) => name)).not.toContain('replace_user_avatar');
    expect(removeMock).not.toHaveBeenCalled();
  });
  it('rejects invalid WebP or failed profile snapshots before uploading', async () => {
    compressionMock.mockResolvedValueOnce(new Blob([PNG_BYTES], { type: 'image/webp' }));
    await expect(changeAvatar()).rejects.toThrow(/WebP/);
    expect(uploadMock).not.toHaveBeenCalled();
    profileQueryMock.mockResolvedValueOnce({ data: null, error: { message: 'private' } });
    await expect(changeAvatar()).rejects.toThrow(/profile/i);
    expect(uploadMock).not.toHaveBeenCalled();
  });
  it.each([null, { photoPath: 'wrong', photoVersion: 3 }, { photoVersion: '3' }, { photoVersion: -1 }])('rejects malformed replacement result %j unless own profile confirms commit', async result => {
    fromMock.mockReturnValue({ upload: uploadMock, getPublicUrl: publicUrlMock, remove: removeMock });
    rpcMock.mockResolvedValue({ data: result, error: null });
    await expect(changeAvatar()).rejects.toThrow(/Profile update/);
    expect(removeMock).not.toHaveBeenCalled();
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
    expect(options).toMatchObject({ cacheControl: '0', contentType: 'image/png', upsert: false });
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
