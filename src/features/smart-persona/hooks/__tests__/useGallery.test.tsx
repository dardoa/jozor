import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAppStore } from '../../../../store/useAppStore';
import { createPerson } from '../../../../utils/familyLogic';
import { useGallery } from '../useGallery';

const {
  deferPersonMediaObjectCleanupMock,
  deleteGalleryItemMock,
  removePersonMediaObjectOrEnqueueMock,
  showErrorMock,
  updatePersonMock,
  uploadToGalleryMock,
} = vi.hoisted(() => ({
  deferPersonMediaObjectCleanupMock: vi.fn(),
  deleteGalleryItemMock: vi.fn(),
  removePersonMediaObjectOrEnqueueMock: vi.fn(),
  showErrorMock: vi.fn(),
  updatePersonMock: vi.fn(),
  uploadToGalleryMock: vi.fn(),
}));

vi.mock('../../services/supabaseGalleryService', () => ({
  SupabaseGalleryService: {
    deleteGalleryItem: deleteGalleryItemMock,
    uploadToGallery: uploadToGalleryMock,
  },
}));

vi.mock('../../../../hooks/tree/useTreeActions', () => ({
  useTreeActions: () => ({ updatePerson: updatePersonMock }),
}));

vi.mock('../../../../services/personMediaCleanupQueue', () => ({
  deferPersonMediaObjectCleanup: deferPersonMediaObjectCleanupMock,
  removePersonMediaObjectOrEnqueue: removePersonMediaObjectOrEnqueueMock,
}));

vi.mock('../../../../utils/showToast', () => ({
  showToast: {
    error: showErrorMock,
    success: vi.fn(),
  },
}));

