import JSZip from 'jszip';

import type { BackupManifest, FullState, Person } from '../types';
import { validatePerson } from '../utils/familyLogic';

export interface BlueprintArchiveRestoreOptions {
  objectUrlFactory?: (blob: Blob) => string;
}

export interface BlueprintArchiveRestoreResult {
  state: FullState;
  manifest: BackupManifest;
  warnings: string[];
  revokeObjectUrls: () => void;
}

type ArchiveTreeState = Pick<
  FullState,
  'version' | 'people' | 'locations' | 'settings' | 'focusId' | 'metadata'
>;

interface ManifestShape {
  version: number;
  metadata: {
    createdAt: string;
    label: string;
    appVersion: string;
    personCount: number;
    photoCount: number;
  };
  treeFile: string;
  media?: {
    avatars?: Record<string, string>;
    gallery?: Record<string, string[]>;
  };
}

/**
 * Restores a blueprint archive into runtime state.
 *
 * Why: the new archive contract separates tree data from media files, so
 * restore must rebuild browser-usable media references from blobs.
 */
export const restoreBlueprintArchive = async (
  archive: Blob,
  options: BlueprintArchiveRestoreOptions = {}
): Promise<BlueprintArchiveRestoreResult> => {
  const zip = await JSZip.loadAsync(archive);
  const manifest = await readManifest(zip);
  const treeState = await readTreeState(zip, manifest.treeFile);
  const warnings: string[] = [];
  const createdObjectUrls: string[] = [];
  const createObjectUrl = options.objectUrlFactory ?? defaultObjectUrlFactory;

  const restoredPeople = await restorePeopleMedia({
    zip,
    people: treeState.people,
    manifest,
    warnings,
    createObjectUrl,
    trackObjectUrl: (value) => {
      createdObjectUrls.push(value);
    },
  });

  const state: FullState = {
    version: typeof treeState.version === 'number' ? treeState.version : 1,
    people: restoredPeople,
    locations: treeState.locations,
    settings: treeState.settings ?? {},
    focusId: resolveFocusId(treeState.focusId, restoredPeople),
    metadata: treeState.metadata,
  };

  return {
    state,
    manifest,
    warnings,
    revokeObjectUrls: () => {
      for (const url of createdObjectUrls) {
        URL.revokeObjectURL(url);
      }
    },
  };
};

const readManifest = async (zip: JSZip): Promise<BackupManifest> => {
  const manifestFile = zip.file('manifest.json');

  if (!manifestFile) {
    throw new Error('Invalid blueprint archive: manifest.json not found');
  }

  const parsed = JSON.parse(await manifestFile.async('string')) as ManifestShape;

  if (!parsed || parsed.treeFile !== 'tree.json') {
    throw new Error('Invalid blueprint archive: manifest.json is malformed');
  }

  return {
    version: parsed.version,
    metadata: parsed.metadata,
    treeFile: 'tree.json',
    media: {
      avatars: parsed.media?.avatars ?? {},
      gallery: parsed.media?.gallery ?? {},
    },
  };
};

const readTreeState = async (zip: JSZip, treeFilePath: string): Promise<ArchiveTreeState> => {
  const treeFile = zip.file(treeFilePath);

  if (!treeFile) {
    throw new Error(`Invalid blueprint archive: ${treeFilePath} not found`);
  }

  const parsed = JSON.parse(await treeFile.async('string')) as Partial<ArchiveTreeState>;

  if (!parsed || typeof parsed !== 'object' || !parsed.people || typeof parsed.people !== 'object') {
    throw new Error('Invalid blueprint archive: tree.json is malformed');
  }

  return {
    version: parsed.version ?? 1,
    people: parsed.people as Record<string, Person>,
    locations: parsed.locations,
    settings: parsed.settings ?? {},
    focusId: parsed.focusId,
    metadata: parsed.metadata,
  };
};

