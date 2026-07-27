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
  const isJpeg = bytes.length >= 3
    && bytes[0] === 0xff
    && bytes[1] === 0xd8
    && bytes[2] === 0xff;
  if (isJpeg) return 'image/jpeg';

  const isPng = bytes.length >= 8
    && bytes[0] === 0x89
    && bytes[1] === 0x50
    && bytes[2] === 0x4e
    && bytes[3] === 0x47
    && bytes[4] === 0x0d
    && bytes[5] === 0x0a
    && bytes[6] === 0x1a
    && bytes[7] === 0x0a;
  if (isPng) return 'image/png';

  const isWebp = bytes.length >= 12
    && String.fromCharCode(...bytes.subarray(0, 4)) === 'RIFF'
    && String.fromCharCode(...bytes.subarray(8, 12)) === 'WEBP';
  if (isWebp) return 'image/webp';

  throw new Error('Poster image payload is not a supported JPEG, PNG, or WebP image');
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

  const resolveSource = (source: string): Promise<Omit<PosterImageAsset, 'previewId'>> => {
    const cached = sourceCache.get(source);
    if (cached) return cached;

    const pending = loadBytes(source).then((bytes) => {
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
    });
    sourceCache.set(source, pending);
    return pending;
  };

  return {
    async resolveImages(requests) {
      if (requests.length > maxImageCount) {
        throw new Error('Poster image request exceeds the configured image count limit');
      }

      const assets: Record<string, PosterImageAsset> = {};
      const failedPreviewIds: string[] = [];
      await Promise.all(requests.map(async (request) => {
        assertPreviewId(request.previewId);
        try {
          assertPrivateSource(request.source);
          const resolved = await resolveSource(request.source);
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
