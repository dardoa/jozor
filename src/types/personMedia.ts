export const PERSON_MEDIA_ASSET_SCHEMA_VERSION = 1 as const;
export const PRIVATE_PERSON_MEDIA_BUCKET = 'person-media' as const;
export const PERSON_MEDIA_MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const PERSON_MEDIA_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type PersonMediaAssetKind = 'profile-photo' | 'gallery-photo';
export type PersonMediaImageMimeType = typeof PERSON_MEDIA_IMAGE_MIME_TYPES[number];

/**
 * Persisted reference to owner-managed private media.
 *
 * The object path is storage metadata. UI and export renderers must resolve it
 * through the person-media boundary and must never place it in DOM markup.
 */
export interface PersonMediaAssetRef {
  schemaVersion: typeof PERSON_MEDIA_ASSET_SCHEMA_VERSION;
  provider: 'supabase-private';
  bucket: typeof PRIVATE_PERSON_MEDIA_BUCKET;
  assetId: string;
  kind: PersonMediaAssetKind;
  objectPath: string;
  mimeType: PersonMediaImageMimeType;
  byteLength: number;
  version: number;
  createdAt: string;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TREE_SCOPE_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/;
const PERSON_MEDIA_KEYS = new Set<keyof PersonMediaAssetRef>([
  'schemaVersion',
  'provider',
  'bucket',
  'assetId',
  'kind',
  'objectPath',
  'mimeType',
  'byteLength',
  'version',
  'createdAt',
]);

const MIME_EXTENSIONS: Record<PersonMediaImageMimeType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export const isPersonMediaImageMimeType = (
  value: unknown
): value is PersonMediaImageMimeType => (
  typeof value === 'string'
  && PERSON_MEDIA_IMAGE_MIME_TYPES.some((mimeType) => mimeType === value)
);

export const detectPersonMediaImageMimeType = (
  bytes: Uint8Array
): PersonMediaImageMimeType | null => {
  if (
    bytes.length >= 3
    && bytes[0] === 0xff
    && bytes[1] === 0xd8
    && bytes[2] === 0xff
  ) {
    return 'image/jpeg';
  }

  if (
    bytes.length >= 8
    && bytes[0] === 0x89
    && bytes[1] === 0x50
    && bytes[2] === 0x4e
    && bytes[3] === 0x47
    && bytes[4] === 0x0d
    && bytes[5] === 0x0a
    && bytes[6] === 0x1a
    && bytes[7] === 0x0a
  ) {
    return 'image/png';
  }

  if (
    bytes.length >= 12
    && bytes[0] === 0x52
    && bytes[1] === 0x49
    && bytes[2] === 0x46
    && bytes[3] === 0x46
    && bytes[8] === 0x57
    && bytes[9] === 0x45
    && bytes[10] === 0x42
    && bytes[11] === 0x50
  ) {
    return 'image/webp';
  }

  return null;
};

export function isPersonMediaAssetRef(value: unknown): value is PersonMediaAssetRef {
  if (!isRecord(value)) return false;
  if (Object.keys(value).some((key) => !PERSON_MEDIA_KEYS.has(key as keyof PersonMediaAssetRef))) {
    return false;
  }

  const kind = value.kind;
  const mimeType = value.mimeType;
  if (kind !== 'profile-photo' && kind !== 'gallery-photo') return false;
  if (!isPersonMediaImageMimeType(mimeType)) return false;
  if (value.schemaVersion !== PERSON_MEDIA_ASSET_SCHEMA_VERSION) return false;
  if (value.provider !== 'supabase-private' || value.bucket !== PRIVATE_PERSON_MEDIA_BUCKET) return false;
  if (typeof value.assetId !== 'string' || !UUID_PATTERN.test(value.assetId)) return false;
  if (
    !Number.isInteger(value.byteLength)
    || (value.byteLength as number) <= 0
    || (value.byteLength as number) > PERSON_MEDIA_MAX_IMAGE_BYTES
  ) return false;
  if (!Number.isInteger(value.version) || (value.version as number) < 1) return false;
  if (typeof value.createdAt !== 'string' || !Number.isFinite(Date.parse(value.createdAt))) return false;
  if (typeof value.objectPath !== 'string' || value.objectPath.length > 512) return false;
  if (value.objectPath.includes('..') || value.objectPath.includes('\\') || value.objectPath.startsWith('/')) {
    return false;
  }

  const pathParts = value.objectPath.split('/');
  if (pathParts.length !== 3 || !TREE_SCOPE_PATTERN.test(pathParts[0]) || pathParts[1] !== kind) {
    return false;
  }

  return pathParts[2] === `${value.assetId}.${MIME_EXTENSIONS[mimeType]}`;
}

export function isPersonMediaAssetForTree(asset: PersonMediaAssetRef, treeId: string): boolean {
  return TREE_SCOPE_PATTERN.test(treeId) && asset.objectPath.startsWith(`${treeId}/`);
}

export function createPersonMediaAssetRef(input: {
  treeId: string;
  assetId: string;
  kind: PersonMediaAssetKind;
  mimeType: PersonMediaImageMimeType;
  byteLength: number;
  version?: number;
  createdAt?: string;
}): PersonMediaAssetRef {
  const extension = MIME_EXTENSIONS[input.mimeType];
  const asset: PersonMediaAssetRef = {
    schemaVersion: PERSON_MEDIA_ASSET_SCHEMA_VERSION,
    provider: 'supabase-private',
    bucket: PRIVATE_PERSON_MEDIA_BUCKET,
    assetId: input.assetId,
    kind: input.kind,
    objectPath: `${input.treeId}/${input.kind}/${input.assetId}.${extension}`,
    mimeType: input.mimeType,
    byteLength: input.byteLength,
    version: input.version ?? 1,
    createdAt: input.createdAt ?? new Date().toISOString(),
  };

  if (!isPersonMediaAssetRef(asset)) {
    throw new Error('Invalid private person media asset reference');
  }

  return asset;
}