interface RestorePeopleMediaParams {
  zip: JSZip;
  people: Record<string, Person>;
  manifest: BackupManifest;
  warnings: string[];
  createObjectUrl: (blob: Blob) => string;
  trackObjectUrl: (value: string) => void;
}

const restorePeopleMedia = async ({
  zip,
  people,
  manifest,
  warnings,
  createObjectUrl,
  trackObjectUrl,
}: RestorePeopleMediaParams): Promise<Record<string, Person>> => {
  const restoredPeople: Record<string, Person> = {};
  const personIds = Object.keys(people).sort();

  for (const personId of personIds) {
    const restored = validatePerson(people[personId]);

    restored.photoUrl = await restoreAvatar({
      zip,
      personId,
      manifest,
      warnings,
      createObjectUrl,
      trackObjectUrl,
    });

    restored.gallery = await restoreGallery({
      zip,
      personId,
      manifest,
      warnings,
      createObjectUrl,
      trackObjectUrl,
    });

    // Blueprint archives intentionally do not preserve voice notes yet, so we
    // keep the restored runtime state explicit about that current limitation.
    restored.voiceNotes = [];

    restoredPeople[personId] = restored;
  }

  return restoredPeople;
};

interface RestoreMediaParams {
  zip: JSZip;
  filePath: string;
  warnings: string[];
  createObjectUrl: (blob: Blob) => string;
  trackObjectUrl: (value: string) => void;
}

const restoreAvatar = async ({
  zip,
  personId,
  manifest,
  warnings,
  createObjectUrl,
  trackObjectUrl,
}: Omit<RestorePeopleMediaParams, 'people'> & { personId: string }): Promise<string | undefined> => {
  const avatarPath = manifest.media.avatars[personId];

  if (!avatarPath) {
    return undefined;
  }

  return restoreMediaUrl({
    zip,
    filePath: avatarPath,
    warnings,
    createObjectUrl,
    trackObjectUrl,
  });
};

const restoreGallery = async ({
  zip,
  personId,
  manifest,
  warnings,
  createObjectUrl,
  trackObjectUrl,
}: Omit<RestorePeopleMediaParams, 'people'> & { personId: string }): Promise<string[]> => {
  const galleryPaths = manifest.media.gallery[personId] ?? [];
  const restoredGallery: string[] = [];

  for (const galleryPath of galleryPaths) {
    const restored = await restoreMediaUrl({
      zip,
      filePath: galleryPath,
      warnings,
      createObjectUrl,
      trackObjectUrl,
    });

    if (restored) {
      restoredGallery.push(restored);
    }
  }

  return restoredGallery;
};

const restoreMediaUrl = async ({
  zip,
  filePath,
  warnings,
  createObjectUrl,
  trackObjectUrl,
}: RestoreMediaParams): Promise<string | undefined> => {
  if (!isSafeArchiveMediaPath(filePath)) {
    warnings.push(`Skipped unsafe media path: ${filePath}`);
    return undefined;
  }

  const mediaFile = zip.file(filePath);

  if (!mediaFile) {
    warnings.push(`Missing media file in archive: ${filePath}`);
    return undefined;
  }

  const blob = await mediaFile.async('blob');
  const objectUrl = createObjectUrl(blob);
  trackObjectUrl(objectUrl);
  return objectUrl;
};

const resolveFocusId = (
  focusId: string | undefined,
  people: Record<string, Person>
): string | undefined => {
  if (focusId && people[focusId]) {
    return focusId;
  }

  return Object.keys(people)[0];
};

const isSafeArchiveMediaPath = (filePath: string): boolean => {
  if (!filePath) return false;
  if (filePath.length > 255) return false;
  if (filePath.startsWith('/')) return false;
  if (filePath.includes('..')) return false;

  return filePath.startsWith('media/avatars/') || filePath.startsWith('media/gallery/');
};

const defaultObjectUrlFactory = (blob: Blob): string => {
  return URL.createObjectURL(blob);
};
