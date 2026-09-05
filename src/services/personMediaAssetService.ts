import type { PersonMediaAssetRef } from '../types';
import {
  isPersonMediaAssetForTree,
  isPersonMediaAssetRef,
  PERSON_MEDIA_MAX_IMAGE_BYTES,
} from '../types';
import { readBlobBytes } from '../utils/blobBytes';
import { getSupabaseFull, getSupabaseSessionAccessToken } from './supabaseClient';

export type PersonMediaAccessRole = 'owner' | 'editor' | 'viewer' | null;

export interface PersonMediaAssetRequest {
  readonly treeId: string;
  readonly personId: string;
  readonly userId: string;
  readonly role: PersonMediaAccessRole;
  readonly asset: PersonMediaAssetRef;
}

export interface PersonMediaAssetResolver {
  acquireObjectUrl(request: PersonMediaAssetRequest): Promise<string>;
  releaseObjectUrl(request: PersonMediaAssetRequest): void;
  loadBytes(request: PersonMediaAssetRequest): Promise<Uint8Array>;
  clear(): void;
}

interface CachedObjectUrl {
  readonly promise: Promise<string>;
  objectUrl?: string;
  refCount: number;
}

interface PersonMediaAssetResolverOptions {
  readonly loadBlob?: (request: PersonMediaAssetRequest) => Promise<Blob>;
  readonly createObjectUrl?: (blob: Blob) => string;
  readonly revokeObjectUrl?: (url: string) => void;
}

const POSTER_SOURCE_PREFIX = 'person-media:';
const assertRequest = (request: PersonMediaAssetRequest): void => {
  if (!request.treeId || !request.personId || !request.userId) {
    throw new Error('Private person media requires an authenticated tree context');
  }
  if (!isPersonMediaAssetRef(request.asset) || !isPersonMediaAssetForTree(request.asset, request.treeId)) {
    throw new Error('Private person media reference does not belong to the active tree');
  }
  if (!request.role) {
    throw new Error('Private person media access is unresolved');
  }
};

const validateResolvedBlob = (blob: Blob, asset: PersonMediaAssetRef): Blob => {
  if (blob.size <= 0 || blob.size > PERSON_MEDIA_MAX_IMAGE_BYTES) {
    throw new Error('Private person media payload has an invalid size');
  }
  if (blob.size !== asset.byteLength) {
    throw new Error('Private person media payload size does not match its reference');
  }
  if (blob.type && blob.type !== asset.mimeType) {
    throw new Error('Private person media payload type does not match its reference');
  }
  return blob;
};

const loadDirectStorageBlob = async (request: PersonMediaAssetRequest): Promise<Blob> => {
  const token = await getSupabaseSessionAccessToken();
  if (!token) throw new Error('Private person media requires an active session');

  const client = getSupabaseFull(undefined, undefined, token);
  const { data, error } = await client.storage
    .from(request.asset.bucket)
    .download(request.asset.objectPath);

  if (error || !data) {
    throw new Error('Private person media could not be downloaded');
  }
  return validateResolvedBlob(data, request.asset);
};

export const buildPersonMediaGatewayUrl = (
  request: Pick<PersonMediaAssetRequest, 'treeId' | 'personId' | 'asset'>
): string => {
  const params = new URLSearchParams({
    treeId: request.treeId,
    personId: request.personId,
    assetId: request.asset.assetId,
    kind: request.asset.kind,
  });
  return `/api/person-media?${params.toString()}`;
};

const loadGatewayBlob = async (request: PersonMediaAssetRequest): Promise<Blob> => {
  const token = await getSupabaseSessionAccessToken();
  if (!token) throw new Error('Private person media requires an active session');

  const response = await fetch(buildPersonMediaGatewayUrl(request), {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
    credentials: 'same-origin',
    cache: 'no-store',
    referrerPolicy: 'no-referrer',
  });
  if (!response.ok) {
    throw new Error(`Private person media gateway rejected the request (${response.status})`);
  }
  return validateResolvedBlob(await response.blob(), request.asset);
};

export const loadPersonMediaAssetBlob = async (
  request: PersonMediaAssetRequest
): Promise<Blob> => {
  assertRequest(request);
  return request.role === 'viewer'
    ? loadGatewayBlob(request)
    : loadDirectStorageBlob(request);
};

