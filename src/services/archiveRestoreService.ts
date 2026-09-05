import JSZip from 'jszip';

import {
  detectPersonMediaImageMimeType,
  PERSON_MEDIA_MAX_IMAGE_BYTES,
  type BackupManifest,
  type FullState,
  type Person,
} from '../types';
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

export interface ArchivePersonImageBlobs {
  avatar?: Blob;
  gallery: Blob[];
}

export interface BlueprintArchiveCloudImportResult {
  people: Record<string, Person>;
  settings?: Record<string, unknown>;
  mediaByPersonId: Record<string, ArchivePersonImageBlobs>;
  warnings: string[];
  mediaComplete: boolean;
}

type ArchiveTreeState = Pick<
  FullState,
  'version' | 'people' | 'locations' | 'settings' | 'focusId' | 'metadata'
>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const isNonNegativeInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;

const readStringRecord = (value: unknown): Record<string, string> | null => {
  if (value === undefined) return {};
  if (!isRecord(value)) return null;
  const entries = Object.entries(value);
  if (entries.some(([key, item]) => !key || typeof item !== 'string' || !item)) return null;
  return Object.fromEntries(entries) as Record<string, string>;
};

const readStringArrayRecord = (value: unknown): Record<string, string[]> | null => {
  if (value === undefined) return {};
  if (!isRecord(value)) return null;
  const entries = Object.entries(value);
  if (entries.some(([key, item]) => (
    !key
    || !Array.isArray(item)
    || item.some((path) => typeof path !== 'string' || !path)
  ))) return null;
  return Object.fromEntries(entries) as Record<string, string[]>;
};

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

/**
 * Reads a blueprint archive for permanent cloud import.
 *
 * Unlike the local restore path, this returns validated image blobs and never
 * creates browser object URLs that could accidentally be persisted.
 */
export const extractBlueprintArchiveForCloudImport = async (
  archive: Blob
): Promise<BlueprintArchiveCloudImportResult> => {
  const zip = await JSZip.loadAsync(archive);
  const manifest = await readManifest(zip);
  const treeState = await readTreeState(zip, manifest.treeFile);
  const warnings: string[] = [];
  const people: Record<string, Person> = {};
  const mediaByPersonId: Record<string, ArchivePersonImageBlobs> = {};
  let mediaComplete = true;

  const mediaPersonIds = new Set([
    ...Object.keys(manifest.media.avatars),
    ...Object.keys(manifest.media.gallery),
  ]);
  for (const personId of [...mediaPersonIds].sort()) {
    if (Object.prototype.hasOwnProperty.call(treeState.people, personId)) continue;
    mediaComplete = false;
    warnings.push(`Archive media references an unknown person: ${personId}`);
  }

  const referencedPhotoCount = Object.keys(manifest.media.avatars).length
    + Object.values(manifest.media.gallery).reduce((total, paths) => total + paths.length, 0);
  if (manifest.metadata.photoCount !== referencedPhotoCount) {
    mediaComplete = false;
    warnings.push('Archive media count does not match its manifest.');
  }

  for (const personId of Object.keys(treeState.people).sort()) {
    const person = validatePerson(treeState.people[personId]);
    if (person.id !== personId) {
      throw new Error('Invalid blueprint archive: person identity does not match its tree key');
    }
    delete person.photoUrl;
    delete person.photoPath;
    delete person.photoVersion;
    delete person.photoAsset;
    person.gallery = [];
    person.voiceNotes = [];
    people[personId] = person;

    const avatarPath = manifest.media.avatars[personId];
    const galleryPaths = manifest.media.gallery[personId] ?? [];
    const avatar = avatarPath
      ? await readArchiveImageBlob(zip, avatarPath, warnings)
      : undefined;
    const gallery = (await Promise.all(
      galleryPaths.map((filePath) => readArchiveImageBlob(zip, filePath, warnings))
    )).filter((blob): blob is Blob => blob !== undefined);
    if ((avatarPath && !avatar) || gallery.length !== galleryPaths.length) {
      mediaComplete = false;
    }

    if (avatar || gallery.length > 0) {
      mediaByPersonId[personId] = { avatar, gallery };
    }
  }

  return {
    people,
    settings: treeState.settings as Record<string, unknown> | undefined,
    mediaByPersonId,
    warnings,
    mediaComplete,
  };
};

const readManifest = async (zip: JSZip): Promise<BackupManifest> => {
  const manifestFile = zip.file('manifest.json');

  if (!manifestFile) {
    throw new Error('Invalid blueprint archive: manifest.json not found');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(await manifestFile.async('string'));
  } catch {
    throw new Error('Invalid blueprint archive: manifest.json is malformed');
  }
  if (!isRecord(parsed) || parsed.treeFile !== 'tree.json' || !isRecord(parsed.metadata)) {
    throw new Error('Invalid blueprint archive: manifest.json is malformed');
  }

  const metadata = parsed.metadata;
  const media = parsed.media === undefined ? {} : parsed.media;
  if (!isRecord(media)) throw new Error('Invalid blueprint archive: manifest.json is malformed');
  const avatars = readStringRecord(media.avatars);
  const gallery = readStringArrayRecord(media.gallery);
  if (
    !isNonNegativeInteger(parsed.version)
    || typeof metadata.createdAt !== 'string'
    || typeof metadata.label !== 'string'
    || typeof metadata.appVersion !== 'string'
    || !isNonNegativeInteger(metadata.personCount)
    || !isNonNegativeInteger(metadata.photoCount)
    || !avatars
    || !gallery
  ) {
    throw new Error('Invalid blueprint archive: manifest.json is malformed');
  }

  return {
    version: parsed.version,
    metadata: {
      createdAt: metadata.createdAt,
      label: metadata.label,
      appVersion: metadata.appVersion,
      personCount: metadata.personCount,
      photoCount: metadata.photoCount,
    },
    treeFile: 'tree.json',
    media: { avatars, gallery },
  };
};

