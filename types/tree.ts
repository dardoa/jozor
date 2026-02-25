import { ChartType, AppTheme } from './common';

export interface TreeSettings {
    showPhotos: boolean;
    showDates: boolean;
    showBirthplaces?: boolean;
    showMiddleName: boolean;
    showLastName: boolean;
    showMinimap: boolean;
    layoutMode: 'vertical' | 'horizontal' | 'radial';
    isCompact: boolean;
    chartType: ChartType;
    theme: AppTheme;
    enableForcePhysics?: boolean;
    enableTimeOffset?: boolean;
    timeScaleFactor?: number;
    lineStyle?: 'curved' | 'straight';
    // Layout Settings
    nodeSpacingX: number;
    nodeSpacingY: number;
    dateFormat?: 'iso' | 'eu' | 'us' | 'long';
    isRtl?: boolean;
}

export interface DriveFile {
    id: string;
    name: string;
    modifiedTime: string; // ISO string
}

export interface Tree {
    id: string;
    name: string;
    owner_id: string;
    focus_id: string | null;
    settings: TreeSettings;
    created_at?: string;
    updated_at?: string;
}

export interface Collaborator {
    email: string;
    role: 'owner' | 'editor' | 'viewer';
    status: 'active' | 'pending';
    avatar?: string;
}
