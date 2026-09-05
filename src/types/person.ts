import type { Gender, RelationshipStatus } from './common';
import type { PersonMediaAssetRef } from './personMedia';

export interface RelationshipInfo {
    type: RelationshipStatus;
    startDate: string;
    startPlace?: string;
    endDate?: string;
    endPlace?: string;
}

export interface GalleryItem {
    id: string;
    /** Canonical private asset. Legacy path/url fields remain read-only fallbacks. */
    asset?: PersonMediaAssetRef;
    path?: string;
    /** Transitional direct URL retained when a legacy string item gains metadata. */
    url?: string;
    version: number;
    caption?: string;
    createdAt: string;
}

export interface Person {
    id: string;
    title: string;
    firstName: string;
    middleName: string;
    lastName: string;
    birthName: string;
    nickName: string;
    suffix: string;
    gender: Gender;

    birthDate: string;
    birthPlace: string;
    birthSource: string;
    marriageDate?: string;
    marriagePlace?: string;
    deathDate: string;
    deathPlace: string;
    deathSource: string;
    burialPlace: string;
    residence: string;
    isDeceased: boolean;

    currentResidence?: string;
    occupation?: string;
    workplace?: string;

    profession: string;
    company: string;
    interests: string;
    bio: string;
    photoUrl?: string;
    photoPath?: string;
    photoVersion?: number;
    /** `null` is the explicit synchronized removal value; `undefined` means absent locally. */
    photoAsset?: PersonMediaAssetRef | null;
    gallery: (string | GalleryItem)[];
    voiceNotes: string[];
    sources: { id: string; title: string; url?: string; date?: string; type?: string }[];
    events: {
        id: string;
        title: string;
        date: string;
        place?: string;
        description?: string;
        type?: string;
    }[];

    email: string;
    website: string;
    blog: string;
    address: string;

    parents: string[];
    spouses: string[];
    children: string[];

    partnerDetails?: Record<string, RelationshipInfo>;
    isPrivate?: boolean;
    metadata?: {
        lastUpdated?: Record<string, string>;
        lastUpdatedOps?: Record<string, { client_id: string; client_version: number }>;
        [key: string]: unknown;
    };
}

export interface FamilyData {
    people: Record<string, Person>;
    rootId: string;
}

export interface TimelineEvent {
    year: number;
    dateStr: string;
    type: 'birth' | 'death' | 'marriage' | 'custom';
    personId: string;
    relatedId?: string;
    label: string;
    subLabel?: string;
}
