import type { StudioPosterSvgResources } from './studioPosterSvgRenderer';
import type { PosterFontFamily } from './posterSceneTypes';

const DEFAULT_MAX_FONT_BYTES = 2 * 1024 * 1024;
const DEFAULT_ARABIC_FONT_PATHS: Record<PosterFontFamily, string> = {
  amiri: '/fonts/Amiri-Regular.ttf',
  'noto-sans-arabic': '/fonts/NotoSansArabic-Variable.ttf',
  'noto-kufi-arabic': '/fonts/NotoKufiArabic-Variable.ttf',
};

export interface PosterFontAsset {
  readonly id: PosterFontFamily;
  readonly familyName: 'JozorPosterArabic';
  readonly format: 'truetype';
  readonly dataUri: string;
  readonly byteLength: number;
  readonly source: 'bundled';
}

export interface PosterFontAssetResolver {
  readonly resolveArabicFont: (fontFamily?: PosterFontFamily) => Promise<PosterFontAsset>;
}

export interface PosterFontAssetResolverOptions {
  readonly assetPath?: string;
  readonly assetPaths?: Partial<Record<PosterFontFamily, string>>;
  readonly maxBytes?: number;
  readonly loadBytes?: (assetPath: string) => Promise<Uint8Array>;
}

function assertBundledAssetPath(assetPath: string): void {
  if (!assetPath.startsWith('/') || assetPath.startsWith('//') || assetPath.includes('..') || assetPath.includes('\\')) {
    throw new Error('Poster Arabic font path must reference a bundled application asset');
  }
}

function assertTrueTypeFont(bytes: Uint8Array, maxBytes: number): void {
  if (bytes.byteLength === 0) {
    throw new Error('Poster Arabic font asset is empty');
  }
  if (bytes.byteLength > maxBytes) {
    throw new Error('Poster Arabic font asset exceeds the configured size limit');
  }

  const isTrueType = bytes.byteLength >= 4
    && bytes[0] === 0x00
    && bytes[1] === 0x01
    && bytes[2] === 0x00
    && bytes[3] === 0x00;
  if (!isTrueType) {
    throw new Error('Poster Arabic font asset is not a valid TrueType font');
  }
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

async function loadBundledFontBytes(assetPath: string): Promise<Uint8Array> {
  if (typeof window === 'undefined' || typeof fetch === 'undefined') {
    throw new Error('Poster Arabic font resolver requires a browser runtime');
  }

  const assetUrl = new URL(assetPath, window.location.origin);
  if (assetUrl.origin !== window.location.origin) {
    throw new Error('Poster Arabic font must be loaded from the application origin');
  }

  const response = await fetch(assetUrl.href, {
    credentials: 'same-origin',
    cache: 'force-cache',
  });
  if (!response.ok) {
    throw new Error(`Poster Arabic font could not be loaded (${response.status})`);
  }

  return new Uint8Array(await response.arrayBuffer());
}

export function createPosterFontAssetResolver(
  options: PosterFontAssetResolverOptions = {}
): PosterFontAssetResolver {
  const assetPaths: Record<PosterFontFamily, string> = {
    ...DEFAULT_ARABIC_FONT_PATHS,
    ...options.assetPaths,
  };
  if (options.assetPath) assetPaths.amiri = options.assetPath;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_FONT_BYTES;
  const loadBytes = options.loadBytes ?? loadBundledFontBytes;
  Object.values(assetPaths).forEach(assertBundledAssetPath);
  const cachedAssets = new Map<PosterFontFamily, Promise<PosterFontAsset>>();

  return {
    resolveArabicFont: (fontFamily = 'amiri') => {
      const cachedAsset = cachedAssets.get(fontFamily);
      if (cachedAsset) return cachedAsset;
      const assetPath = assetPaths[fontFamily];
      const pendingAsset: Promise<PosterFontAsset> = loadBytes(assetPath).then((bytes) => {
        assertTrueTypeFont(bytes, maxBytes);
        return {
          id: fontFamily,
          familyName: 'JozorPosterArabic' as const,
          format: 'truetype' as const,
          dataUri: `data:font/ttf;base64,${encodeBase64(bytes)}`,
          byteLength: bytes.byteLength,
          source: 'bundled' as const,
        };
      });
      cachedAssets.set(fontFamily, pendingAsset);
      return pendingAsset;
    },
  };
}

export function getPosterSvgFontResources(asset: PosterFontAsset): StudioPosterSvgResources {
  return {
    embeddedArabicFontDataUri: asset.dataUri,
    embeddedArabicFontFormat: asset.format,
    embeddedArabicFontFamily: asset.id,
  };
}

export const defaultPosterFontAssetResolver = createPosterFontAssetResolver();
