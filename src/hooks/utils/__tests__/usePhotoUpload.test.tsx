import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../../../store/useAppStore';
import { createPerson } from '../../../utils/familyLogic';
import { usePhotoUpload } from '../usePhotoUpload';

const {
  deferPersonMediaObjectCleanupMock,
  removePersonMediaObjectOrEnqueueMock,
  updatePersonMock,
  uploadAndCompressImageMock,
} = vi.hoisted(() => ({
  deferPersonMediaObjectCleanupMock: vi.fn(),
  removePersonMediaObjectOrEnqueueMock: vi.fn(),
  updatePersonMock: vi.fn(),
  uploadAndCompressImageMock: vi.fn(),
}));

vi.mock('../../../services/supabaseStorageService', () => ({
  SupabaseStorageService: {
    uploadAndCompressImage: uploadAndCompressImageMock,
  },
}));

vi.mock('../../tree/useTreeActions', () => ({
  useTreeActions: () => ({ updatePerson: updatePersonMock }),
}));

vi.mock('../../../services/personMediaCleanupQueue', () => ({
  deferPersonMediaObjectCleanup: deferPersonMediaObjectCleanupMock,
  removePersonMediaObjectOrEnqueue: removePersonMediaObjectOrEnqueueMock,
}));

vi.mock('../../../utils/showToast', () => ({
  showToast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

const uploadedAsset = {
  schemaVersion: 1 as const,
  provider: 'supabase-private' as const,
  bucket: 'person-media' as const,
  assetId: '123e4567-e89b-42d3-a456-426614174000',
  kind: 'profile-photo' as const,
  objectPath: 'tree-1/profile-photo/123e4567-e89b-42d3-a456-426614174000.webp',
  mimeType: 'image/webp' as const,
  byteLength: 128,
  version: 2,
  createdAt: '2026-09-05T00:00:00.000Z',
};

describe('usePhotoUpload private media lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    uploadAndCompressImageMock.mockResolvedValue({ asset: uploadedAsset, photoVersion: 2 });
    updatePersonMock.mockResolvedValue({ success: true });
    removePersonMediaObjectOrEnqueueMock.mockResolvedValue(undefined);
    deferPersonMediaObjectCleanupMock.mockResolvedValue(undefined);
    useAppStore.setState({
      currentTreeId: 'tree-1',
      currentUserRole: 'owner',
      people: {
        'person-1': {
          ...createPerson(),
          id: 'person-1',
          photoPath: 'tree-1/person-1.webp',
          photoVersion: 1,
        },
      },
      user: {
        uid: 'user-1',
        email: 'owner@example.test',
        displayName: 'Owner',
        photoURL: '',
        supabaseToken: 'session-token',
      },
    });
  });

  it('attaches the private reference before scheduling cleanup of the old object', async () => {
    const order: string[] = [];
    updatePersonMock.mockImplementationOnce(async () => {
      order.push('record');
      return { success: true };
    });
    deferPersonMediaObjectCleanupMock.mockImplementationOnce(async () => {
      order.push('cleanup');
    });
    const { result } = renderHook(() => usePhotoUpload());

    await act(async () => {
      await result.current.handleUpload(
        new File(['image'], 'photo.webp', { type: 'image/webp' }),
        'person-1'
      );
    });

    expect(updatePersonMock).toHaveBeenCalledWith('person-1', {
      photoAsset: uploadedAsset,
      photoUrl: '',
      photoPath: '',
      photoVersion: 2,
    });
    expect(order).toEqual(['record', 'cleanup']);
  });

  it('does not schedule deletion for a legacy path outside the active tree namespace', async () => {
    useAppStore.setState((state) => ({
      people: {
        ...state.people,
        'person-1': {
          ...state.people['person-1'],
          photoPath: 'another-tree/person-1.webp',
        },
      },
    }));
    const { result } = renderHook(() => usePhotoUpload());

    await act(async () => {
      await result.current.handleUpload(
        new File(['image'], 'photo.webp', { type: 'image/webp' }),
        'person-1'
      );
    });

    expect(updatePersonMock).toHaveBeenCalledOnce();
    expect(deferPersonMediaObjectCleanupMock).not.toHaveBeenCalled();
  });

  it('cleans the newly uploaded object when record attachment fails', async () => {
    updatePersonMock.mockResolvedValueOnce({ success: false, error: 'revoked' });
    const { result } = renderHook(() => usePhotoUpload());

    await act(async () => {
      await result.current.handleUpload(
        new File(['image'], 'photo.webp', { type: 'image/webp' }),
        'person-1'
      );
    });

    expect(removePersonMediaObjectOrEnqueueMock).toHaveBeenCalledTimes(1);
    expect(removePersonMediaObjectOrEnqueueMock).toHaveBeenCalledWith(
      expect.objectContaining({ treeId: 'tree-1', userId: 'user-1' }),
      expect.objectContaining({ objectPath: uploadedAsset.objectPath })
    );
  });

  it('cleans the newly uploaded object when record attachment throws', async () => {
    updatePersonMock.mockRejectedValueOnce(new Error('sync unavailable'));
    const { result } = renderHook(() => usePhotoUpload());

    await act(async () => {
      await result.current.handleUpload(
        new File(['image'], 'photo.webp', { type: 'image/webp' }),
        'person-1'
      );
    });

    expect(removePersonMediaObjectOrEnqueueMock).toHaveBeenCalledOnce();
    expect(removePersonMediaObjectOrEnqueueMock).toHaveBeenCalledWith(
      expect.objectContaining({ treeId: 'tree-1', userId: 'user-1' }),
      expect.objectContaining({ objectPath: uploadedAsset.objectPath })
    );
  });

  it('does not attach an upload after the active tree changes', async () => {
    uploadAndCompressImageMock.mockImplementationOnce(async () => {
      useAppStore.setState({ currentTreeId: 'tree-2', currentUserRole: 'owner' });
      return { asset: uploadedAsset, photoVersion: 2 };
    });
    const { result } = renderHook(() => usePhotoUpload());

    await act(async () => {
      await result.current.handleUpload(
        new File(['image'], 'photo.webp', { type: 'image/webp' }),
        'person-1'
      );
    });

    expect(updatePersonMock).not.toHaveBeenCalled();
    expect(removePersonMediaObjectOrEnqueueMock).toHaveBeenCalledOnce();
  });

  it('clears the record before deleting its backing private object', async () => {
    useAppStore.setState((state) => ({
      people: {
        ...state.people,
        'person-1': { ...state.people['person-1'], photoAsset: uploadedAsset, photoPath: '' },
      },
    }));
    const order: string[] = [];
    updatePersonMock.mockImplementationOnce(async () => {
      order.push('record');
      return { success: true };
    });
    deferPersonMediaObjectCleanupMock.mockImplementationOnce(async () => {
      order.push('cleanup');
    });
    const { result } = renderHook(() => usePhotoUpload());

    await act(async () => {
      await result.current.handleDelete('person-1');
    });

    expect(updatePersonMock).toHaveBeenCalledWith('person-1', {
      photoAsset: null,
      photoUrl: '',
      photoPath: '',
      photoVersion: 0,
    });
    expect(order).toEqual(['record', 'cleanup']);
  });
});
