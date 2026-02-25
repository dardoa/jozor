import JSZip from 'jszip';
import { Person } from '../types';
import { validatePerson } from './familyLogic';
import { fetchDriveFileAsBlob } from '../services/googleService';
import { OFFLINE_VIEWER_HTML } from './archiveTemplates';

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

// New helper for secure file lookup within the zip
const findAndValidateMediaFile = async (
  zip: JSZip,
  mediaPath: string,
  expectedFolder: string
): Promise<string> => {
  // --- SECURITY VALIDATION ---
  // 1. Check for absolute paths or path traversal attempts
  //    - Starts with '/' (absolute path)
  //    - Contains '..' (path traversal)
  //    - Path length limit (DoS mitigation)
  if (mediaPath.startsWith('/') || mediaPath.includes('../') || mediaPath.length > 255) {
    console.warn(
      `Security alert: Invalid or suspicious media path detected: '${mediaPath}'. Skipping.`
    );
    return mediaPath; // Return original path, effectively skipping processing
  }
  // 2. Ensure it starts with the expected folder prefix
  if (!mediaPath.startsWith(`${expectedFolder}/`)) {
    console.warn(
      `Security alert: Media path '${mediaPath}' does not start with expected folder '${expectedFolder}'. Skipping.`
    );
    return mediaPath;
  }
  // --- END SECURITY VALIDATION ---

  let mediaFile = zip.file(mediaPath);
  if (!mediaFile) {
    // If direct path fails, try finding by filename alone within the expected folder.
    // This regex search is already somewhat safe as it anchors to the folder.
    const fileName = mediaPath.split('/').pop();
    if (fileName) {
      // Escape special characters in fileName for regex
      const escapedFileName = fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const matches = zip.file(new RegExp(`^${expectedFolder}/${escapedFileName}$`));
      if (matches.length > 0) mediaFile = matches[0];
    }
  }

  if (mediaFile) {
    const base64 = await mediaFile.async('base64');
    const ext = mediaPath.split('.').pop();
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
  fullState?: any
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
          const blob = await fetchDriveFileAsBlob(p.photoUrl);
          const mime = blob.type;
          const ext = getExtension(mime);
          const filename = `${p.id}_profile.${ext}`;
          const base64 = await blobToBase64(blob);
          if (imagesFolder) imagesFolder.file(filename, getBase64Data(base64), { base64: true });
          p.photoUrl = `images/${filename}`;
        } catch (e) {
          console.warn(`Failed to embed Drive photo for ${p.id}: ${e}`);
          p.photoUrl = '';
        }
      }
    }

    // 2. Process Gallery
    if (p.gallery && Array.isArray(p.gallery)) {
      const newGallery: string[] = [];
      for (const imgStr of p.gallery) {
        if (imgStr.startsWith('data:')) {
          const mime = getMimeType(imgStr);
          const ext = getExtension(mime);
          const filename = `${p.id}_gallery_${newGallery.length}.${ext}`;
          if (imagesFolder) imagesFolder.file(filename, getBase64Data(imgStr), { base64: true });
          newGallery.push(`images/${filename}`);
        } else if (imgStr.startsWith('http')) {
          try {
            const blob = await fetchDriveFileAsBlob(imgStr);
            const mime = blob.type;
            const ext = getExtension(mime);
            const filename = `${p.id}_gallery_${newGallery.length}.${ext}`;
            const base64 = await blobToBase64(blob);
            if (imagesFolder) imagesFolder.file(filename, getBase64Data(base64), { base64: true });
            newGallery.push(`images/${filename}`);
          } catch (e) {
            console.warn(`Failed to embed Drive gallery item for ${p.id}: ${e}`);
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
            const blob = await fetchDriveFileAsBlob(audioStr);
            const mime = blob.type;
            const ext = getExtension(mime);
            const filename = `${p.id}_voice_${newVoiceNotes.length}.${ext}`;
            const base64 = await blobToBase64(blob);
            if (audioFolder) audioFolder.file(filename, getBase64Data(base64), { base64: true });
            newVoiceNotes.push(`audio/${filename}`);
          } catch (e) {
            console.warn(`Failed to embed Drive voice note for ${p.id}: ${e}`);
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

export const importFromJozorArchive = async (file: File): Promise<Record<string, Person>> => {
  const zip = await JSZip.loadAsync(file);

  let jsonFile = zip.file('family_data.json');

  if (!jsonFile) {
    const foundFiles = zip.file(/family_data\.json$/i);
    if (foundFiles.length > 0) {
      jsonFile = foundFiles[0];
    }
  }

  if (!jsonFile) {
    throw new Error('Invalid Jozor file: family_data.json not found');
  }

  const jsonContent = await jsonFile.async('string');
  const rawPeople = JSON.parse(jsonContent);
  const people: Record<string, Person> = {};

  for (const key of Object.keys(rawPeople)) {
    const p = validatePerson(rawPeople[key]);

    // 1. Rehydrate Profile Photo
    if (p.photoUrl && p.photoUrl.startsWith('images/')) {
      p.photoUrl = await findAndValidateMediaFile(zip, p.photoUrl, 'images');
    }

    // 2. Rehydrate Gallery
    if (p.gallery && Array.isArray(p.gallery)) {
      p.gallery = await Promise.all(
        p.gallery.map(async (imgPath: string) => {
          if (imgPath.startsWith('images/')) {
            return await findAndValidateMediaFile(zip, imgPath, 'images');
          }
          return imgPath;
        })
      );
    }

    // 3. Rehydrate Voice Notes
    if (p.voiceNotes && Array.isArray(p.voiceNotes)) {
      p.voiceNotes = await Promise.all(
        p.voiceNotes.map(async (audioPath: string) => {
          if (audioPath.startsWith('audio/')) {
            return await findAndValidateMediaFile(zip, audioPath, 'audio');
          }
          return audioPath;
        })
      );
    }

    people[key] = p;
  }

  return people;
};
