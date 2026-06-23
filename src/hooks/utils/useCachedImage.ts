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
  const [cachedUrl, setCachedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const width = options?.width;
  const height = options?.height;
  const format = options?.format;

  useEffect(() => {
    if (!url) {
      setCachedUrl(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    let hasAcquiredObjectUrl = false;

    const loadCachedImage = async () => {
      setIsLoading(true);
      try {
        const objectUrl = await imageCacheService.getObjectUrl(url, { width, height, format });
        if (!isMounted) {
          imageCacheService.releaseObjectUrl(url, { width, height, format });
          return;
        }
        hasAcquiredObjectUrl = true;
        if (isMounted) {
          setCachedUrl(objectUrl);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
          // Immediate fallback to original url on fetch/processing failure
          setCachedUrl(url);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
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
  }, [url, width, height, format]);

  return { cachedUrl, isLoading, error };
}
