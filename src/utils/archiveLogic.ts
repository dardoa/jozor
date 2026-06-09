import JSZip from 'jszip';
import { Person, GalleryItem } from '../types';
import { validatePerson } from './familyLogic';
import { googleMediaService } from '../services/googleService';
import { OFFLINE_VIEWER_HTML } from './archiveTemplates';
import { getGalleryImageUrl } from './mediaUtils';

// Helper to extract base64 data
const getBase64Data = (dataUrl: string) => {
  return dataUrl.split(',')[1];
};

// Helper to extract mime type
const getMimeType = (dataUrl: string) => {
  return dataUrl.split(';')[0].split(':')[1];
};

// Helper to extract extension from mime
const getExtension = (mime: string) => {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'audio/webm') return 'webm';
  return 'bin';
};

// Helper to convert Blob to Base64
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const decodeArchivePath = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const getSafeArchiveMediaPath = (mediaPath: string, expectedFolder: string): string | null => {
  const decodedPath = decodeArchivePath(mediaPath);
  const hasSuspiciousPathSyntax =
    decodedPath.length === 0 ||
    decodedPath.length > 255 ||
    decodedPath.startsWith('/') ||
    decodedPath.startsWith('\\') ||
    /^[a-z]:/i.test(decodedPath) ||
    decodedPath.includes('\\') ||
    /[\u0000-\u001f]/.test(decodedPath);

  if (hasSuspiciousPathSyntax) return null;

  const segments = decodedPath.split('/');
  if (segments[0] !== expectedFolder || segments.length < 2) return null;
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) return null;

  return decodedPath;
};

// New helper for secure file lookup within the zip
const findAndValidateMediaFile = async (
  zip: JSZip,
  mediaPath: string,
  expectedFolder: string,
  filesMap?: Map<string, JSZip.JSZipObject>,
  folderMaps?: { images: Map<string, JSZip.JSZipObject>; audio: Map<string, JSZip.JSZipObject> }
): Promise<string> => {
  const safeMediaPath = getSafeArchiveMediaPath(mediaPath, expectedFolder);
  if (!safeMediaPath) {
    console.warn(
      `Security alert: Invalid or suspicious media path detected: '${mediaPath}'. Skipping.`
    );
    return mediaPath;
  }

  let mediaFile: JSZip.JSZipObject | null = null;
  if (filesMap) {
    mediaFile = filesMap.get(safeMediaPath.toLowerCase()) || null;
  } else {
    mediaFile = zip.file(safeMediaPath);
  }

  if (!mediaFile) {
    // If direct path fails, try finding by filename alone within the expected folder.
    const fileName = safeMediaPath.split('/').pop();
    if (fileName) {
      const lowerFileName = fileName.toLowerCase();
      if (folderMaps) {
        if (expectedFolder === 'images') {
          mediaFile = folderMaps.images.get(lowerFileName) || null;
        } else if (expectedFolder === 'audio') {
          mediaFile = folderMaps.audio.get(lowerFileName) || null;
        }
      } else {
        // Escape special characters in fileName for regex
        const escapedFileName = fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const matches = zip.file(new RegExp(`^${expectedFolder}/${escapedFileName}$`));
        if (matches.length > 0) mediaFile = matches[0];
      }
    }
  }

  if (mediaFile) {
    const base64 = await mediaFile.async('base64');
    const ext = safeMediaPath.split('.').pop();
    const mime =
      ext === 'png'
        ? 'image/png'
        : ext === 'jpg'
          ? 'image/jpeg'
          : ext === 'jpeg'
            ? 'image/jpeg'
            : ext === 'webp'
              ? 'image/webp'
              : 'audio/webm';
    return `data:${mime};base64,${base64}`;
  }
  return mediaPath; // Return original path if not found
};

