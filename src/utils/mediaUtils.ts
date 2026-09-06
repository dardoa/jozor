import { Person } from '../types';
import type { GalleryItem, PersonMediaAssetRef } from '../types';
import { isPersonMediaAssetRef } from '../types';
import { supabaseUrl } from '../services/supabaseConfig';
import { getLegacyPersonMediaUrl } from './legacyPersonMediaUrl';

interface GalleryImageItem {
    asset?: PersonMediaAssetRef;
    url?: string;
    path?: string;
    version?: number;
}

/**
 * Generates the correct photo URL for a person based on the path-based media fields.
 */
export const getPersonPhoto = (person: Partial<Person> | null | undefined): string | null => {
    if (!person) return null;

    // Canonical private assets must only be resolved through the authenticated
    // person-media boundary. Never synthesize a public URL for them.
    if (isPersonMediaAssetRef(person.photoAsset)) return null;

    const path = person.photoPath;
    const version = person.photoVersion;

    if (path) {
        // Clean path to prevent double "avatars/" prefix
        const cleanPath = path.startsWith('avatars/') ? path.replace('avatars/', '') : path;
        const baseUrl = `${supabaseUrl}/storage/v1/object/public/avatars/${cleanPath}`;
        return getLegacyPersonMediaUrl(version ? `${baseUrl}?v=${version}` : baseUrl);
    }

    // Fallback to direct public URLs when the row does not yet have a storage path.
    return getLegacyPersonMediaUrl(person.photoUrl);
};

export const getPersonPhotoAsset = (
    person: Partial<Person> | null | undefined
): PersonMediaAssetRef | null => (
    isPersonMediaAssetRef(person?.photoAsset) ? person.photoAsset : null
);

export const hasPersonPhoto = (person: Partial<Person> | null | undefined): boolean =>
    Boolean(getPersonPhotoAsset(person) || getPersonPhoto(person));

/**
 * Resolves a gallery image URL.
 * Supports direct string URLs and GalleryItem objects.
 */
export const getGalleryImageUrl = (item: string | GalleryImageItem | null | undefined): string | null => {
    if (!item) return null;

    if (typeof item === 'string') return getLegacyPersonMediaUrl(item);

    if (isPersonMediaAssetRef(item.asset)) return null;

    if (typeof item.url === 'string' && item.url.trim()) return getLegacyPersonMediaUrl(item.url);

    // If it's the new GalleryItem object
    if (typeof item.path === 'string' && item.path.trim()) {
        const cleanPath = item.path.startsWith('avatars/') ? item.path.replace('avatars/', '') : item.path;
        const baseUrl = `${supabaseUrl}/storage/v1/object/public/avatars/${cleanPath}`;
        return getLegacyPersonMediaUrl(item.version ? `${baseUrl}?v=${item.version}` : baseUrl);
    }

    return null;
};

export const getGalleryImageAsset = (
    item: string | GalleryImageItem | GalleryItem | null | undefined
): PersonMediaAssetRef | null => {
    if (!item || typeof item === 'string') return null;
    return isPersonMediaAssetRef(item.asset) ? item.asset : null;
};
