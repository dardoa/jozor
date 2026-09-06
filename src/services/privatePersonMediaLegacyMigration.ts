import {
  createPersonMediaAssetRef,
  detectPersonMediaImageMimeType,
  isPersonMediaAssetForTree,
  isPersonMediaAssetRef,
  PERSON_MEDIA_MAX_IMAGE_BYTES,
  type PersonMediaAssetRef,
} from '../types/personMedia.js';
import { readBlobBytes } from '../utils/blobBytes.js';

export interface LegacyPersonMediaRow {
  id: string;
  tree_id: string;
  photo_url?: string | null;
  photo_path?: string | null;
  photo_version?: number | null;
  custom_fields?: Record<string, unknown> | null;
}

interface LegacyMediaTaskBase {
  personId: string;
  treeId: string;
  sourceObjectPath: string;
  existingAsset: PersonMediaAssetRef | null;
  currentVersion: number;
}

export interface LegacyProfileMediaTask extends LegacyMediaTaskBase {
  kind: 'profile-photo';
  expectedPhotoPath: string | null;
  expectedPhotoUrl: string | null;
}

export interface LegacyGalleryMediaTask extends LegacyMediaTaskBase {
  kind: 'gallery-photo';
  galleryIndex: number;
  expectedGalleryItem: unknown;
}

export type LegacyPersonMediaTask = LegacyProfileMediaTask | LegacyGalleryMediaTask;

export interface LegacyPersonMediaPlan {
  treeId: string;
  personId: string;
  tasks: LegacyPersonMediaTask[];
  blockedCount: number;
  externalCount: number;
}

export interface LegacyPersonMediaMigrationAdapter {
  downloadLegacyObject(objectPath: string): Promise<Blob>;
  uploadPrivateObject(asset: PersonMediaAssetRef, blob: Blob): Promise<void>;
  downloadPrivateObject(asset: PersonMediaAssetRef): Promise<Blob>;
  attachPrivateAsset(task: LegacyPersonMediaTask, asset: PersonMediaAssetRef): Promise<boolean>;
  removePrivateObject(asset: PersonMediaAssetRef): Promise<void>;
  removeLegacyObject(objectPath: string): Promise<void>;
  finalizeLegacyReference(task: LegacyPersonMediaTask, asset: PersonMediaAssetRef): Promise<boolean>;
}

export interface LegacyPersonMediaMigrationResult {
  migratedCount: number;
  cleanedCount: number;
  failedCount: number;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PUBLIC_AVATAR_PREFIX = '/storage/v1/object/public/avatars/';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const normalizedString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

const isSafeTreeAvatarPath = (value: string, treeId: string): boolean => {
  if (value.length > 512 || value.startsWith('/') || value.includes('\\')) return false;
  if ([...value].some((character) => character.charCodeAt(0) <= 0x1f)) return false;
  const segments = value.split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) return false;
  return segments[0] === treeId && segments.length >= 2;
};

/**
 * Resolves only paths inside this tree's legacy public avatars namespace.
 * Arbitrary remote URLs and user profile avatars are deliberately excluded.
 */