export const exportToJozorArchive = async (
  people: Record<string, Person>,
  fullState?: Record<string, unknown>
): Promise<Blob> => {
  const zip = new JSZip();
  const imagesFolder = zip.folder('images');
  const audioFolder = zip.folder('audio');

  // Create a deep copy to modify for storage without affecting app state
  const peopleToStore = JSON.parse(JSON.stringify(people));

  for (const key of Object.keys(peopleToStore)) {
    const p = peopleToStore[key];

    // 1. Process Profile Photo
    if (p.photoUrl) {
      if (p.photoUrl.startsWith('data:')) {
        const mime = getMimeType(p.photoUrl);
        const ext = getExtension(mime);
        const filename = `${p.id}_profile.${ext}`;
        if (imagesFolder) imagesFolder.file(filename, getBase64Data(p.photoUrl), { base64: true });
        p.photoUrl = `images/${filename}`;
      } else if (p.photoUrl.startsWith('http')) {
        try {
          const blob = await googleMediaService.fetchFileAsBlob(p.photoUrl);
          const mime = blob.type;
          const ext = getExtension(mime);
          const filename = `${p.id}_profile.${ext}`;
          const base64 = await blobToBase64(blob);
          if (imagesFolder) imagesFolder.file(filename, getBase64Data(base64), { base64: true });
          p.photoUrl = `images/${filename}`;
        } catch (error) {
          console.warn(`Failed to embed Drive photo for ${p.id}: ${String(error)}`);
          p.photoUrl = '';
        }
      }
    }

    // 2. Process Gallery
    if (p.gallery && Array.isArray(p.gallery)) {
      const newGallery: string[] = [];
      for (const item of p.gallery) {
        const imgStr = getGalleryImageUrl(item);
        if (!imgStr) continue;
        if (imgStr.startsWith('data:')) {
          const mime = getMimeType(imgStr);
          const ext = getExtension(mime);
          const filename = `${p.id}_gallery_${newGallery.length}.${ext}`;
          if (imagesFolder) imagesFolder.file(filename, getBase64Data(imgStr), { base64: true });
          newGallery.push(`images/${filename}`);
        } else if (imgStr.startsWith('http')) {
          try {
            const blob = await googleMediaService.fetchFileAsBlob(imgStr);
            const mime = blob.type;
            const ext = getExtension(mime);
            const filename = `${p.id}_gallery_${newGallery.length}.${ext}`;
            const base64 = await blobToBase64(blob);
            if (imagesFolder) imagesFolder.file(filename, getBase64Data(base64), { base64: true });
            newGallery.push(`images/${filename}`);
          } catch (error) {
            console.warn(`Failed to embed Drive gallery item for ${p.id}: ${String(error)}`);
          }
        }
      }
      p.gallery = newGallery;
    }

    // 3. Process Voice Notes
    if (p.voiceNotes && Array.isArray(p.voiceNotes)) {
      const newVoiceNotes: string[] = [];
      for (const audioStr of p.voiceNotes) {
        if (audioStr.startsWith('data:')) {
          const mime = getMimeType(audioStr);
          const ext = getExtension(mime);
          const filename = `${p.id}_voice_${newVoiceNotes.length}.${ext}`;
          if (audioFolder) audioFolder.file(filename, getBase64Data(audioStr), { base64: true });
          newVoiceNotes.push(`audio/${filename}`);
        } else if (audioStr.startsWith('http')) {
          try {
            const blob = await googleMediaService.fetchFileAsBlob(audioStr);
            const mime = blob.type;
            const ext = getExtension(mime);
            const filename = `${p.id}_voice_${newVoiceNotes.length}.${ext}`;
            const base64 = await blobToBase64(blob);
            if (audioFolder) audioFolder.file(filename, getBase64Data(base64), { base64: true });
            newVoiceNotes.push(`audio/${filename}`);
          } catch (error) {
            console.warn(`Failed to embed Drive voice note for ${p.id}: ${String(error)}`);
          }
        }
      }
      p.voiceNotes = newVoiceNotes;
    }
  }

  zip.file('family_data.json', JSON.stringify({
    people: peopleToStore,
    settings: fullState?.settings || {},
    layout: fullState?.layout || {},
    theme: fullState?.theme || {},
    metadata: {
      exportedAt: new Date().toISOString(),
      version: '1.1.0'
    }
  }, null, 2));

  // Add the offline viewer
  zip.file('index.html', OFFLINE_VIEWER_HTML);
  const content = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
  return content;
};