export const loadPersonMediaAssetBlobForCurrentSession = async (
  asset: PersonMediaAssetRef
): Promise<Blob> => {
  if (!isPersonMediaAssetRef(asset)) throw new Error('Invalid private person media reference');
  const token = await getSupabaseSessionAccessToken();
  if (!token) throw new Error('Private person media requires an active session');
  const client = getSupabaseFull(undefined, undefined, token);
  const { data, error } = await client.storage.from(asset.bucket).download(asset.objectPath);
  if (error || !data) throw new Error('Private person media could not be downloaded');
  return validateResolvedBlob(data, asset);
};

export const loadPersonMediaAssetBlobThroughGateway = async (
  asset: PersonMediaAssetRef,
  personId: string
): Promise<Blob> => {
  if (!isPersonMediaAssetRef(asset)) throw new Error('Invalid private person media reference');
  const treeId = asset.objectPath.split('/')[0] || '';
  const request: PersonMediaAssetRequest = {
    treeId,
    personId,
    userId: 'authenticated-session',
    role: 'viewer',
    asset,
  };
  assertRequest(request);
  return loadGatewayBlob(request);
};

const getRequestCacheKey = (request: PersonMediaAssetRequest): string => [
  request.userId,
  request.role,
  request.treeId,
  request.personId,
  request.asset.assetId,
  request.asset.version,
].join(':');

export function createPersonMediaAssetResolver(
  options: PersonMediaAssetResolverOptions = {}
): PersonMediaAssetResolver {
  const loadBlob = options.loadBlob ?? loadPersonMediaAssetBlob;
  const createObjectUrl = options.createObjectUrl ?? ((blob: Blob) => URL.createObjectURL(blob));
  const revokeObjectUrl = options.revokeObjectUrl ?? ((url: string) => URL.revokeObjectURL(url));
  const cache = new Map<string, CachedObjectUrl>();

  return {
    async acquireObjectUrl(request) {
      assertRequest(request);
      const key = getRequestCacheKey(request);
      const existing = cache.get(key);
      if (existing) {
        existing.refCount += 1;
        return existing.promise;
      }

      const promise = Promise.resolve().then(() => loadBlob(request)).then((blob) => {
        if (cache.get(key) !== entry || entry.refCount <= 0) {
          throw new Error('Private person media request expired');
        }
        const objectUrl = createObjectUrl(validateResolvedBlob(blob, request.asset));
        entry.objectUrl = objectUrl;
        return objectUrl;
      }).catch((error) => {
        if (cache.get(key) === entry) cache.delete(key);
        throw error;
      });
      const entry: CachedObjectUrl = { refCount: 1, promise };
      cache.set(key, entry);
      return entry.promise;
    },

    releaseObjectUrl(request) {
      const key = getRequestCacheKey(request);
      const entry = cache.get(key);
      if (!entry) return;

      entry.refCount -= 1;
      if (entry.refCount <= 0 && entry.objectUrl) {
        revokeObjectUrl(entry.objectUrl);
        cache.delete(key);
      }
    },

    async loadBytes(request) {
      assertRequest(request);
      const blob = validateResolvedBlob(await loadBlob(request), request.asset);
      return readBlobBytes(blob, 'Private person media could not be read');
    },

    clear() {
      for (const entry of cache.values()) {
        if (entry.objectUrl) revokeObjectUrl(entry.objectUrl);
      }
      cache.clear();
    },
  };
}

export const defaultPersonMediaAssetResolver = createPersonMediaAssetResolver();

export const createPersonMediaPosterSource = (asset: PersonMediaAssetRef): string => {
  if (!isPersonMediaAssetRef(asset)) throw new Error('Invalid private poster media reference');
  return `${POSTER_SOURCE_PREFIX}${encodeURIComponent(JSON.stringify(asset))}`;
};

export const parsePersonMediaPosterSource = (source: string): PersonMediaAssetRef | null => {
  if (!source.startsWith(POSTER_SOURCE_PREFIX)) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(source.slice(POSTER_SOURCE_PREFIX.length)));
    return isPersonMediaAssetRef(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const loadPersonMediaPosterSourceBytes = async (source: string): Promise<Uint8Array> => {
  const asset = parsePersonMediaPosterSource(source);
  if (!asset) throw new Error('Invalid private poster media source');

  const blob = await loadPersonMediaAssetBlobForCurrentSession(asset);
  return readBlobBytes(blob, 'Private poster media could not be read');
};
