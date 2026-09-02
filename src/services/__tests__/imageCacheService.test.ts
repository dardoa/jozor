import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  imageCacheService,
  getStandardDimension,
  getBaseUrl,
  isCacheSupported,
  resizeImageBlob,
} from '../imageCacheService';

describe('ImageCacheService', () => {
  const dummyBlob = new Blob(['image-data'], { type: 'image/jpeg' });
  const mockObjectUrl = 'blob:http://localhost/mock-uuid-1234';

  const mockCache = {
    match: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    keys: vi.fn(),
  };

  const mockCaches = {
    open: vi.fn(),
    delete: vi.fn(),
  };

  beforeEach(() => {
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => mockObjectUrl),
      revokeObjectURL: vi.fn(),
    });

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      statusText: 'OK',
      blob: () => Promise.resolve(dummyBlob),
    }));

    // Mock Image loader for jsdom
    class MockImage {
      onload: (() => void) | null = null;
      onerror: ((err: unknown) => void) | null = null;
      width = 100;
      height = 100;
      _src = '';
      set src(val: string) {
        this._src = val;
        setTimeout(() => {
          if (this.onload) this.onload();
        }, 0);
      }
      get src() {
        return this._src;
      }
    }
    vi.stubGlobal('Image', MockImage);

    // Mock Canvas toBlob for jsdom
    if (typeof HTMLCanvasElement !== 'undefined') {
      HTMLCanvasElement.prototype.toBlob = function (
        callback: (blob: Blob | null) => void,
        type?: string,
        _quality?: number
      ) {
        setTimeout(() => {
          callback(new Blob(['resized-data'], { type: type || 'image/webp' }));
        }, 0);
      };
    }

    // Mock caches
    mockCache.match.mockReset();
    mockCache.put.mockReset();
    mockCache.delete.mockReset();
    mockCache.keys.mockResolvedValue([]);
    mockCaches.open.mockReset();
    mockCaches.open.mockResolvedValue(mockCache);

    vi.stubGlobal('caches', mockCaches);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    // Clear registry between tests to prevent leaks
    imageCacheService.clearCache();
  });

  describe('Utility Functions', () => {
    it('checks Cache API support', () => {
      expect(isCacheSupported()).toBe(true);
    });

    it('correctly buckets dimensions to standard sizes', () => {
      expect(getStandardDimension(48)).toBe(64);
      expect(getStandardDimension(100)).toBe(128);
      expect(getStandardDimension(200)).toBe(256);
      expect(getStandardDimension(450)).toBe(512);
    });

    it('extracts base URL without query parameters', () => {
      expect(getBaseUrl('https://example.com/avatar.jpg?v=1&t=2')).toBe('https://example.com/avatar.jpg');
      expect(getBaseUrl('https://example.com/avatar.jpg')).toBe('https://example.com/avatar.jpg');
      expect(getBaseUrl('avatar.jpg?v=3')).toBe('avatar.jpg');
    });
  });

  describe('Caching & Fetching', () => {
    it('fetches remote image and puts it in Cache API when missing', async () => {
      mockCache.match.mockResolvedValue(undefined);

      const blob = await imageCacheService.fetchAndCache('https://example.com/pic.jpg');

      expect(global.fetch).toHaveBeenCalledWith('https://example.com/pic.jpg');
      expect(mockCache.put).toHaveBeenCalled();
      expect(blob).toBe(dummyBlob);
    });

    it('does not write non-http URLs to Cache API', async () => {
      const blob = await imageCacheService.fetchAndCache('data:image/png;base64,AAAA');

      expect(global.fetch).toHaveBeenCalledWith('data:image/png;base64,AAAA');
      expect(mockCaches.open).not.toHaveBeenCalled();
      expect(mockCache.put).not.toHaveBeenCalled();
      expect(blob).toBe(dummyBlob);
    });

    it('passes optional request init to fetch when supplied', async () => {
      mockCache.match.mockResolvedValue(undefined);

      await imageCacheService.fetchAndCache(
        'https://example.com/private.jpg',
        undefined,
        undefined,
        'image/webp',
        { headers: { Authorization: 'Bearer token-123' }, mode: 'cors' }
      );

      expect(global.fetch).toHaveBeenCalledWith('https://example.com/private.jpg', {
        headers: { Authorization: 'Bearer token-123' },
        mode: 'cors',
      });
    });

    it('returns cached image Blob immediately if match exists in Cache API', async () => {
      const cachedBlob = new Blob(['cached-data'], { type: 'image/webp' });
      mockCache.match.mockResolvedValue({
        blob: () => Promise.resolve(cachedBlob),
      });

      const blob = await imageCacheService.fetchAndCache('https://example.com/pic.jpg');

      expect(global.fetch).not.toHaveBeenCalled();
      expect(blob).toBe(cachedBlob);
    });

    it('cleans stale versions of the same image based on base URL matching', async () => {
      mockCache.match.mockResolvedValue(undefined);
      
      const staleRequest1 = { url: 'https://example.com/pic.jpg?v=1' };
      const staleRequest2 = { url: 'https://example.com/pic.jpg?v=2' };
      const unrelatedRequest = { url: 'https://example.com/other.jpg?v=3' };
      
      mockCache.keys.mockResolvedValue([staleRequest1, staleRequest2, unrelatedRequest]);

      await imageCacheService.fetchAndCache('https://example.com/pic.jpg?v=3');

      expect(mockCache.delete).toHaveBeenCalledWith(staleRequest1);
      expect(mockCache.delete).toHaveBeenCalledWith(staleRequest2);
      expect(mockCache.delete).not.toHaveBeenCalledWith(unrelatedRequest);
    });

    it('starts all stale cache deletions before awaiting their completion', async () => {
      mockCache.match.mockResolvedValue(undefined);
      const staleRequests = [
        { url: 'https://example.com/pic.jpg?v=1' },
        { url: 'https://example.com/pic.jpg?v=2' },
      ];
      mockCache.keys.mockResolvedValue(staleRequests);

      const deleteResolvers: Array<(value: boolean) => void> = [];
      mockCache.delete.mockImplementation(() => new Promise<boolean>((resolve) => {
        deleteResolvers.push(resolve);
      }));

      const fetchPromise = imageCacheService.fetchAndCache('https://example.com/pic.jpg?v=3');

      await vi.waitFor(() => {
        expect(mockCache.delete).toHaveBeenCalledTimes(2);
      });
      deleteResolvers.forEach((resolve) => resolve(true));
      await fetchPromise;
    });

    it('preserves different dimension buckets for the same image version', async () => {
      mockCache.match.mockResolvedValue(undefined);

      const sameVersionSmall = { url: 'https://example.com/pic.jpg?v=3&jozor_w=128&jozor_h=128' };
      const sameVersionLarge = { url: 'https://example.com/pic.jpg?v=3&jozor_w=256&jozor_h=256' };
      const oldVersion = { url: 'https://example.com/pic.jpg?v=2&jozor_w=128&jozor_h=128' };

      mockCache.keys.mockResolvedValue([sameVersionSmall, sameVersionLarge, oldVersion]);

      await imageCacheService.fetchAndCache('https://example.com/pic.jpg?v=3', 512, 512);

      expect(mockCache.delete).not.toHaveBeenCalledWith(sameVersionSmall);
      expect(mockCache.delete).not.toHaveBeenCalledWith(sameVersionLarge);
      expect(mockCache.delete).toHaveBeenCalledWith(oldVersion);
    });
  });

  describe('Object URL Lifecycle (Reference Counting)', () => {
    it('increments refCount on subsequent requests for the same image URL and shares Object URL', async () => {
      mockCache.match.mockResolvedValue(undefined);

      const url1 = await imageCacheService.getObjectUrl('https://example.com/pic.jpg');
      const registry = imageCacheService._getRegistry();
      const entry = registry.get('https://example.com/pic.jpg');

      expect(url1).toBe(mockObjectUrl);
      expect(entry?.refCount).toBe(1);

      const url2 = await imageCacheService.getObjectUrl('https://example.com/pic.jpg');
      expect(url2).toBe(mockObjectUrl);
      expect(entry?.refCount).toBe(2);
      expect(global.URL.createObjectURL).toHaveBeenCalledTimes(1); // Only created once
    });

    it('decrements refCount on release and revokes Object URL when it hits 0', async () => {
      mockCache.match.mockResolvedValue(undefined);

      await imageCacheService.getObjectUrl('https://example.com/pic.jpg');
      await imageCacheService.getObjectUrl('https://example.com/pic.jpg');
      
      const registry = imageCacheService._getRegistry();
      expect(registry.get('https://example.com/pic.jpg')?.refCount).toBe(2);

      // Release first reference
      imageCacheService.releaseObjectUrl('https://example.com/pic.jpg');
      expect(registry.get('https://example.com/pic.jpg')?.refCount).toBe(1);
      expect(global.URL.revokeObjectURL).not.toHaveBeenCalled();

      // Release second reference (should hit 0)
      imageCacheService.releaseObjectUrl('https://example.com/pic.jpg');
      expect(registry.get('https://example.com/pic.jpg')).toBeUndefined();
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith(mockObjectUrl);
    });
  });

  describe('Fallback Policies', () => {
    it('falls back to memory-only or raw fetch if caches is not supported', async () => {
      vi.stubGlobal('caches', undefined); // Remove caches API support
      expect(isCacheSupported()).toBe(false);

      const blob = await imageCacheService.fetchAndCache('https://example.com/pic.jpg');
      expect(global.fetch).toHaveBeenCalledWith('https://example.com/pic.jpg');
      expect(blob).toBe(dummyBlob);
    });

    it('falls back to original Blob if resizeImageBlob error occurs or dynamic canvas is unavailable', async () => {
      // Simulate resizeImageBlob fallback on invalid environments
      const blob = new Blob(['uncompressed'], { type: 'image/png' });
      const resized = await resizeImageBlob(blob, 100, 100);
      expect(resized).toBe(blob);
    });
  });
});