export interface JozorArchiveData {
  people: Record<string, Person>;
  settings?: Record<string, unknown>;
}

export const importJozorArchiveData = async (file: File): Promise<JozorArchiveData> => {
  const zip = await JSZip.loadAsync(file);

  let jsonFile = zip.file('family_data.json');

  if (!jsonFile) {
    const foundFiles = zip.file(/family_data\.json$/i);
    if (foundFiles.length > 0) {
      jsonFile = foundFiles[0];
    }
  }

  if (!jsonFile) {
    const { restoreBlueprintArchive } = await import('../services/archiveRestoreService');
    const restored = await restoreBlueprintArchive(file);
    return {
      people: restored.state.people,
      settings: restored.state.settings as Record<string, unknown>,
    };
  }

  const jsonContent = await jsonFile.async('string');
  const parsed = JSON.parse(jsonContent);
  const rawPeople = parsed && typeof parsed === 'object' && 'people' in parsed
    ? (parsed as { people?: unknown }).people
    : parsed;
  const settings = parsed && typeof parsed === 'object' && 'settings' in parsed && typeof (parsed as { settings?: unknown }).settings === 'object'
    ? (parsed as { settings?: Record<string, unknown> }).settings
    : undefined;

  if (!rawPeople || typeof rawPeople !== 'object' || Array.isArray(rawPeople)) {
    throw new Error('Invalid Jozor file: people data not found');
  }

  const people: Record<string, Person> = {};

  // Build the lookup maps once to optimize performance
  const filesMap = new Map<string, JSZip.JSZipObject>();
  const folderMaps = {
    images: new Map<string, JSZip.JSZipObject>(),
    audio: new Map<string, JSZip.JSZipObject>(),
  };

  zip.forEach((relativePath, zipEntry) => {
    filesMap.set(relativePath.toLowerCase(), zipEntry);
    const parts = relativePath.split('/');
    if (parts.length === 2) {
      const folder = parts[0];
      const filename = parts[1];
      if (folder === 'images') {
        folderMaps.images.set(filename.toLowerCase(), zipEntry);
      } else if (folder === 'audio') {
        folderMaps.audio.set(filename.toLowerCase(), zipEntry);
      }
    }
  });

  for (const key of Object.keys(rawPeople as Record<string, unknown>)) {
    const p = validatePerson((rawPeople as Record<string, Partial<Person>>)[key]);

    // 1. Rehydrate Profile Photo
    if (p.photoUrl && p.photoUrl.startsWith('images/')) {
      p.photoUrl = await findAndValidateMediaFile(zip, p.photoUrl, 'images', filesMap, folderMaps);
    }

    // 2. Rehydrate Gallery
    if (p.gallery && Array.isArray(p.gallery)) {
      p.gallery = await Promise.all(
        p.gallery.map(async (item: string | GalleryItem) => {
          const imgPath = typeof item === 'string' ? item : item.path;
          if (imgPath && imgPath.startsWith('images/')) {
            return await findAndValidateMediaFile(zip, imgPath, 'images', filesMap, folderMaps);
          }
          return imgPath || '';
        })
      );
    }

    // 3. Rehydrate Voice Notes
    if (p.voiceNotes && Array.isArray(p.voiceNotes)) {
      p.voiceNotes = await Promise.all(
        p.voiceNotes.map(async (audioPath: string) => {
          if (audioPath.startsWith('audio/')) {
            return await findAndValidateMediaFile(zip, audioPath, 'audio', filesMap, folderMaps);
          }
          return audioPath;
        })
      );
    }

    people[key] = p;
  }

  return { people, settings };
};

export const importFromJozorArchive = async (file: File): Promise<Record<string, Person>> => {
  const data = await importJozorArchiveData(file);
  return data.people;
};
