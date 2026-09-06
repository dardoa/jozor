import { useState, useEffect } from 'react';
import { imageCacheService } from '../../services/imageCacheService';

interface UseCachedImageOptions {
  width?: number;
  height?: number;
  format?: string;
}

interface UseCachedImageResult {
  cachedUrl: string | null;
  isLoading: boolean;
  error: Error | null;
}

export function useCachedImage(
  url?: string,
  options?: UseCachedImageOptions
): UseCachedImageResult {
  const width = options?.width;
  const height = options?.height;
  const format = options?.format;
  const key = JSON.stringify([url, width, height, format]);
  const [load, setLoad] = useState<{
    key: string;
    result: { cachedUrl: string; error: Error | null } | null;
  }>({ key, result: null });

  // Reset with the input, before committing a render with another source's blob.
  if (load.key !== key) setLoad({ key, result: null });

  useEffect(() => {
    if (!url) {
      return;
    }

    let isMounted = true;
    let hasAcquiredObjectUrl = false;

    const loadCachedImage = async () => {
      try {
        const objectUrl = await imageCacheService.getObjectUrl(url, { width, height, format });
        if (!isMounted) {
          imageCacheService.releaseObjectUrl(url, { width, height, format });
          return;
        }
        hasAcquiredObjectUrl = true;
        if (isMounted) {
          setLoad({ key, result: { cachedUrl: objectUrl, error: null } });
        }
      } catch (err) {
        if (isMounted) {
          setLoad({
            key,
            result: {
              cachedUrl: url,
              error: err instanceof Error ? err : new Error(String(err)),
            },
          });
        }
      }
    };

    loadCachedImage();

    return () => {
      isMounted = false;
      // Release reference when URL/dimensions/format change, or component unmounts.
      // If the async acquisition resolves after unmount, the load path releases it instead.
      if (hasAcquiredObjectUrl) {
        imageCacheService.releaseObjectUrl(url, { width, height, format });
      }
    };
  }, [url, width, height, format, key]);

  // Never display the previous person's blob while a new source is resolving.
  const current = url && load.key === key ? load.result : null;
  return {
    cachedUrl: current?.cachedUrl ?? null,
    isLoading: Boolean(url && !current),
    error: current?.error ?? null,
  };
}
