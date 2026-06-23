import { StateCreator } from 'zustand';
import { AppStore } from '../storeTypes';
import { InvitationTelemetry, NotificationTelemetry, UserProfile, SyncStatus } from '../../types';
import { googleAuthService } from '../../services/googleService';
import { clearSupabaseInstances } from '../../services/supabaseClient';
import { supabaseAuthService } from '../../services/supabaseAuthService';
import { updateUserTourStatus } from '../../services/supabaseProfileService';
import { storageService } from '../../services/storageService';

export interface AuthSlice {
    // State
    user: UserProfile | null;
    isDemoMode: boolean;
    currentActiveDriveFileId: string | null;
    currentTreeId: string | null;
    authLoading: boolean;
    authError: string | null;
    syncStatus: SyncStatus;
    invitationTelemetry: InvitationTelemetry;
    notificationTelemetry: NotificationTelemetry;
    supabaseAccessToken: string | null;
    currentUserRole: 'owner' | 'editor' | 'viewer' | null;
    isE2E?: boolean;
    driveSyncUiStatus: 'idle' | 'syncing' | 'success' | 'error';
    driveSyncUiMessage?: string;
    driveSyncUiError?: { code?: string; message: string };
    subscriptionTier: 'free' | 'pro' | 'family';
    aiCloudQuotaRemaining: number;

    // Actions
    setDriveSyncUiStatus: (status: 'idle' | 'syncing' | 'success' | 'error', message?: string, error?: { code?: string; message: string }) => void;
    setUser: (user: UserProfile | null) => void;
    setIsDemoMode: (demo: boolean) => void;
    setAuthLoading: (loading: boolean) => void;
    setAuthError: (error: string | null) => void;
    setSyncStatus: (status: SyncStatus) => void;
    updateInvitationTelemetry: (patch: Partial<InvitationTelemetry>) => void;
    updateNotificationTelemetry: (patch: Partial<NotificationTelemetry>) => void;
    setSupabaseAccessToken: (token: string | null) => void;
    setCurrentActiveDriveFileId: (fileId: string | null) => void;
    setCurrentTreeId: (treeId: string | null) => void;
    setCurrentUserRole: (role: 'owner' | 'editor' | 'viewer' | null) => void;
    setSubscriptionTier: (tier: 'free' | 'pro' | 'family') => void;
    setAiCloudQuotaRemaining: (quota: number) => void;
    login: (returnTo?: string) => Promise<void>;
    logout: () => Promise<void>;
    updateTourStatus: (hasCompleted: boolean) => Promise<void>;
}