describe('useGallery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    uploadToGalleryMock.mockResolvedValue({
      id: 'gallery-1',
      asset: {
        schemaVersion: 1,
        provider: 'supabase-private',
        bucket: 'person-media',
        assetId: '123e4567-e89b-42d3-a456-426614174000',
        kind: 'gallery-photo',
        objectPath: 'tree-1/gallery-photo/123e4567-e89b-42d3-a456-426614174000.webp',
        mimeType: 'image/webp',
        byteLength: 128,
        version: 1,
        createdAt: '2026-09-04T00:00:00.000Z',
      },
      version: 1,
      createdAt: '2026-09-04T00:00:00.000Z',
    });
    deleteGalleryItemMock.mockResolvedValue(undefined);
    removePersonMediaObjectOrEnqueueMock.mockResolvedValue(undefined);
    deferPersonMediaObjectCleanupMock.mockResolvedValue(undefined);
    updatePersonMock.mockResolvedValue({ success: true });
    useAppStore.setState({
      currentTreeId: 'tree-1',
      currentUserRole: 'viewer',
      people: {
        'person-1': {
          ...createPerson(),
          id: 'person-1',
          gallery: [{
            id: 'gallery-1',
            path: 'tree-1/person-1/gallery-1.webp',
            version: 1,
            createdAt: '2026-09-04T00:00:00.000Z',
          }],
        },
      },
      user: {
        uid: 'user-1',
        displayName: 'Viewer',
        email: 'viewer@example.test',
        photoURL: '',
        supabaseToken: 'session-token',
      },
    });
  });

  it.each(['viewer', null] as const)(
    'rejects gallery uploads for a cloud %s role before storage is called',
    async (role) => {
      useAppStore.setState({ currentUserRole: role });
      const { result } = renderHook(() => useGallery());

      await act(async () => {
        await result.current.addPhoto(new File(['image'], 'photo.webp', {
          type: 'image/webp',
        }), 'person-1');
      });

      expect(uploadToGalleryMock).not.toHaveBeenCalled();
      expect(updatePersonMock).not.toHaveBeenCalled();
      expect(showErrorMock).toHaveBeenCalledWith('readOnly');
    }
  );

  it('rejects gallery deletion for a viewer before storage is called', async () => {
    const { result } = renderHook(() => useGallery());

    await act(async () => {
      await result.current.removePhoto('person-1', 'gallery-1');
    });

    expect(deleteGalleryItemMock).not.toHaveBeenCalled();
    expect(removePersonMediaObjectOrEnqueueMock).not.toHaveBeenCalled();
    expect(deferPersonMediaObjectCleanupMock).not.toHaveBeenCalled();
    expect(updatePersonMock).not.toHaveBeenCalled();
    expect(showErrorMock).toHaveBeenCalledWith('readOnly');
  });

  it('rejects unsupported image formats before invoking the upload service', async () => {
    useAppStore.setState({ currentUserRole: 'editor' });
    const { result } = renderHook(() => useGallery());

    await act(async () => {
      await result.current.addPhoto(new File(['image'], 'photo.svg', {
        type: 'image/svg+xml',
      }), 'person-1');
    });

    expect(uploadToGalleryMock).not.toHaveBeenCalled();
    expect(updatePersonMock).not.toHaveBeenCalled();
    expect(showErrorMock).toHaveBeenCalledWith('galleryPhotoUploadError');
  });

  it('allows an editor to upload and attach a gallery photo', async () => {
    useAppStore.setState({ currentUserRole: 'editor' });
    const { result } = renderHook(() => useGallery());

    await act(async () => {
      await result.current.addPhoto(new File(['image'], 'photo.webp', {
        type: 'image/webp',
      }), 'person-1');
    });

    expect(uploadToGalleryMock).toHaveBeenCalledOnce();
    expect(updatePersonMock).toHaveBeenCalledWith('person-1', {
      gallery: [
        expect.objectContaining({ id: 'gallery-1' }),
        expect.objectContaining({ id: 'gallery-1' }),
      ],
    });
  });

  it('removes a newly uploaded object if attaching it to the person fails', async () => {
    useAppStore.setState({ currentUserRole: 'editor' });
    updatePersonMock.mockResolvedValueOnce({ success: false, error: 'Role revoked.' });
    const { result } = renderHook(() => useGallery());

    await act(async () => {
      await result.current.addPhoto(new File(['image'], 'photo.webp', {
        type: 'image/webp',
      }), 'person-1');
    });

    expect(removePersonMediaObjectOrEnqueueMock).toHaveBeenCalledWith(
      expect.objectContaining({ treeId: 'tree-1', userId: 'user-1' }),
      expect.objectContaining({
        bucket: 'person-media',
        objectPath: 'tree-1/gallery-photo/123e4567-e89b-42d3-a456-426614174000.webp',
      })
    );
    expect(showErrorMock).toHaveBeenCalledWith('galleryPhotoUploadError');
  });

  it('removes a newly uploaded object if attaching it to the person throws', async () => {
    useAppStore.setState({ currentUserRole: 'editor' });
    updatePersonMock.mockRejectedValueOnce(new Error('sync unavailable'));
    const { result } = renderHook(() => useGallery());

    await act(async () => {
      await result.current.addPhoto(new File(['image'], 'photo.webp', {
        type: 'image/webp',
      }), 'person-1');
    });

    expect(removePersonMediaObjectOrEnqueueMock).toHaveBeenCalledOnce();
    expect(showErrorMock).toHaveBeenCalledWith('galleryPhotoUploadError');
  });

  it('cleans up the upload instead of attaching it after the active tree changes', async () => {
    useAppStore.setState({ currentUserRole: 'editor' });
    uploadToGalleryMock.mockImplementationOnce(async () => {
      useAppStore.setState({
        currentTreeId: 'tree-2',
        currentUserRole: 'owner',
      });
      return {
        id: 'gallery-2',
        asset: {
          schemaVersion: 1,
          provider: 'supabase-private',
          bucket: 'person-media',
          assetId: '223e4567-e89b-42d3-a456-426614174000',
          kind: 'gallery-photo',
          objectPath: 'tree-1/gallery-photo/223e4567-e89b-42d3-a456-426614174000.webp',
          mimeType: 'image/webp',
          byteLength: 128,
          version: 1,
          createdAt: '2026-09-04T00:00:00.000Z',
        },
        version: 1,
        createdAt: '2026-09-04T00:00:00.000Z',
      };
    });
    const { result } = renderHook(() => useGallery());

    await act(async () => {
      await result.current.addPhoto(new File(['image'], 'photo.webp', {
        type: 'image/webp',
      }), 'person-1');
    });

    expect(updatePersonMock).not.toHaveBeenCalled();
    expect(removePersonMediaObjectOrEnqueueMock).toHaveBeenCalledWith(
      expect.objectContaining({ treeId: 'tree-1', token: 'session-token' }),
      expect.objectContaining({
        objectPath: 'tree-1/gallery-photo/223e4567-e89b-42d3-a456-426614174000.webp',
      })
    );
  });

  it('updates the person before deleting the underlying gallery object', async () => {
    useAppStore.setState({ currentUserRole: 'editor' });
    const callOrder: string[] = [];
    updatePersonMock.mockImplementationOnce(async () => {
      callOrder.push('record');
      return { success: true };
    });
    deferPersonMediaObjectCleanupMock.mockImplementationOnce(async () => {
      callOrder.push('storage');
    });
    const { result } = renderHook(() => useGallery());

    await act(async () => {
      await result.current.removePhoto('person-1', 'gallery-1');
    });

    expect(callOrder).toEqual(['record', 'storage']);
  });
});
