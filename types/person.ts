import { Gender, RelationshipStatus } from './common';

export interface RelationshipInfo {
    type: RelationshipStatus;
    startDate: string;
    startPlace?: string;
    endDate?: string;
    endPlace?: string;
}

export interface Person {
    id: string;
    // Identity
    title: string;
    firstName: string;
    middleName: string;
    lastName: string;
    birthName: string;
    nickName: string;
    suffix: string;
    gender: Gender;

    // Vital Stats
    birthDate: string;
    birthPlace: string;
    birthSource: string;
    deathDate: string;
    deathPlace: string;
    deathSource: string;
    isDeceased: boolean;

    // Biographical
    profession: string;
    company: string;
    interests: string;
    bio: string;
    photoUrl?: string;
    gallery: string[];
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

    // Contact
    email: string;
    website: string;
    blog: string;
    address: string;

    // Relationships (stored as IDs)
    parents: string[];
    spouses: string[];
    children: string[];

    // Metadata for relationships (Keyed by Spouse ID)
    partnerDetails?: Record<string, RelationshipInfo>;

    // Privacy & Access
    isPrivate?: boolean;
}
