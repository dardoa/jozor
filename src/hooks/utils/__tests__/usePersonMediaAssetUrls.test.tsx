import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../../../store/useAppStore';
import { createPersonMediaAssetRef } from '../../../types';

const { acquireObjectUrlMock, clearMock, releaseObjectUrlMock } = vi.hoisted(() => ({
  acquireObjectUrlMock: vi.fn(),
  clearMock: vi.fn(),
  releaseObjectUrlMock: vi.fn(),
}));

vi.mock('../../../services/personMediaAssetService', () => ({
  defaultPersonMediaAssetResolver: {
    acquireObjectUrl: acquireObjectUrlMock,
    releaseObjectUrl: releaseObjectUrlMock,
    clear: clearMock,
  },
}));

import { usePersonMediaAssetUrl } from '../usePersonMediaAssetUrls';

const asset = createPersonMediaAssetRef({
  treeId: 'tree-1',
  assetId: '123e4567-e89b-42d3-a456-426614174000',
  kind: 'profile-photo',
  mimeType: 'image/webp',
  byteLength: 128,
  createdAt: '2026-09-05T00:00:00.000Z',
});

describe('usePersonMediaAssetUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    acquireObjectUrlMock.mockResolvedValue('blob:private-photo');
    useAppStore.setState({
      currentTreeId: 'tree-1',
      currentUserRole: 'viewer',
      user: {
        uid: 'user-1',
        email: 'viewer@example.test',
        displayName: 'Viewer',
        photoURL: '',
        supabaseToken: 'session-token',
      },
    });
  });

  it('resolves to an object URL and releases it on unmount', async () => {
    const descriptor = { personId: 'person-1', asset };
    const { result, unmount } = renderHook(() => usePersonMediaAssetUrl(descriptor));

    await waitFor(() => expect(result.current).toBe('blob:private-photo'));
    expect(acquireObjectUrlMock).toHaveBeenCalledWith(expect.objectContaining({
      treeId: 'tree-1',
      personId: 'person-1',
      role: 'viewer',
      asset,
    }));

    act(() => unmount());
    expect(releaseObjectUrlMock).toHaveBeenCalledOnce();
  });

  it('fails closed while the cloud role is unresolved', async () => {
    useAppStore.setState({ currentUserRole: null });
    const { result } = renderHook(() => usePersonMediaAssetUrl({ personId: 'person-1', asset }));

    expect(result.current).toBeNull();
    expect(acquireObjectUrlMock).not.toHaveBeenCalled();
  });
  it('does not resurrect a released URL after descriptors are masked then restored', async () => {
    const descriptor = { personId: 'person-1', asset };
    const hook = renderHook(({ visible }) => usePersonMediaAssetUrl(visible ? descriptor : null), { initialProps: { visible: true } });
    await waitFor(() => expect(hook.result.current).toBe('blob:private-photo'));
    hook.rerender({ visible: false });
    expect(hook.result.current).toBeNull();
    expect(releaseObjectUrlMock).toHaveBeenCalledOnce();
    let resolve!: (url: string) => void;
    acquireObjectUrlMock.mockReturnValue(new Promise<string>(done => { resolve = done; }));
    hook.rerender({ visible: true });
    expect(hook.result.current).toBeNull();
    await act(async () => { resolve('blob:fresh-photo'); });
    expect(hook.result.current).toBe('blob:fresh-photo');
  });
});
