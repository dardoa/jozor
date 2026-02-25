import { useState, useEffect, useCallback } from 'react';
import { SyncStatus } from '../types';

export function useSyncStatus() {
    const [syncStatus, setSyncStatus] = useState<SyncStatus>({
        state: 'synced',
        lastSyncTime: null,
        lastSyncSupabase: null,
        lastSyncDrive: null,
        errorMessage: undefined,
        supabaseStatus: 'idle',
        driveStatus: 'idle',
    });

    const handleSyncStart = useCallback(() => {
        setSyncStatus(prev => ({ ...prev, state: 'saving', supabaseStatus: 'syncing' }));
    }, []);

    const handleSyncSuccess = useCallback((e: any) => {
        const time = e.detail?.time || new Date();
        setSyncStatus(prev => ({
            ...prev,
            state: 'synced',
            lastSyncTime: time as Date,
            lastSyncSupabase: time as Date,
            errorMessage: undefined,
            supabaseStatus: 'idle'
        }));
    }, []);

    const handleSyncError = useCallback((e: any) => {
        setSyncStatus(prev => ({
            ...prev,
            state: 'error',
            errorMessage: e.detail?.message || 'Supabase sync failed',
            supabaseStatus: 'error'
        }));
    }, []);

    const handleUploadStart = useCallback(() => {
        setSyncStatus(prev => ({ ...prev, state: 'saving', driveStatus: 'uploading' }));
    }, []);

    const handleUploadSuccess = useCallback((e: any) => {
        const time = e.detail?.time || new Date();
        setSyncStatus(prev => ({
            ...prev,
            state: 'synced',
            lastSyncTime: time as Date,
            lastSyncDrive: time as Date,
            errorMessage: undefined,
            driveStatus: 'idle'
        }));
    }, []);

    const handleUploadError = useCallback((e: any) => {
        setSyncStatus(prev => ({
            ...prev,
            state: 'error',
            errorMessage: e.detail?.message || 'Google Drive upload failed',
            driveStatus: 'error'
        }));
    }, []);

    useEffect(() => {
        window.addEventListener('supabase-sync-start', handleSyncStart);
        window.addEventListener('supabase-sync-success', handleSyncSuccess);
        window.addEventListener('supabase-sync-error', handleSyncError);
        window.addEventListener('drive-upload-start', handleUploadStart);
        window.addEventListener('drive-upload-success', handleUploadSuccess);
        window.addEventListener('drive-upload-error', handleUploadError);

        return () => {
            window.removeEventListener('supabase-sync-start', handleSyncStart);
            window.removeEventListener('supabase-sync-success', handleSyncSuccess);
            window.removeEventListener('supabase-sync-error', handleSyncError);
            window.removeEventListener('drive-upload-start', handleUploadStart);
            window.removeEventListener('drive-upload-success', handleUploadSuccess);
            window.removeEventListener('drive-upload-error', handleUploadError);
        };
    }, [handleSyncStart, handleSyncSuccess, handleSyncError, handleUploadStart, handleUploadSuccess, handleUploadError]);

    const forceDriveSync = useCallback(() => {
        window.dispatchEvent(new CustomEvent('force-drive-sync'));
    }, []);

    const onClearSyncCache = useCallback(() => {
        window.dispatchEvent(new CustomEvent('clear-sync-cache'));
    }, []);

    const resetError = useCallback(() => {
        setSyncStatus(prev => ({ ...prev, state: 'synced', errorMessage: undefined }));
    }, []);

    return {
        syncStatus,
        forceDriveSync,
        onClearSyncCache,
        resetError
    };
}
