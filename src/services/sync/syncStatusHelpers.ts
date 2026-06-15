import { SyncStatus } from '../../types';

export const buildSyncSuccess = (current: SyncStatus, pendingCount: number, options?: { lastSyncSupabase?: Date }): SyncStatus => ({
    ...current,
    state: pendingCount > 0 ? 'saving' : 'synced',
    supabaseStatus: pendingCount > 0 ? 'syncing' : 'idle',
    pendingCount,
    errorMessage: undefined,
    lastErrorCategory: undefined,
    lastErrorAt: null,
    lastErrorRetryable: undefined,
    retryAttempt: 0,
    retryPaused: false,
    nextRetryAt: null,
    ...(options?.lastSyncSupabase ? { lastSyncSupabase: options.lastSyncSupabase } : {})
});

export const buildSyncError = (
    current: SyncStatus, 
    pendingCount: number, 
    error: { message: string, category?: string, retryable?: boolean, time?: Date }
): SyncStatus => ({
    ...current,
    state: 'error',
    supabaseStatus: 'error',
    pendingCount,
    errorMessage: error.message,
    lastErrorCategory: error.category,
    lastErrorAt: error.time || new Date(),
    lastErrorRetryable: error.retryable ?? false,
});

export const buildSyncSaving = (current: SyncStatus, pendingCount: number): SyncStatus => ({
    ...current,
    state: 'saving',
    supabaseStatus: 'syncing',
    pendingCount
});