export const createAuthSlice: StateCreator<AppStore, [["zustand/devtools", never]], [], AuthSlice> = (set, get) => ({
    // Initial State
    user: null,
    isDemoMode: false,
    currentActiveDriveFileId: null,
    currentTreeId: null,
    authLoading: true,
    authError: null,
    syncStatus: {
        state: 'checking',
        lastSyncTime: null,
        lastSyncSupabase: null,
        lastSyncDrive: null,
        supabaseStatus: 'idle',
        driveStatus: 'idle',
        pendingCount: 0,
        lastErrorAt: null,
    },
    invitationTelemetry: {
        lastHydratedAt: null,
        lastHydrationCount: 0,
        lastHydrationAddedCount: 0,
        lastHydrationRemovedCount: 0,
        lastEventAt: null,
        lastEventSource: 'none',
        lastEventStatus: undefined,
        lastEventInvitationId: undefined,
        lastIgnoredAt: null,
        lastIgnoredSource: 'none',
        lastIgnoredStatus: undefined,
        lastOwnerEventAt: null,
        lastOwnerEventStatus: undefined,
        lastOwnerEventEmail: undefined,
        lastOwnerEventRole: undefined,
        lastOwnerEventInvitationId: undefined,
        lastErrorAt: null,
        lastErrorMessage: undefined,
    },
    notificationTelemetry: {
        lastEventAt: null,
        lastEventType: 'none',
        lastEventSource: 'none',
        lastEventPersonId: undefined,
        lastEventDedupKey: undefined,
        lastIntegrityCount: undefined,
        lastBirthdayName: undefined,
        lastSkippedAt: null,
        lastSkippedSource: 'none',
        lastSkippedReason: undefined,
    },
    supabaseAccessToken: null,
    currentUserRole: null,
    isE2E: false,
    driveSyncUiStatus: 'idle',
    subscriptionTier: 'free',
    aiCloudQuotaRemaining: 0,

    // Actions
    setDriveSyncUiStatus: (status, message, error) => set({
        driveSyncUiStatus: status,
        driveSyncUiMessage: message,
        driveSyncUiError: error
    }),
    setUser: (user) => {
        set({
            user,
            notifications: user ? get().notifications : [],
        });
        get().hydrateNotificationsFromStorage(user?.uid);
    },
    setIsDemoMode: (demo) => set({ isDemoMode: demo }),
    setCurrentActiveDriveFileId: (fileId) => set({ currentActiveDriveFileId: fileId }),
    setCurrentTreeId: (treeId) => set({ currentTreeId: treeId }),
    setAuthLoading: (loading) => set({ authLoading: loading }),
    setAuthError: (error) => set({ authError: error }),
    setSyncStatus: (status) => set({ syncStatus: status }),
    updateInvitationTelemetry: (patch) =>
        set((state) => ({
            invitationTelemetry: {
                ...state.invitationTelemetry,
                ...patch,
            },
        })),
    updateNotificationTelemetry: (patch) =>
        set((state) => ({
            notificationTelemetry: {
                ...state.notificationTelemetry,
                ...patch,
            },
        })),
    setSupabaseAccessToken: (token) => set({ supabaseAccessToken: token }),
    setCurrentUserRole: (role) => {
        storageService?.setRole?.(role);
        set({ currentUserRole: role });
        if (role === 'viewer') {
            const currentPeople = get().people;
            if (currentPeople) {
                get().setPeople(currentPeople, false);
            }
            const activeTreeId = get().currentTreeId;
            if (activeTreeId) {
                void storageService?.clearActiveTreeCache?.(activeTreeId);
            }
        }
    },
    setSubscriptionTier: (tier) => set({ subscriptionTier: tier }),
    setAiCloudQuotaRemaining: (quota) => set({ aiCloudQuotaRemaining: quota }),
    updateTourStatus: async (hasCompleted: boolean) => {
        const { user } = get();
        if (!user) return;

        // Update local state
        set({
            user: {
                ...user,
                metadata: {
                    ...(user.metadata || {}),
                    has_completed_tour: hasCompleted,
                }
            }
        });

        // Persist to Supabase
        await updateUserTourStatus(user.uid, user.email, hasCompleted);
    },

    login: async (returnTo?: string) => {
        set({ authLoading: true, authError: null });
        try {
            await supabaseAuthService.startGoogleSignIn(returnTo);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Login failed';
            set({ authError: message, authLoading: false });
            throw error;
        }
    },

    logout: async () => {
        await supabaseAuthService.signOut();
        googleAuthService.logout();
        clearSupabaseInstances();
        storageService?.setRole?.(null);
        set({
            user: null,
            notifications: [],
            isDemoMode: false,
            driveSyncUiStatus: 'idle',
            currentActiveDriveFileId: null,
            currentTreeId: null,
            supabaseAccessToken: null,
            currentUserRole: null,
            syncStatus: {
                state: 'offline',
                lastSyncTime: null,
                lastSyncSupabase: null,
                lastSyncDrive: null,
                supabaseStatus: 'idle',
                driveStatus: 'idle',
                pendingCount: 0,
                lastErrorAt: null,
            },
            invitationTelemetry: {
                lastHydratedAt: null,
                lastHydrationCount: 0,
                lastHydrationAddedCount: 0,
                lastHydrationRemovedCount: 0,
                lastEventAt: null,
                lastEventSource: 'none',
                lastEventStatus: undefined,
                lastEventInvitationId: undefined,
                lastIgnoredAt: null,
                lastIgnoredSource: 'none',
                lastIgnoredStatus: undefined,
                lastOwnerEventAt: null,
                lastOwnerEventStatus: undefined,
                lastOwnerEventEmail: undefined,
                lastOwnerEventRole: undefined,
                lastOwnerEventInvitationId: undefined,
                lastErrorAt: null,
                lastErrorMessage: undefined,
            },
            notificationTelemetry: {
                lastEventAt: null,
                lastEventType: 'none',
                lastEventSource: 'none',
                lastEventPersonId: undefined,
                lastEventDedupKey: undefined,
                lastIntegrityCount: undefined,
                lastBirthdayName: undefined,
                lastSkippedAt: null,
                lastSkippedSource: 'none',
                lastSkippedReason: undefined,
            },
        });
    },
});