const readTreeState = async (zip: JSZip, treeFilePath: string): Promise<ArchiveTreeState> => {
  const treeFile = zip.file(treeFilePath);

  if (!treeFile) {
    throw new Error(`Invalid blueprint archive: ${treeFilePath} not found`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(await treeFile.async('string'));
  } catch {
    throw new Error('Invalid blueprint archive: tree.json is malformed');
  }
  if (!isRecord(parsed) || !isRecord(parsed.people)) {
    throw new Error('Invalid blueprint archive: tree.json is malformed');
  }
  if (parsed.settings !== undefined && !isRecord(parsed.settings)) {
    throw new Error('Invalid blueprint archive: tree.json is malformed');
  }
  if (parsed.focusId !== undefined && typeof parsed.focusId !== 'string') {
    throw new Error('Invalid blueprint archive: tree.json is malformed');
  }

  const people: Record<string, Person> = {};
  for (const [personId, person] of Object.entries(parsed.people)) {
    if (!personId || !isRecord(person)) {
      throw new Error('Invalid blueprint archive: tree.json is malformed');
    }
    people[personId] = person as unknown as Person;
  }

  return {
    version: typeof parsed.version === 'number' ? parsed.version : 1,
    people,
    locations: parsed.locations as ArchiveTreeState['locations'],
    settings: (parsed.settings ?? {}) as ArchiveTreeState['settings'],
    focusId: parsed.focusId,
    metadata: parsed.metadata as ArchiveTreeState['metadata'],
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

  // Keep warnings order deterministic by giving each person a separate warnings array
  const personWarningsList = personIds.map(() => [] as string[]);

  const restoredPeopleTemp = await Promise.all(
    personIds.map(async (personId, idx) => {
      const restored = validatePerson(people[personId]);

      const [photoUrl, gallery] = await Promise.all([
        restoreAvatar({
          zip,
          personId,
          manifest,
          warnings: personWarningsList[idx],
          createObjectUrl,
          trackObjectUrl,
        }),
        restoreGallery({
          zip,
          personId,
          manifest,
          warnings: personWarningsList[idx],
          createObjectUrl,
          trackObjectUrl,
        }),
      ]);

      restored.photoUrl = photoUrl;
      restored.gallery = gallery;
      restored.voiceNotes = [];

      return { personId, restored };
    })
  );

  // Populate restoredPeople in the deterministic sorted order of personIds
  for (const { personId, restored } of restoredPeopleTemp) {
    restoredPeople[personId] = restored;
  }

  // Add warnings to the main warnings array in deterministic sorted order
  for (const w of personWarningsList) {
    warnings.push(...w);
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

  // Track warnings for each path to keep warnings deterministic
  const pathWarnings = galleryPaths.map(() => [] as string[]);

  const results = await Promise.all(
    galleryPaths.map((galleryPath, index) =>
      restoreMediaUrl({
        zip,
        filePath: galleryPath,
        warnings: pathWarnings[index],
        createObjectUrl,
        trackObjectUrl,
      })
    )
  );

  // Push all warnings in the exact order of galleryPaths
  for (const w of pathWarnings) {
    warnings.push(...w);
  }

  return results.filter((url): url is string => typeof url === 'string');
};

const restoreMediaUrl = async ({
  zip,
  filePath,
  warnings,
  createObjectUrl,
  trackObjectUrl,
}: RestoreMediaParams): Promise<string | undefined> => {
  const blob = await readArchiveImageBlob(zip, filePath, warnings);
  if (!blob) return undefined;
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
  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(filePath);
  } catch {
    return false;
  }
  if (!decodedPath || decodedPath.length > 255) return false;
  if (decodedPath.startsWith('/') || decodedPath.startsWith('\\') || /^[a-z]:/i.test(decodedPath)) return false;
  if (decodedPath.includes('\\')) return false;
  if ([...decodedPath].some((character) => character.charCodeAt(0) <= 0x1f)) return false;
  const segments = decodedPath.split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) return false;
  return decodedPath.startsWith('media/avatars/') || decodedPath.startsWith('media/gallery/');
};

const readArchiveImageBlob = async (
  zip: JSZip,
  filePath: string,
  warnings: string[]
): Promise<Blob | undefined> => {
  if (!isSafeArchiveMediaPath(filePath)) {
    warnings.push(`Skipped unsafe media path: ${filePath}`);
    return undefined;
  }
  const mediaFile = zip.file(filePath);
  if (!mediaFile) {
    warnings.push(`Missing media file in archive: ${filePath}`);
    return undefined;
  }
  const bytes = await mediaFile.async('uint8array');
  if (bytes.byteLength <= 0 || bytes.byteLength > PERSON_MEDIA_MAX_IMAGE_BYTES) {
    warnings.push(`Skipped invalid-size image in archive: ${filePath}`);
    return undefined;
  }
  const mimeType = detectPersonMediaImageMimeType(bytes);
  if (!mimeType) {
    warnings.push(`Skipped unsupported image content in archive: ${filePath}`);
    return undefined;
  }
  return new Blob([bytes.slice().buffer], { type: mimeType });
};

const defaultObjectUrlFactory = (blob: Blob): string => {
  return URL.createObjectURL(blob);
};
