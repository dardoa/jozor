import type { Gender, RelationshipStatus } from './common';

export interface RelationshipInfo {
    type: RelationshipStatus;
    startDate: string;
    startPlace?: string;
    endDate?: string;
    endPlace?: string;
}

export interface GalleryItem {
    id: string;
    path: string;
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

    profession: string;
    company: string;
    interests: string;
    bio: string;
    photoUrl?: string;
    photoPath?: string;
    photoVersion?: number;
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
