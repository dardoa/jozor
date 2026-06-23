import { logError } from '../utils/errorLogger';

export interface CacheEntry {
  objectUrl: string;
  refCount: number;
  blob: Blob;
}

const CACHE_NAME = 'jozor-image-cache';
const objectUrlMap = new Map<string, CacheEntry>();

/**
 * Checks if the browser's Cache API is supported in the current environment.
 */
export function isCacheSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.caches !== 'undefined';
}

/**
 * Rounds a dimension to the nearest standard step to maximize cache hits.
 * Standard buckets: 64, 128, 256, 512.
 */
export function getStandardDimension(dim: number): number {
  if (dim <= 64) return 64;
  if (dim <= 128) return 128;
  if (dim <= 256) return 256;
  return 512;
}

/**
 * Extracts the base URL (without query parameters) to safely compare versions.
 */
export function getBaseUrl(url: string): string {
  try {
    const parsed = new URL(url, typeof window !== 'undefined' ? window.location.href : undefined);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    // If not a valid URL, split by '?' as a fallback
    return url.split('?')[0];
  }
}

function getVersionedSourceUrl(url: string): string {
  try {
    const parsed = new URL(url, typeof window !== 'undefined' ? window.location.href : undefined);
    parsed.searchParams.delete('jozor_w');
    parsed.searchParams.delete('jozor_h');
    parsed.searchParams.delete('jozor_fmt');
    return `${parsed.origin}${parsed.pathname}${parsed.search}`;
  } catch {
    const [base, query = ''] = url.split('?');
    const params = new URLSearchParams(query);
    params.delete('jozor_w');
    params.delete('jozor_h');
    params.delete('jozor_fmt');
    const normalizedQuery = params.toString();
    return normalizedQuery ? `${base}?${normalizedQuery}` : base;
  }
}

function buildCacheKey(
  url: string,
  width?: number,
  height?: number,
  format?: string
): string {
  if (width === undefined || height === undefined) return url;

  const wBucket = getStandardDimension(width);
  const hBucket = getStandardDimension(height);
  const separator = url.includes('?') ? '&' : '?';
  const formatParam = format ? `&jozor_fmt=${encodeURIComponent(format)}` : '';
  return `${url}${separator}jozor_w=${wBucket}&jozor_h=${hBucket}${formatParam}`;
}

/**
 * Cleans up stale versions of the same image (sharing the same base URL) from the cache.
 */
async function cleanStaleVersions(cache: Cache, url: string): Promise<void> {
  if (!isCacheSupported()) return;

  try {
    const targetBase = getBaseUrl(url);
    const targetVersionedSource = getVersionedSourceUrl(url);
    const keys = await cache.keys();
    for (const request of keys) {
      if (
        getBaseUrl(request.url) === targetBase &&
        getVersionedSourceUrl(request.url) !== targetVersionedSource
      ) {
        await cache.delete(request);
      }
    }
  } catch (error) {
    logError('IMAGE_CACHE_CLEANUP_FAILED', error, { showToast: false });
  }
}

/**
 * Resizes a Blob client-side using Canvas/OffscreenCanvas and encodes as WebP/target format.
 * Falls back to the original Blob if canvas resizing fails.
 */
export async function resizeImageBlob(
  blob: Blob,
  width: number,
  height: number,
  format = 'image/webp'
): Promise<Blob> {
  if (typeof window === 'undefined') return blob;

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(blob);
    img.src = objectUrl;

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      try {
        let canvas: HTMLCanvasElement | OffscreenCanvas;
        let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;

        if (typeof OffscreenCanvas !== 'undefined') {
          canvas = new OffscreenCanvas(width, height);
          ctx = canvas.getContext('2d');
        } else {
          canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          ctx = canvas.getContext('2d');
        }

        if (!ctx) {
          resolve(blob);
          return;
        }

        // Draw image stretched/fitted to target dimensions
        ctx.drawImage(img, 0, 0, width, height);

        if (canvas instanceof OffscreenCanvas) {
          canvas.convertToBlob({ type: format, quality: 0.8 })
            .then(resolve)
            .catch(() => resolve(blob));
        } else {
          canvas.toBlob(
            (resizedBlob) => {
              if (resizedBlob) {
                resolve(resizedBlob);
              } else {
                resolve(blob);
              }
            },
            format,
            0.8
          );
        }
      } catch (err) {
        logError('IMAGE_RESIZE_FAILED', err, { showToast: false });
        resolve(blob); // fallback to original blob
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(blob); // fallback to original blob
    };
  });
}

