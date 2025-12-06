import JSZip from 'jszip';
import { Person } from '../types';
import { validatePerson } from './familyLogic';
import { fetchDriveFileAsBlob } from '../services/googleService'; // Import new helper

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
    if (mime === 'audio/webm') return 'webm'; // Added webm
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

export const exportToJozorArchive = async (people: Record<string, Person>): Promise<Blob> => {
    const zip = new JSZip();
    const imagesFolder = zip.folder("images");
    const audioFolder = zip.folder("audio"); // New folder for audio
    
    // Create a deep copy to modify for storage without affecting app state
    const peopleToStore = JSON.parse(JSON.stringify(people));

    for (const key of Object.keys(peopleToStore)) { // Use for...of for async operations
        const p = peopleToStore[key];

        // 1. Process Profile Photo
        if (p.photoUrl) {
            if (p.photoUrl.startsWith('data:')) {
                const mime = getMimeType(p.photoUrl);
                const ext = getExtension(mime);
                const filename = `${p.id}_profile.${ext}`;
                if (imagesFolder) imagesFolder.file(filename, getBase64Data(p.photoUrl), { base64: true });
                p.photoUrl = `images/${filename}`;
            } else if (p.photoUrl.startsWith('http')) { // Assume it's a Drive URL
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
                    p.photoUrl = ''; // Clear if failed to embed
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
                } else if (imgStr.startsWith('http')) { // Assume it's a Drive URL
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
                        // newGallery.push(imgStr); // Keep URL if failed to embed, or remove? Let's remove for self-contained.
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
                    const ext = getExtension(mime); // Will be 'bin' or 'webm'
                    const filename = `${p.id}_voice_${newVoiceNotes.length}.${ext}`;
                    if (audioFolder) audioFolder.file(filename, getBase64Data(audioStr), { base64: true });
                    newVoiceNotes.push(`audio/${filename}`);
                } else if (audioStr.startsWith('http')) { // Assume it's a Drive URL
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

    zip.file("family_data.json", JSON.stringify(peopleToStore, null, 2));
    const content = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
    return content;
};

export const importFromJozorArchive = async (file: File): Promise<Record<string, Person>> => {
    const zip = await JSZip.loadAsync(file);
    
    // Robust search for family_data.json
    let jsonFile = zip.file("family_data.json");
    
    // If not found at root, search recursively (case-insensitive)
    if (!jsonFile) {
        const foundFiles = zip.file(/family_data\.json$/i);
        if (foundFiles.length > 0) {
            jsonFile = foundFiles[0];
        }
    }

    if (!jsonFile) {
        throw new Error("Invalid Jozor file: family_data.json not found");
    }

    const jsonContent = await jsonFile.async("string");
    const rawPeople = JSON.parse(jsonContent);
    const people: Record<string, Person> = {};

    // Rehydrate images (Convert paths back to Data URIs for local usage)
    for (const key of Object.keys(rawPeople)) {
        const p = validatePerson(rawPeople[key]);

        // Helper to find image file in zip even if path structure varies
        const findMediaFile = async (path: string, folder: string) => {
             let mediaFile = zip.file(path);
             if (!mediaFile) {
                 // Try finding by filename alone if full path fails
                 const fileName = path.split('/').pop();
                 if (fileName) {
                    const matches = zip.file(new RegExp(`${folder}/${fileName.replace('.', '\\.')}$`));
                    if (matches.length > 0) mediaFile = matches[0];
                 }
             }
             if (mediaFile) {
                const base64 = await mediaFile.async("base64");
                const ext = path.split('.').pop();
                const mime = ext === 'png' ? 'image/png' : ext === 'jpg' ? 'image/jpeg' : ext === 'jpeg' ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : 'audio/webm'; // Default to webm for audio
                return `data:${mime};base64,${base64}`;
             }
             return path; // Return original path if not found
        };

        // 1. Rehydrate Profile Photo
        if (p.photoUrl && p.photoUrl.startsWith('images/')) {
            p.photoUrl = await findMediaFile(p.photoUrl, 'images');
        }

        // 2. Rehydrate Gallery
        if (p.gallery && Array.isArray(p.gallery)) {
            p.gallery = await Promise.all(p.gallery.map(async (imgPath: string) => {
                if (imgPath.startsWith('images/')) {
                    return await findMediaFile(imgPath, 'images');
                }
                return imgPath;
            }));
        }

        // 3. Rehydrate Voice Notes
        if (p.voiceNotes && Array.isArray(p.voiceNotes)) {
            p.voiceNotes = await Promise.all(p.voiceNotes.map(async (audioPath: string) => {
                if (audioPath.startsWith('audio/')) {
                    return await findMediaFile(audioPath, 'audio');
                }
                return audioPath;
            }));
        }

        people[key] = p;
    }

    return people;
};