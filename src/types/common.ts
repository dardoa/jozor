export type Gender = 'male' | 'female';
export type RelationshipStatus = 'married' | 'divorced' | 'engaged' | 'separated';
export type Language = 'en' | 'ar';
export type ChartType = 'focus' | 'radial';
export type AppTheme = 'modern' | 'vintage' | 'blueprint' | 'dark';
export type SyncState = 'checking' | 'synced' | 'saving' | 'error' | 'offline';

export interface UserProfile {
    uid: string;
    displayName: string;
    email: string;
    photoURL: string;
    photoPath?: string;
    photoVersion?: number;
    supabaseToken?: string;
    metadata?: {
        has_completed_tour?: boolean;
        [key: string]: unknown;
    };
}

export type NotificationType = 'birthday' | 'integrity' | 'info' | 'invitation';

export type NotificationSource =
    | 'heritage'
    | 'integrity'
    | 'invitation-realtime'
    | 'invitation-hydration'
    | 'owner-realtime'
    | 'activity-log'
    | 'tree-realtime'
    | 'system';

export interface AppNotification {
    id: string;
    type: NotificationType;
    source: NotificationSource;
    title: string;
    body: string;
    dedupeKey?: string;
    actionable?: boolean;
    createdAt: string;
    updatedAt: string;
    expiresAt?: string;
    personId?: string;
    invitationId?: string;
    invitationTreeId?: string;
    invitationOwnerUid?: string;
    invitationRole?: 'editor' | 'viewer';
    invitationStatus?: 'pending' | 'accepted' | 'revoked' | 'expired' | 'declined';
    timestamp: number;
    read: boolean;
}

export interface SyncStatus {
    state: SyncState;
    lastSyncTime: Date | null;
    lastSyncSupabase: Date | null;
    lastSyncDrive: Date | null;
    supabaseStatus: 'idle' | 'syncing' | 'error';
    driveStatus: 'idle' | 'uploading' | 'error';
    errorMessage?: string;
    pendingCount: number;
    lastErrorCategory?: string;
    lastErrorAt?: Date | null;
    lastErrorRetryable?: boolean;
    syncBlockedByPlan?: boolean;
}

export interface InvitationTelemetry {
    lastHydratedAt: Date | null;
    lastHydrationCount: number;
    lastHydrationAddedCount: number;
    lastHydrationRemovedCount: number;
    lastEventAt: Date | null;
    lastEventSource: 'none' | 'my-realtime' | 'owned-realtime' | 'activity-log';
    lastEventStatus?: string;
    lastEventInvitationId?: string;
    lastIgnoredAt: Date | null;
    lastIgnoredSource: 'none' | 'my-realtime' | 'owned-realtime';
    lastIgnoredStatus?: string;
    lastOwnerEventAt: Date | null;
    lastOwnerEventStatus?: string;
    lastOwnerEventEmail?: string;
    lastOwnerEventRole?: string;
    lastOwnerEventInvitationId?: string;
    lastErrorAt: Date | null;
    lastErrorMessage?: string;
}

export interface NotificationTelemetry {
    lastEventAt: Date | null;
    lastEventType: 'none' | 'birthday' | 'integrity';
    lastEventSource: 'none' | 'heritage' | 'integrity';
    lastEventPersonId?: string;
    lastEventDedupKey?: string;
    lastIntegrityCount?: number;
    lastBirthdayName?: string;
    lastSkippedAt: Date | null;
    lastSkippedSource: 'none' | 'heritage' | 'integrity';
    lastSkippedReason?: string;
}

export type ModalType =
    | 'calculator'
    | 'stats'
    | 'consistency'
    | 'timeline'
    | 'geographicJourney'
    | 'share'
    | 'login'
    | 'globalSettings'
    | 'migrationMap'
    | 'paywall'
    | 'chat'
    | 'link'
    | 'cleanTreeOptions'
    | 'googleSyncChoice'
    | 'sharedTreePrompt';

export type ModalRouteType = ModalType | 'map';

export type SmartPersonaTabId = 'about' | 'links' | 'media';

export type ExportType = 'jozor' | 'json' | 'gedcom' | 'ics' | 'print' | 'png' | 'pdf' | 'svg' | 'jpeg';

export type GeographicJourneyMode = 'events' | 'migration';
