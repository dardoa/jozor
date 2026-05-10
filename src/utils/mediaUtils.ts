import { Person } from '../types';
import { supabaseUrl } from '../services/supabaseConfig';

/**
 * Generates the correct photo URL for a person based on the new path-based 
 * architecture with backward compatibility for legacy URL strings.
 */
export const getPersonPhoto = (person: Partial<Person> | null | undefined): string | null => {
    if (!person) return null;

    // 1. Prefer the new path-based system for deterministic caching
    const path = person.photoPath || (person as any).photo_path;
    const version = person.photoVersion || (person as any).photo_version;

    if (path) {
        // Clean path to prevent double "avatars/" prefix
        const cleanPath = path.startsWith('avatars/') ? path.replace('avatars/', '') : path;
        const baseUrl = `${supabaseUrl}/storage/v1/object/public/avatars/${cleanPath}`;
        return version ? `${baseUrl}?v=${version}` : baseUrl;
    }

    // 2. Fallback to existing photoUrl or avatarUrl if available
    return person.photoUrl || (person as any).avatarUrl || null;
};

/**
 * Resolves a gallery image URL.
 * Supports both legacy string URLs and new GalleryItem objects.
 */
export const getGalleryImageUrl = (item: any): string | null => {
    if (!item) return null;

    // If it's a legacy string URL
    if (typeof item === 'string') return item;

    // If it's the new GalleryItem object
    if (item.path) {
        const cleanPath = item.path.startsWith('avatars/') ? item.path.replace('avatars/', '') : item.path;
        const baseUrl = `${supabaseUrl}/storage/v1/object/public/avatars/${cleanPath}`;
        return item.version ? `${baseUrl}?v=${item.version}` : baseUrl;
    }

    return null;
};
