import { StateCreator } from 'zustand';
import { AppStore } from '../storeTypes';
import { UserProfile, SyncStatus } from '../../types';
import { logoutFirebase, getIdToken } from '../../services/firebaseAuthService';
import { googleAuthService } from '../../services/googleService';
import { updateUserTourStatus, fetchUserProfile } from '../../services/supabaseTreeService';

export interface AuthSlice {
    // State
    user: UserProfile | null;
    isSyncing: boolean;
    isDemoMode: boolean;
    currentActiveDriveFileId: string | null;
    currentTreeId: string | null;
    authLoading: boolean;
    authError: string | null;
    syncStatus: SyncStatus;
    idToken: string | null;
    currentUserRole: 'owner' | 'editor' | 'viewer' | null;

    // Actions
    setUser: (user: UserProfile | null) => void;
    setIsSyncing: (syncing: boolean) => void;
    setIsDemoMode: (demo: boolean) => void;
    setAuthLoading: (loading: boolean) => void;
    setAuthError: (error: string | null) => void;
    setSyncStatus: (status: SyncStatus) => void;
    setIdToken: (token: string | null) => void;
    setCurrentActiveDriveFileId: (fileId: string | null) => void;
    setCurrentTreeId: (treeId: string | null) => void;
    setCurrentUserRole: (role: 'owner' | 'editor' | 'viewer' | null) => void;
    login: () => Promise<void>;
    logout: () => Promise<void>;
    updateTourStatus: (hasCompleted: boolean) => Promise<void>;
}

export const createAuthSlice: StateCreator<AppStore, [["zustand/devtools", never]], [], AuthSlice> = (set, get) => ({
    // Initial State
    user: null,
    isSyncing: false,
    isDemoMode: false,
    currentActiveDriveFileId: null,
    currentTreeId: null,
    authLoading: false,
    authError: null,
    syncStatus: {
        state: 'synced',
        lastSyncTime: null,
        lastSyncSupabase: null,
        lastSyncDrive: null,
        supabaseStatus: 'idle',
        driveStatus: 'idle',
    },
    idToken: null,
    currentUserRole: null,

    // Actions
    setUser: (user) => set({ user }),
    setIsSyncing: (syncing) => set({ isSyncing: syncing }),
    setIsDemoMode: (demo) => set({ isDemoMode: demo }),
    setCurrentActiveDriveFileId: (fileId) => set({ currentActiveDriveFileId: fileId }),
    setCurrentTreeId: (treeId) => set({ currentTreeId: treeId }),
    setAuthLoading: (loading) => set({ authLoading: loading }),
    setAuthError: (error) => set({ authError: error }),
    setSyncStatus: (status) => set({ syncStatus: status }),
    setIdToken: (token) => set({ idToken: token }),
    setCurrentUserRole: (role) => set({ currentUserRole: role }),
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

    login: async () => {
        set({ authLoading: true, authError: null });
        try {
            const user = await googleAuthService.login();

            if (user) {
                // The supabaseToken is already in the user object returned by googleAuthService.login()
                const profile = await fetchUserProfile(user.uid, user.email || '', user.supabaseToken);
                if (profile) {
                    user.metadata = profile.metadata;
                }
            }

            // For backward compatibility, still get the Firebase ID token if possible,
            // though we prefer user.supabaseToken now.
            const idToken = await getIdToken();
            set({ user, idToken, authLoading: false });
        } catch (error: any) {
            set({ authError: error.message || 'Login failed', authLoading: false });
            throw error;
        }
    },

    logout: async () => {
        await logoutFirebase();
        set({
            user: null,
            isSyncing: false,
            isDemoMode: false,
            currentActiveDriveFileId: null,
            currentTreeId: null,
            idToken: null,
            currentUserRole: null,
            syncStatus: {
                state: 'synced',
                lastSyncTime: null,
                lastSyncSupabase: null,
                lastSyncDrive: null,
                supabaseStatus: 'idle',
                driveStatus: 'idle',
            },
        });
    },
});
