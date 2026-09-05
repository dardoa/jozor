import {
  loadPersonMediaPosterSourceBytes,
  parsePersonMediaPosterSource,
} from '../../../services/personMediaAssetService';
import { detectPersonMediaImageMimeType } from '../../../types';

const DEFAULT_MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const DEFAULT_MAX_IMAGE_COUNT = 31;

export type PosterImageMimeType = 'image/jpeg' | 'image/png' | 'image/webp';

export interface PosterImageAssetRequest {
  readonly previewId: string;
  /** Private resolver input. It must never be copied into PosterScene or output markup. */
  readonly source: string;
}

export interface PosterImageAsset {
  readonly previewId: string;
  readonly mimeType: PosterImageMimeType;
  readonly dataUri: string;
  readonly byteLength: number;
}

export interface PosterImageAssetResolution {
  readonly assets: Readonly<Record<string, PosterImageAsset>>;
  readonly failedPreviewIds: readonly string[];
}

export interface PosterImageAssetResolver {
  readonly resolveImages: (
    requests: readonly PosterImageAssetRequest[]
  ) => Promise<PosterImageAssetResolution>;
}

export interface PosterImageAssetResolverOptions {
  readonly maxBytesPerImage?: number;
  readonly maxImageCount?: number;
  readonly loadBytes?: (source: string) => Promise<Uint8Array>;
}

function assertPreviewId(previewId: string): void {
  if (!/^preview-node-\d+$/.test(previewId)) {
    throw new Error('Poster image assets require session-isolated preview IDs');
  }
}

function assertPrivateSource(source: string): void {
  if (!source.trim()) throw new Error('Poster image source is empty');

  if (parsePersonMediaPosterSource(source)) return;
  if (source.startsWith('person-media:')) {
    throw new Error('Poster image private media source is invalid');
  }

  const url = new URL(source, typeof window === 'undefined' ? 'https://local.invalid' : window.location.origin);
  const isSecureRemote = url.protocol === 'https:';
  const isSameOriginHttp = url.protocol === 'http:'
    && typeof window !== 'undefined'
    && url.origin === window.location.origin;
  const isEmbedded = url.protocol === 'data:' && /^data:image\/(?:jpeg|png|webp);base64,/i.test(source);
  const isLocalBlob = url.protocol === 'blob:' && typeof window !== 'undefined';

  if (!isSecureRemote && !isSameOriginHttp && !isEmbedded && !isLocalBlob) {
    throw new Error('Poster image source protocol is not allowed');
  }
}

function detectImageMimeType(bytes: Uint8Array): PosterImageMimeType {
  const mimeType = detectPersonMediaImageMimeType(bytes);
  if (!mimeType) {
    throw new Error('Poster image payload is not a supported JPEG, PNG, or WebP image');
  }
  return mimeType;
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

async function loadImageBytes(source: string): Promise<Uint8Array> {
  if (source.startsWith('person-media:')) {
    return loadPersonMediaPosterSourceBytes(source);
  }
  if (typeof fetch === 'undefined') {
    throw new Error('Poster image resolver requires fetch support');
  }
  const response = await fetch(source, {
    credentials: 'omit',
    cache: 'force-cache',
    referrerPolicy: 'no-referrer',
  });
  if (!response.ok) throw new Error(`Poster image could not be loaded (${response.status})`);
  return new Uint8Array(await response.arrayBuffer());
}

export function createPosterImageAssetResolver(
  options: PosterImageAssetResolverOptions = {}
): PosterImageAssetResolver {
  const maxBytesPerImage = options.maxBytesPerImage ?? DEFAULT_MAX_IMAGE_BYTES;
  const maxImageCount = options.maxImageCount ?? DEFAULT_MAX_IMAGE_COUNT;
  const loadBytes = options.loadBytes ?? loadImageBytes;
  const sourceCache = new Map<string, Promise<Omit<PosterImageAsset, 'previewId'>>>();

  const resolveSource = (
    source: string,
    cache: Map<string, Promise<Omit<PosterImageAsset, 'previewId'>>>
  ): Promise<Omit<PosterImageAsset, 'previewId'>> => {
    const cached = cache.get(source);
    if (cached) return cached;

    const pending = loadBytes(source)
      .then((bytes) => {
        if (bytes.byteLength === 0) throw new Error('Poster image payload is empty');
        if (bytes.byteLength > maxBytesPerImage) {
          throw new Error('Poster image payload exceeds the configured size limit');
        }
        const mimeType = detectImageMimeType(bytes);
        return {
          mimeType,
          dataUri: `data:${mimeType};base64,${encodeBase64(bytes)}`,
          byteLength: bytes.byteLength,
        };
      })
      .catch((error) => {
        cache.delete(source);
        throw error;
      });
    cache.set(source, pending);
    return pending;
  };

  return {
    async resolveImages(requests) {
      if (requests.length > maxImageCount) {
        throw new Error('Poster image request exceeds the configured image count limit');
      }

      const assets: Record<string, PosterImageAsset> = {};
      const failedPreviewIds: string[] = [];
      // Private bytes are deduplicated only within this resolution. Keeping them
      // in the resolver-wide cache could reuse owner media after an auth change.
      const privateSourceCache = new Map<
        string,
        Promise<Omit<PosterImageAsset, 'previewId'>>
      >();
      await Promise.all(requests.map(async (request) => {
        assertPreviewId(request.previewId);
        try {
          assertPrivateSource(request.source);
          const cache = request.source.startsWith('person-media:')
            ? privateSourceCache
            : sourceCache;
          const resolved = await resolveSource(request.source, cache);
          assets[request.previewId] = { previewId: request.previewId, ...resolved };
        } catch {
          failedPreviewIds.push(request.previewId);
        }
      }));

      return { assets, failedPreviewIds };
    },
  };
}

export const defaultPosterImageAssetResolver = createPosterImageAssetResolver();