export const imageCacheService = {
  /**
   * Fetches an image, processes it (resize/compress), and caches it.
   */
  async fetchAndCache(
    url: string,
    width?: number,
    height?: number,
    format = 'image/webp'
  ): Promise<Blob> {
    if (!isCacheSupported()) {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
      return response.blob();
    }

    const cache = await caches.open(CACHE_NAME);
    
    const cacheKey = buildCacheKey(url, width, height, format);

    // Check if cache matches
    const cachedResponse = await cache.match(cacheKey);
    if (cachedResponse) {
      return cachedResponse.blob();
    }

    // Fetch original image
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
    const originalBlob = await response.blob();

    // Clean stale versions first
    await cleanStaleVersions(cache, url);

    let finalBlob = originalBlob;
    if (width !== undefined && height !== undefined) {
      const wBucket = getStandardDimension(width);
      const hBucket = getStandardDimension(height);
      finalBlob = await resizeImageBlob(originalBlob, wBucket, hBucket, format);
    }

    try {
      // Put in Cache API
      const cachedHeaders = new Headers();
      cachedHeaders.set('Content-Type', finalBlob.type);
      cachedHeaders.set('Cache-Control', 'public, max-age=31536000');

      const cacheResponse = new Response(finalBlob, {
        status: 200,
        statusText: 'OK',
        headers: cachedHeaders,
      });

      await cache.put(cacheKey, cacheResponse);
    } catch (err) {
      logError('IMAGE_CACHE_WRITE_FAILED', err, { showToast: false });
    }

    return finalBlob;
  },

  /**
   * Returns a reference-counted Object URL.
   * Increments the reference count.
   */
  async getObjectUrl(
    url: string,
    options?: { width?: number; height?: number; format?: string }
  ): Promise<string> {
    const cacheKey = buildCacheKey(url, options?.width, options?.height, options?.format);

    const existing = objectUrlMap.get(cacheKey);
    if (existing) {
      existing.refCount += 1;
      return existing.objectUrl;
    }

    const blob = await this.fetchAndCache(url, options?.width, options?.height, options?.format);
    const objectUrl = URL.createObjectURL(blob);

    objectUrlMap.set(cacheKey, {
      objectUrl,
      refCount: 1,
      blob,
    });

    return objectUrl;
  },

  /**
   * Releases a reference-counted Object URL.
   * Decrements the reference count, and revokes if it reaches 0.
   */
  releaseObjectUrl(
    url: string,
    options?: { width?: number; height?: number; format?: string }
  ): void {
    const cacheKey = buildCacheKey(url, options?.width, options?.height, options?.format);

    const existing = objectUrlMap.get(cacheKey);
    if (existing) {
      existing.refCount -= 1;
      if (existing.refCount <= 0) {
        URL.revokeObjectURL(existing.objectUrl);
        objectUrlMap.delete(cacheKey);
      }
    }
  },

  /**
   * Preloads a batch of images into the local Cache API.
   */
  async preloadImages(
    urls: string[],
    options?: { width?: number; height?: number; format?: string }
  ): Promise<void> {
    const promises = urls.map((url) =>
      this.fetchAndCache(url, options?.width, options?.height, options?.format).catch((err) => {
        logError('IMAGE_PRELOAD_FAILED', err, { showToast: false, metadata: { url } });
      })
    );
    await Promise.all(promises);
  },

  /**
   * Clears all cached images and active Object URLs.
   */
  async clearCache(): Promise<void> {
    // Revoke all memory object URLs
    for (const entry of objectUrlMap.values()) {
      URL.revokeObjectURL(entry.objectUrl);
    }
    objectUrlMap.clear();

    if (isCacheSupported()) {
      try {
        await caches.delete(CACHE_NAME);
      } catch (err) {
        logError('IMAGE_CACHE_DELETE_FAILED', err, { showToast: false });
      }
    }
  },

  /**
   * Exposed registry check for testing.
   */
  _getRegistry(): Map<string, CacheEntry> {
    return objectUrlMap;
  },
};