export function resolveLegacyAvatarObjectPath(
  value: unknown,
  treeId: string,
  supabaseUrl: string
): string | null {
  const candidate = normalizedString(value);
  if (!candidate || !UUID_PATTERN.test(treeId)) return null;

  let objectPath = candidate;
  if (/^https?:\/\//i.test(candidate)) {
    try {
      const sourceUrl = new URL(candidate);
      const providerUrl = new URL(supabaseUrl);
      if (sourceUrl.origin !== providerUrl.origin || !sourceUrl.pathname.startsWith(PUBLIC_AVATAR_PREFIX)) {
        return null;
      }
      objectPath = decodeURIComponent(sourceUrl.pathname.slice(PUBLIC_AVATAR_PREFIX.length));
    } catch {
      return null;
    }
  } else {
    objectPath = objectPath.split(/[?#]/, 1)[0];
    if (objectPath.startsWith('avatars/')) objectPath = objectPath.slice('avatars/'.length);
  }

  try {
    objectPath = decodeURIComponent(objectPath);
  } catch {
    return null;
  }

  return isSafeTreeAvatarPath(objectPath, treeId) ? objectPath : null;
}

const readExistingAsset = (
  value: unknown,
  treeId: string,
  kind: PersonMediaAssetRef['kind']
): PersonMediaAssetRef | null | 'invalid' => {
  if (value === undefined || value === null) return null;
  if (!isPersonMediaAssetRef(value) || value.kind !== kind || !isPersonMediaAssetForTree(value, treeId)) {
    return 'invalid';
  }
  return value;
};

const gallerySourceValue = (item: unknown): unknown => {
  if (typeof item === 'string') return item;
  if (!isRecord(item)) return null;
  return normalizedString(item.path) ?? normalizedString(item.url);
};

export function buildMigratedGalleryItem(
  item: unknown,
  asset: PersonMediaAssetRef
): Record<string, unknown> {
  if (typeof item === 'string') {
    const legacyField = /^https?:\/\//i.test(item) ? { url: item } : { path: item };
    return {
      id: asset.assetId,
      ...legacyField,
      asset,
      version: asset.version,
      createdAt: asset.createdAt,
    };
  }

  const source = isRecord(item) ? item : {};
  return {
    ...source,
    id: normalizedString(source.id) ?? asset.assetId,
    asset,
    version: Number.isInteger(source.version) && Number(source.version) > 0
      ? source.version
      : asset.version,
    createdAt: normalizedString(source.createdAt) ?? asset.createdAt,
  };
}

export function planLegacyPersonMediaMigration(
  row: LegacyPersonMediaRow,
  supabaseUrl: string
): LegacyPersonMediaPlan {
  const tasks: LegacyPersonMediaTask[] = [];
  let blockedCount = 0;
  let externalCount = 0;
  const customFields = isRecord(row.custom_fields) ? row.custom_fields : {};

  const profileSourceValue = normalizedString(row.photo_path) ?? normalizedString(row.photo_url);
  if (profileSourceValue) {
    const sourceObjectPath = resolveLegacyAvatarObjectPath(profileSourceValue, row.tree_id, supabaseUrl);
    const existingAsset = readExistingAsset(customFields.photoAsset, row.tree_id, 'profile-photo');
    if (!sourceObjectPath || existingAsset === 'invalid') {
      if (!sourceObjectPath) externalCount += 1;
      if (existingAsset === 'invalid') blockedCount += 1;
    } else {
      tasks.push({
        kind: 'profile-photo',
        personId: row.id,
        treeId: row.tree_id,
        sourceObjectPath,
        existingAsset,
        currentVersion: Math.max(0, Number.isInteger(row.photo_version) ? Number(row.photo_version) : 0),
        expectedPhotoPath: normalizedString(row.photo_path),
        expectedPhotoUrl: normalizedString(row.photo_url),
      });
    }
  }

  const gallery = customFields.gallery;
  if (Array.isArray(gallery)) {
    gallery.forEach((item, galleryIndex) => {
      const sourceValue = gallerySourceValue(item);
      const existingAssetValue = isRecord(item) ? item.asset : undefined;
      const existingAsset = readExistingAsset(existingAssetValue, row.tree_id, 'gallery-photo');

      if (!sourceValue) {
        if (existingAsset === 'invalid') blockedCount += 1;
        return;
      }

      const sourceObjectPath = resolveLegacyAvatarObjectPath(sourceValue, row.tree_id, supabaseUrl);
      if (!sourceObjectPath || existingAsset === 'invalid') {
        if (!sourceObjectPath) externalCount += 1;
        if (existingAsset === 'invalid') blockedCount += 1;
        return;
      }

      tasks.push({
        kind: 'gallery-photo',
        personId: row.id,
        treeId: row.tree_id,
        sourceObjectPath,
        existingAsset,
        currentVersion: isRecord(item) && Number.isInteger(item.version)
          ? Math.max(0, Number(item.version))
          : 0,
        galleryIndex,
        expectedGalleryItem: item,
      });
    });
  }

  return { treeId: row.tree_id, personId: row.id, tasks, blockedCount, externalCount };
}

const validateLegacyBlob = async (blob: Blob): Promise<{ bytes: Uint8Array; mimeType: NonNullable<ReturnType<typeof detectPersonMediaImageMimeType>> }> => {
  if (blob.size <= 0 || blob.size > PERSON_MEDIA_MAX_IMAGE_BYTES) {
    throw new Error('Legacy person media has an invalid image size');
  }
  const bytes = await readBlobBytes(blob, 'Legacy person media could not be read');
  const mimeType = detectPersonMediaImageMimeType(bytes);
  if (!mimeType || (blob.type && blob.type !== mimeType)) {
    throw new Error('Legacy person media has unsupported or mismatched image content');
  }
  return { bytes, mimeType };
};

export async function migrateLegacyPersonMediaPlan(
  plan: LegacyPersonMediaPlan,
  adapter: LegacyPersonMediaMigrationAdapter,
  options: { createAssetId?: () => string; now?: () => string } = {}
): Promise<LegacyPersonMediaMigrationResult> {
  const result: LegacyPersonMediaMigrationResult = {
    migratedCount: 0,
    cleanedCount: 0,
    failedCount: 0,
  };
  const groups = new Map<string, LegacyPersonMediaTask[]>();
  for (const task of plan.tasks) {
    const group = groups.get(task.sourceObjectPath) ?? [];
    group.push(task);
    groups.set(task.sourceObjectPath, group);
  }

  for (const [sourceObjectPath, tasks] of groups) {
    const attached: Array<{ task: LegacyPersonMediaTask; asset: PersonMediaAssetRef }> = [];
    let normalizedBlob: Blob | null = null;
    let sourceBytes: Uint8Array | null = null;
    let mimeType: NonNullable<ReturnType<typeof detectPersonMediaImageMimeType>> | null = null;

    if (tasks.length > 0) {
      try {
        const legacyBlob = await adapter.downloadLegacyObject(sourceObjectPath);
        const validated = await validateLegacyBlob(legacyBlob);
        mimeType = validated.mimeType;
        sourceBytes = validated.bytes;
        normalizedBlob = new Blob([validated.bytes.buffer], { type: validated.mimeType });
      } catch {
        result.failedCount += tasks.length;
        continue;
      }
    }

    for (const task of tasks) {
      if (task.existingAsset) {
        attached.push({ task, asset: task.existingAsset });
        continue;
      }
      if (!normalizedBlob || !mimeType) continue;

      const asset = createPersonMediaAssetRef({
        treeId: task.treeId,
        assetId: options.createAssetId?.() ?? crypto.randomUUID(),
        kind: task.kind,
        mimeType,
        byteLength: normalizedBlob.size,
        version: task.currentVersion + 1,
        createdAt: options.now?.() ?? new Date().toISOString(),
      });

      let uploaded = false;
      let attachmentMayHaveCommitted = false;
      try {
        await adapter.uploadPrivateObject(asset, normalizedBlob);
        uploaded = true;
        const privateBlob = await adapter.downloadPrivateObject(asset);
        const verified = await validateLegacyBlob(privateBlob);
        if (
          verified.bytes.byteLength !== asset.byteLength
          || verified.mimeType !== asset.mimeType
          || !verified.bytes.every((byte, index) => byte === sourceBytes?.[index])
        ) {
          throw new Error('Private person media copy does not match its asset reference');
        }
        attachmentMayHaveCommitted = true;
        const didAttach = await adapter.attachPrivateAsset(task, asset);
        attachmentMayHaveCommitted = didAttach;
        if (!didAttach) throw new Error('Legacy person media attachment lost its compare-and-set race');
        attached.push({ task, asset });
        result.migratedCount += 1;
      } catch {
        result.failedCount += 1;
        if (uploaded && !attachmentMayHaveCommitted) {
          try {
            await adapter.removePrivateObject(asset);
          } catch {
            // The server sweep retries unreferenced objects after the upload grace period.
          }
        }
      }
    }

    if (attached.length !== tasks.length) continue;

    let allPrivateCopiesVerified = true;
    for (const entry of attached.filter(({ task }) => Boolean(task.existingAsset))) {
      try {
        const privateBlob = await adapter.downloadPrivateObject(entry.asset);
        const verified = await validateLegacyBlob(privateBlob);
        if (
          verified.bytes.byteLength !== entry.asset.byteLength
          || verified.bytes.byteLength !== sourceBytes?.byteLength
          || verified.mimeType !== entry.asset.mimeType
          || !verified.bytes.every((byte, index) => byte === sourceBytes?.[index])
        ) {
          throw new Error('Private person media copy does not match its asset reference');
        }
      } catch {
        allPrivateCopiesVerified = false;
        result.failedCount += 1;
      }
    }
    if (!allPrivateCopiesVerified) continue;

    // Finalization queues cleanup transactionally. Never remove bytes while a
    // different person/batch may still depend on the public reference.
    for (const entry of attached) {
      try {
        const didFinalize = await adapter.finalizeLegacyReference(entry.task, entry.asset);
        if (!didFinalize) throw new Error('Legacy person media cleanup lost its compare-and-set race');
        result.cleanedCount += 1;
      } catch {
        result.failedCount += 1;
      }
    }
    try {
      await adapter.removeLegacyObject(sourceObjectPath);
    } catch {
      result.failedCount += 1;
    }
  }

  return result;
}
