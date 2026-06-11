import JSZip from 'jszip';

import type { BackupManifest, FullState, Person } from '../types';
import { getGalleryImageUrl } from '../utils/mediaUtils';
import { createLimit } from '../../shared/concurrency';

export interface ArchiveBuildOptions {
  label: string;
  appVersion?: string;
  createdAt?: string;
  mediaFetcher?: (url: string) => Promise<Blob>;
}

export interface ArchiveBuildResult {
  blob: Blob;
  manifest: BackupManifest;
}

type ArchiveTreeState = Pick<
  FullState,
  'version' | 'people' | 'locations' | 'settings' | 'focusId' | 'metadata'
>;

const DEFAULT_ARCHIVE_VERSION = 2;
const DEFAULT_APP_VERSION = 'unknown';
const EMPTY_TIMESTAMP = '1970-01-01T00:00:00.000Z';

/**
 * Builds the new blueprint-compliant Jozor archive format.
 *
 * Why: the archive service creates a portable package with a deterministic
 * file layout so later
 * backup/restore steps can treat archives as a stable contract rather than a
 * UI-specific export detail.
 */
export const buildBlueprintArchive = async (
  snapshot: ArchiveTreeState,
  options: ArchiveBuildOptions
): Promise<ArchiveBuildResult> => {
  const createdAt = resolveCreatedAt(snapshot, options.createdAt);
  const archiveDate = new Date(createdAt);
  const mediaFetcher = options.mediaFetcher ?? fetchMediaAsBlob;
  const zip = new JSZip();
  const limit = createLimit(5);

  const sortedPersonIds = Object.keys(snapshot.people).sort();
  const normalizedPeople: Record<string, Person> = {};
  const avatars: Record<string, string> = {};
  const gallery: Record<string, string[]> = {};

  // We rewrite media references into manifest entries so tree.json stays purely
  // data-oriented and never embeds transport-specific image payloads.
  const tempResults = await Promise.all(
    sortedPersonIds.map(async (personId) => {
      const person = snapshot.people[personId];
      const normalizedPerson = clonePersonWithoutPortableMedia(person);

      const avatarPromise = person.photoUrl
        ? limit(() =>
            addMediaFile({
              zip,
              source: person.photoUrl!,
              targetBasePath: `media/avatars/${sanitizeFileSegment(personId)}`,
              date: archiveDate,
              mediaFetcher,
            }).catch((err) => {
              console.warn(`[ARCHIVE] Failed to fetch avatar for ${personId}:`, err);
              return null;
            })
          )
        : Promise.resolve(null);

      const galleryPromises = (Array.isArray(person.gallery) ? person.gallery : []).map(
        (galleryItem, index) => {
          const sourceUrl = getGalleryImageUrl(galleryItem);
          if (!sourceUrl) return Promise.resolve(null);
          
          return limit(() =>
            addMediaFile({
              zip,
              source: sourceUrl,
              targetBasePath: `media/gallery/${sanitizeFileSegment(personId)}-${index + 1}`,
              date: archiveDate,
              mediaFetcher,
            }).catch((err) => {
              console.warn(`[ARCHIVE] Failed to fetch gallery item ${index} for ${personId}:`, err);
              return null;
            })
          );
        }
      );

      const [avatarPath, galleryPathsRaw] = await Promise.all([
        avatarPromise,
        Promise.all(galleryPromises),
      ]);

      const galleryPaths = galleryPathsRaw.filter((path): path is string => typeof path === 'string');

      return {
        personId,
        normalizedPerson,
        avatarPath,
        galleryPaths,
      };
    })
  );

  // Populate maps in deterministic order of sortedPersonIds
  for (const { personId, normalizedPerson, avatarPath, galleryPaths } of tempResults) {
    normalizedPeople[personId] = normalizedPerson;

    if (avatarPath) {
      avatars[personId] = avatarPath;
    }

    if (galleryPaths.length > 0) {
      gallery[personId] = galleryPaths;
    }
  }

  const normalizedTree: ArchiveTreeState = {
    version: snapshot.version,
    people: normalizedPeople,
    locations: snapshot.locations,
    settings: snapshot.settings,
    focusId: snapshot.focusId,
    metadata: snapshot.metadata,
  };

  const manifest: BackupManifest = {
    version: DEFAULT_ARCHIVE_VERSION,
    metadata: {
      createdAt,
      label: options.label,
      appVersion: options.appVersion ?? DEFAULT_APP_VERSION,
      personCount: sortedPersonIds.length,
      photoCount:
        Object.keys(avatars).length +
        Object.values(gallery).reduce((count, items) => count + items.length, 0),
    },
    treeFile: 'tree.json',
    media: {
      avatars,
      gallery,
    },
  };

  zip.file('tree.json', stableStringify(sortObjectKeys(normalizedTree), 2), {
    date: archiveDate,
  });
  zip.file('manifest.json', stableStringify(sortObjectKeys(manifest), 2), {
    date: archiveDate,
  });

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  return { blob, manifest };
};

