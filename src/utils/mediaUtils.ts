import { Person } from '../types';
import { supabaseUrl } from '../services/supabaseConfig';

interface GalleryImageItem {
    url?: string;
    path?: string;
    version?: number;
}

/**
 * Generates the correct photo URL for a person based on the path-based media fields.
 */
export const getPersonPhoto = (person: Partial<Person> | null | undefined): string | null => {
    if (!person) return null;

    const path = person.photoPath;
    const version = person.photoVersion;

    if (path) {
        // Clean path to prevent double "avatars/" prefix
        const cleanPath = path.startsWith('avatars/') ? path.replace('avatars/', '') : path;
        const baseUrl = `${supabaseUrl}/storage/v1/object/public/avatars/${cleanPath}`;
        return version ? `${baseUrl}?v=${version}` : baseUrl;
    }

    // Fallback to direct public URLs when the row does not yet have a storage path.
    return person.photoUrl || null;
};

/**
 * Resolves a gallery image URL.
 * Supports direct string URLs and GalleryItem objects.
 */
export const getGalleryImageUrl = (item: string | GalleryImageItem | null | undefined): string | null => {
    if (!item) return null;

    if (typeof item === 'string') return item;

    if (typeof item.url === 'string' && item.url.trim()) return item.url;

    // If it's the new GalleryItem object
    if (typeof item.path === 'string' && item.path.trim()) {
        const cleanPath = item.path.startsWith('avatars/') ? item.path.replace('avatars/', '') : item.path;
        const baseUrl = `${supabaseUrl}/storage/v1/object/public/avatars/${cleanPath}`;
        return item.version ? `${baseUrl}?v=${item.version}` : baseUrl;
    }

    return null;
};
