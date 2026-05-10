import { logoutFirebase, getIdToken } from '../../services/firebaseAuthService';
import { googleAuthService } from '../../services/googleService';
import { updateUserTourStatus, fetchUserProfile } from '../../services/supabaseTreeService';
export const createAuthSlice = (set, get) => ({
    // Initial State
    user: null,
    isSyncing: false,
    isDemoMode: false,
    currentActiveDriveFileId: null,
    currentTreeId: null,
    authLoading: true,
    authError: null,
    syncStatus: {
        state: 'synced',
        lastSyncTime: null,
        lastSyncSupabase: null,
        lastSyncDrive: null,
        supabaseStatus: 'idle',
        driveStatus: 'idle',
        pendingCount: 0,
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
    updateTourStatus: async (hasCompleted) => {
        const { user } = get();
        if (!user)
            return;
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
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Login failed';
            set({ authError: message, authLoading: false });
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
                pendingCount: 0,
            },
        });
    },
});