/**
 * Creates a deep-cloned archive-safe snapshot payload.
 *
 * Why: archive JSON must remain free of embedded or provider-bound media
 * references. We preserve the tree data shape but clear fields that will be
 * represented by manifest + media files instead.
 */
const clonePersonWithoutPortableMedia = (person: Person): Person => {
  const cloned = structuredClone(person);
  delete cloned.photoUrl;
  cloned.gallery = [];
  cloned.voiceNotes = [];
  return cloned;
};

const resolveCreatedAt = (snapshot: ArchiveTreeState, override?: string): string => {
  if (override) return new Date(override).toISOString();

  if (snapshot.metadata?.lastModified) {
    return new Date(snapshot.metadata.lastModified).toISOString();
  }

  return EMPTY_TIMESTAMP;
};

interface AddMediaFileParams {
  zip: JSZip;
  source: string;
  targetBasePath: string;
  date: Date;
  mediaFetcher: (url: string) => Promise<Blob>;
}

const addMediaFile = async ({
  zip,
  source,
  targetBasePath,
  date,
  mediaFetcher,
}: AddMediaFileParams): Promise<string | null> => {
  if (!source) return null;

  const { blob, extension } = await resolveMediaSource(source, mediaFetcher);
  const finalPath = `${targetBasePath}.${extension}`;
  zip.file(finalPath, blob, { binary: true, date });
  return finalPath;
};

const resolveMediaSource = async (
  source: string,
  mediaFetcher: (url: string) => Promise<Blob>
): Promise<{ blob: Blob; extension: string }> => {
  if (source.startsWith('data:')) {
    const blob = dataUrlToBlob(source);
    return {
      blob,
      extension: getExtensionFromMimeType(blob.type) ?? 'bin',
    };
  }

  const blob = await mediaFetcher(source);
  return {
    blob,
    extension: resolveBlobExtension(blob, source),
  };
};

const fetchMediaAsBlob = async (url: string): Promise<Blob> => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch media for archive: ${response.status}`);
  }

  return response.blob();
};

const dataUrlToBlob = (dataUrl: string): Blob => {
  const [header, encoded] = dataUrl.split(',');

  if (!header || !encoded) {
    throw new Error('Invalid data URL supplied to archive builder.');
  }

  const mimeMatch = header.match(/^data:(.*?)(;base64)?$/);
  const mimeType = mimeMatch?.[1] || 'application/octet-stream';
  const isBase64 = header.includes(';base64');

  const binary = isBase64 ? atob(encoded) : decodeURIComponent(encoded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mimeType });
};

const resolveBlobExtension = (blob: Blob, source: string): string => {
  return (
    getExtensionFromMimeType(blob.type) ??
    getExtensionFromPath(source) ??
    'bin'
  );
};

const getExtensionFromMimeType = (mimeType: string): string | null => {
  const normalized = mimeType.toLowerCase();

  if (normalized === 'image/jpeg') return 'jpg';
  if (normalized === 'image/png') return 'png';
  if (normalized === 'image/webp') return 'webp';
  if (normalized === 'image/gif') return 'gif';
  if (normalized === 'image/svg+xml') return 'svg';
  if (normalized === 'application/octet-stream') return null;

  return normalized.split('/')[1] || null;
};

const getExtensionFromPath = (path: string): string | null => {
  try {
    const normalized = new URL(path).pathname;
    const extension = normalized.split('.').pop()?.toLowerCase();
    return extension && extension !== normalized.toLowerCase() ? extension : null;
  } catch {
    const sanitized = path.split('?')[0].split('#')[0];
    const extension = sanitized.split('.').pop()?.toLowerCase();
    return extension && extension !== sanitized.toLowerCase() ? extension : null;
  }
};

const sanitizeFileSegment = (value: string): string => {
  return value.replace(/[^a-zA-Z0-9-_]/g, '_');
};

const sortObjectKeys = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map((entry) => sortObjectKeys(entry)) as T;
  }

  if (value && typeof value === 'object') {
    const sortedEntries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, sortObjectKeys(entry)]);

    return Object.fromEntries(sortedEntries) as T;
  }

  return value;
};

const stableStringify = (value: unknown, space = 0): string => {
  return JSON.stringify(value, null, space);
};
