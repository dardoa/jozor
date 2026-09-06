import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
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
      format: undefined,
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
      format: undefined,
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

  it('releases Object URL if acquisition resolves after unmount', async () => {
    let resolveUrl: (url: string) => void = () => undefined;
    vi.mocked(imageCacheService.getObjectUrl).mockReturnValue(
      new Promise((resolve) => {
        resolveUrl = resolve;
      })
    );

    const { unmount } = renderHook(() => useCachedImage('https://example.com/slow.jpg', { width: 100, height: 100 }));

    unmount();
    resolveUrl('blob:late-cached-url');

    await waitFor(() => {
      expect(imageCacheService.releaseObjectUrl).toHaveBeenCalledWith('https://example.com/slow.jpg', {
        width: 100,
        height: 100,
        format: undefined,
      });
    });
  });

  it('hides the previous blob immediately while the new person image is pending', async () => {
    let resolveNext!: (url: string) => void;
    vi.mocked(imageCacheService.getObjectUrl)
      .mockResolvedValueOnce('blob:first-person')
      .mockReturnValueOnce(new Promise((resolve) => { resolveNext = resolve; }));
    const { result, rerender } = renderHook(({ url }) => useCachedImage(url), {
      initialProps: { url: 'https://example.test/first.jpg' },
    });
    await waitFor(() => expect(result.current.cachedUrl).toBe('blob:first-person'));

    rerender({ url: 'https://example.test/next.jpg' });
    expect(result.current).toEqual({ cachedUrl: null, isLoading: true, error: null });
    await act(async () => { resolveNext('blob:next-person'); });
    expect(result.current.cachedUrl).toBe('blob:next-person');
  });

  it('discards a late previous source and releases its acquired blob', async () => {
    let resolvePrevious!: (url: string) => void;
    vi.mocked(imageCacheService.getObjectUrl)
      .mockReturnValueOnce(new Promise((resolve) => { resolvePrevious = resolve; }))
      .mockResolvedValueOnce('blob:current-person');
    const { result, rerender } = renderHook(({ url }) => useCachedImage(url), {
      initialProps: { url: 'https://example.test/previous.jpg' },
    });
    rerender({ url: 'https://example.test/current.jpg' });
    await waitFor(() => expect(result.current.cachedUrl).toBe('blob:current-person'));
    await act(async () => { resolvePrevious('blob:late-previous-person'); });
    expect(result.current.cachedUrl).toBe('blob:current-person');
    expect(imageCacheService.releaseObjectUrl).toHaveBeenCalledWith(
      'https://example.test/previous.jpg', expect.any(Object)
    );
  });

  it('clears the visible image when its source is removed', async () => {
    vi.mocked(imageCacheService.getObjectUrl).mockResolvedValue('blob:removed-photo');
    const initialProps: { url?: string } = { url: 'https://example.test/photo.jpg' };
    const { result, rerender } = renderHook(({ url }: { url?: string }) => useCachedImage(url), {
      initialProps,
    });
    await waitFor(() => expect(result.current.cachedUrl).toBe('blob:removed-photo'));
    rerender({});
    expect(result.current).toEqual({ cachedUrl: null, isLoading: false, error: null });
    expect(imageCacheService.releaseObjectUrl).toHaveBeenCalledWith(
      'https://example.test/photo.jpg', expect.any(Object)
    );
  });

  it('does not reuse a released blob when returning to an earlier source', async () => {
    vi.mocked(imageCacheService.getObjectUrl)
      .mockResolvedValueOnce('blob:first-acquisition')
      .mockImplementation(() => new Promise(() => undefined));
    const { result, rerender } = renderHook(({ url }) => useCachedImage(url), {
      initialProps: { url: 'https://example.test/first.jpg' },
    });
    await waitFor(() => expect(result.current.cachedUrl).toBe('blob:first-acquisition'));
    rerender({ url: 'https://example.test/other.jpg' });
    rerender({ url: 'https://example.test/first.jpg' });
    expect(result.current).toEqual({ cachedUrl: null, isLoading: true, error: null });
    expect(imageCacheService.getObjectUrl).toHaveBeenCalledTimes(3);
  });
});
