
import JSZip from 'jszip';
import { Person } from '../types';
import { validatePerson } from './familyLogic';

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
    return 'bin';
};

export const exportToJozorArchive = async (people: Record<string, Person>): Promise<Blob> => {
    const zip = new JSZip();
    const imagesFolder = zip.folder("images");
    
    // Create a deep copy to modify for storage without affecting app state
    const peopleToStore = JSON.parse(JSON.stringify(people));

    Object.keys(peopleToStore).forEach(key => {
        const p = peopleToStore[key];

        // 1. Process Profile Photo
        if (p.photoUrl && p.photoUrl.startsWith('data:')) {
            const mime = getMimeType(p.photoUrl);
            const ext = getExtension(mime);
            const filename = `${p.id}_profile.${ext}`;
            
            if (imagesFolder) {
                imagesFolder.file(filename, getBase64Data(p.photoUrl), { base64: true });
            }
            // Replace Data URI with relative path reference
            p.photoUrl = `images/${filename}`;
        }

        // 2. Process Gallery
        if (p.gallery && Array.isArray(p.gallery)) {
            p.gallery = p.gallery.map((imgStr: string, index: number) => {
                if (imgStr.startsWith('data:')) {
                    const mime = getMimeType(imgStr);
                    const ext = getExtension(mime);
                    const filename = `${p.id}_gallery_${index}.${ext}`;
                    
                    if (imagesFolder) {
                        imagesFolder.file(filename, getBase64Data(imgStr), { base64: true });
                    }
                    return `images/${filename}`;
                }
                return imgStr;
            });
        }
    });

    // Add JSON data
    zip.file("family_data.json", JSON.stringify(peopleToStore, null, 2));

    // Generate Zip with explicit compression to ensure compatibility
    const content = await zip.generateAsync({ 
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 }
    });
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
        const findImageFile = (path: string) => {
             let img = zip.file(path);
             if (!img) {
                 // Try finding by filename alone if full path fails
                 const fileName = path.split('/').pop();
                 if (fileName) {
                    const matches = zip.file(new RegExp(`${fileName.replace('.', '\\.')}$`));
                    if (matches.length > 0) img = matches[0];
                 }
             }
             return img;
        };

        // 1. Rehydrate Profile Photo
        if (p.photoUrl && !p.photoUrl.startsWith('data:') && !p.photoUrl.startsWith('http')) {
            const imgFile = findImageFile(p.photoUrl);
            if (imgFile) {
                const base64 = await imgFile.async("base64");
                const ext = p.photoUrl.split('.').pop();
                const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
                p.photoUrl = `data:${mime};base64,${base64}`;
            }
        }

        // 2. Rehydrate Gallery
        if (p.gallery && Array.isArray(p.gallery)) {
            const newGallery: string[] = [];
            for (const imgPath of p.gallery) {
                if (typeof imgPath === 'string' && !imgPath.startsWith('data:') && !imgPath.startsWith('http')) {
                    const imgFile = findImageFile(imgPath);
                    if (imgFile) {
                        const base64 = await imgFile.async("base64");
                        const ext = imgPath.split('.').pop();
                        const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
                        newGallery.push(`data:${mime};base64,${base64}`);
                    } else {
                        newGallery.push(imgPath); // Keep original path if file not found
                    }
                } else {
                    newGallery.push(imgPath);
                }
            }
            p.gallery = newGallery;
        }

        people[key] = p;
    }

    return people;
};
