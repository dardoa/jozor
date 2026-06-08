import type { AppTheme, ChartType } from './common';

export interface TreeSettings {
    showPhotos: boolean;
    showFirstName: boolean;
    showDates: boolean;
    showBirthDate: boolean;
    showMarriageDate: boolean;
    showDeathDate: boolean;
    showBirthPlace: boolean;
    showMarriagePlace: boolean;
    showBurialPlace: boolean;
    showResidence: boolean;
    showMiddleName: boolean;
    showLastName: boolean;
    showNickname: boolean;
    layoutMode: 'vertical' | 'horizontal' | 'radial';
    isCompact: boolean;
    chartType: ChartType;
    theme: AppTheme;
    lineStyle?: 'curved' | 'step';
    lineThickness?: number;
    showDeceased: boolean;
    showGender?: boolean;
    showOccupation?: boolean;
    showSuffix?: boolean;
    showPrefix?: boolean;
    showMaidenName?: boolean;
    highlightBranch: boolean;
    highlightedBranchRootId?: string | null;
    nodeSpacingX: number;
    nodeSpacingY: number;
    nodeWidth: number;
    textSize: number;
    themeColor: string;
    boxColorLogic: 'gender' | 'lineage' | 'none';
    generationLimit: number;
    dateFormat?: 'iso' | 'eu' | 'us' | 'long';
    isRtl?: boolean;
    privacyMode?: boolean;
    isLowGraphicsMode?: boolean;
    enableForcePhysics?: boolean;
    enableTimeOffset?: boolean;
    sync_metadata?: {
        lastUpdated?: Record<string, string>;
        lastUpdatedOps?: Record<string, { client_id: string; client_version: number }>;
    };
}

export interface DriveFile {
    id: string;
    name: string;
    modifiedTime: string;
}

export interface Collaborator {
    email: string;
    role: 'owner' | 'editor' | 'viewer';
    status: 'active' | 'pending';
    avatar?: string;
}

export type LocationStatus = 'resolved' | 'failed' | 'pending';

export interface LocationData {
    lat?: number;
    lng?: number;
    resolvedName?: string;
    status: LocationStatus;
    lastChecked?: number;
}

export interface Message {
    role: 'user' | 'model';
    text: string;
}

export interface BackupManifest {
    version: number;
    metadata: {
        createdAt: string;
        label: string;
        appVersion: string;
        personCount: number;
        photoCount: number;
    };
    treeFile: 'tree.json';
    media: {
        avatars: Record<string, string>;
        gallery: Record<string, string[]>;
    };
}

export interface Tree {
    id: string;
    name: string;
    ownerId: string;
    createdAt: string;
    updatedAt: string;
}

export interface TreeDiscussionMessage {
    id: string;
    treeId: string;
    userId: string;
    userEmail: string;
    content: string;
    replyToEventId?: string;
    replyToMessageId?: string;
    replyToUserName?: string;
    replyToContent?: string;
    createdAt: string;
}
