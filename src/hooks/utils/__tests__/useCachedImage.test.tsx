import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCachedImage } from '../useCachedImage';
import { imageCacheService } from '../../../services/imageCacheService';

vi.mock('../../../services/imageCacheService', () => {
  return {
    imageCacheService: {
      getObjectUrl: vi.fn(),
      releaseObjectUrl: vi.fn(),
    },
  };
});

describe('useCachedImage Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initially returns null and loading state, then resolves to cached Object URL', async () => {
    const mockObjectUrl = 'blob:http://localhost/cached-avatar';
    vi.mocked(imageCacheService.getObjectUrl).mockResolvedValue(mockObjectUrl);

    const { result } = renderHook(() => useCachedImage('https://example.com/avatar.jpg', { width: 100, height: 100 }));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.cachedUrl).toBeNull();
    expect(result.current.error).toBeNull();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.cachedUrl).toBe(mockObjectUrl);
    expect(imageCacheService.getObjectUrl).toHaveBeenCalledWith('https://example.com/avatar.jpg', {
      width: 100,
      height: 100,
      format: undefined,
    });
  });

  it('releases Object URL on unmount', async () => {
    vi.mocked(imageCacheService.getObjectUrl).mockResolvedValue('blob:cached-url');

    const { unmount } = renderHook(() => useCachedImage('https://example.com/avatar.jpg', { width: 100, height: 100 }));

    await waitFor(() => {
      expect(imageCacheService.getObjectUrl).toHaveBeenCalled();
    });

    unmount();

    expect(imageCacheService.releaseObjectUrl).toHaveBeenCalledWith('https://example.com/avatar.jpg', {
      width: 100,
      height: 100,
    });
  });

  it('releases old URL and requests new one when URL changes', async () => {
    vi.mocked(imageCacheService.getObjectUrl).mockResolvedValue('blob:cached-url');

    const { rerender } = renderHook(
      ({ url }) => useCachedImage(url, { width: 100, height: 100 }),
      { initialProps: { url: 'https://example.com/avatar1.jpg' } }
    );

    await waitFor(() => {
      expect(imageCacheService.getObjectUrl).toHaveBeenCalledWith('https://example.com/avatar1.jpg', expect.any(Object));
    });

    rerender({ url: 'https://example.com/avatar2.jpg' });

    expect(imageCacheService.releaseObjectUrl).toHaveBeenCalledWith('https://example.com/avatar1.jpg', {
      width: 100,
      height: 100,
    });

    await waitFor(() => {
      expect(imageCacheService.getObjectUrl).toHaveBeenCalledWith('https://example.com/avatar2.jpg', expect.any(Object));
    });
  });

  it('falls back to the original URL if cache retrieval fails', async () => {
    const errorMsg = 'CORS Blocked';
    vi.mocked(imageCacheService.getObjectUrl).mockRejectedValue(new Error(errorMsg));

    const { result } = renderHook(() => useCachedImage('https://example.com/pic.jpg'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.cachedUrl).toBe('https://example.com/pic.jpg');
    expect(result.current.error?.message).toBe(errorMsg);
  });
});
