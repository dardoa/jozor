export type Gender = 'male' | 'female';
export type RelationshipStatus = 'married' | 'divorced' | 'engaged' | 'separated';
export type Language = 'en' | 'ar';
export type ChartType = 'descendant' | 'fan' | 'pedigree' | 'force';
export type AppTheme = 'modern' | 'vintage' | 'blueprint' | 'dark';
export type SyncState = 'synced' | 'saving' | 'error' | 'offline';

export interface SyncStatus {
    state: SyncState;
    lastSyncTime: Date | null;
    lastSyncSupabase: Date | null;
    lastSyncDrive: Date | null;
    supabaseStatus: 'idle' | 'syncing' | 'error';
    driveStatus: 'idle' | 'uploading' | 'error';
    errorMessage?: string;
}

export type ModalType =
    | 'calculator'
    | 'stats'
    | 'chat'
    | 'consistency'
    | 'timeline'
    | 'share'
    | 'story'
    | 'map'
    | 'layoutSettings'
    | 'login'
    | 'snapshotHistory'
    | 'adminHub'
    | 'globalSettings';

export type ExportType = 'jozor' | 'json' | 'gedcom' | 'ics' | 'print' | 'png' | 'pdf' | 'svg' | 'jpeg';

export interface UserProfile {
    uid: string;
    displayName: string;
    email: string;
    photoURL: string;
    metadata?: {
        has_completed_tour?: boolean;
        [key: string]: any;
    };
}
