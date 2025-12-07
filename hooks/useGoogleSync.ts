import { useState, useEffect, useCallback } from 'react';
import { UserProfile, Person } from '../types';
import { 
    initializeGoogleApi, 
    loginToGoogle, 
    logoutFromGoogle, 
    findAppFile, 
    loadFromDrive, 
    saveToDrive 
} from '../services/googleService';
import { showSuccess, showError } from '../utils/toast'; // Import toast utilities

export const useGoogleSync = (
    people: Record<string, Person>, 
    setPeople: (data: Record<string, Person>) => void,
    // New prop: callback to open the GoogleSyncChoiceModal
    onOpenGoogleSyncChoice: (fileId: string) => void,
    // New prop: callback to close the GoogleSyncChoiceModal
    onCloseGoogleSyncChoice: () => void,
) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [driveFileId, setDriveFileId] = useState<string | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [isDemoMode, setIsDemoMode] = useState(false);

    // 1. Init
    useEffect(() => {
        let mounted = true;
        initializeGoogleApi()
            .then(() => { if(mounted) setIsInitialized(true); })
            .catch((e) => {
                console.warn("Google API Init warn:", e);
                if(mounted) setIsInitialized(true);
            });
        return () => { mounted = false; };
    }, []);

    // 2. Sync Loop (Only for real auth now)
    useEffect(() => {
        if (!user || isDemoMode || !driveFileId) return;

        const timer = setTimeout(async () => {
            setIsSyncing(true);
            try {
                await saveToDrive(people, driveFileId);
                showSuccess("Successfully synced with Google Drive!"); // Toast success
            } catch (e) {
                console.error("Auto-save failed", e);
                showError("Failed to sync with Google Drive."); // Toast error
            } finally {
                setIsSyncing(false);
            }
        }, 3000); // Debounce save every 3 seconds

        return () => clearTimeout(timer);
    }, [people, user, driveFileId, isDemoMode]);

    // 3. Login Logic (REAL)
    const handleLogin = useCallback(async (): Promise<boolean> => {
        setIsSyncing(true);
        try {
            // Real Google Login
            const u = await loginToGoogle();
            setUser(u);
            setIsDemoMode(false);

            try {
                const existingId = await findAppFile();
                if (existingId) {
                    console.log("Found existing file, prompting user for action...");
                    // Instead of directly loading, open the choice modal
                    onOpenGoogleSyncChoice(existingId);
                } else {
                    console.log("No existing file found. Creating new file...");
                    const newId = await saveToDrive(people, null);
                    setDriveFileId(newId);
                    showSuccess("New file saved to Google Drive successfully!"); // Toast success
                }
            } catch (driveErr) {
                console.error("Drive Setup Error:", driveErr);
                showError("Logged in, but failed to access Google Drive. Check permissions."); // Toast error
            }
            return true;

        } catch(e: any) {
            console.error("Login failed", e);
            showError("Login failed. Please ensure your Google Client ID is configured correctly in the code."); // Toast error
            return false;
        } finally {
            setIsSyncing(false);
        }
    }, [people, setPeople, onOpenGoogleSyncChoice]);

    const handleLogout = useCallback(async () => {
        try { logoutFromGoogle(); } catch(e) {}
        setUser(null);
        setDriveFileId(null);
        setIsDemoMode(false);
        showSuccess("Logged out successfully."); // Toast success
    }, []);

    const stopSyncing = useCallback(() => {
        setDriveFileId(null);
    }, []);

    // New functions to be called by GoogleSyncChoiceModal
    const onLoadCloudData = useCallback(async (fileId: string) => {
        setIsSyncing(true);
        try {
            const cloudData = await loadFromDrive(fileId);
            setPeople(cloudData);
            setDriveFileId(fileId);
            showSuccess("File loaded successfully from Google Drive.");
        } catch (e) {
            console.error("Failed to load file from Google Drive.", e);
            showError("Failed to load file from Google Drive.");
        } finally {
            setIsSyncing(false);
            onCloseGoogleSyncChoice();
        }
    }, [setPeople, onCloseGoogleSyncChoice]);

    const onSaveNewCloudFile = useCallback(async () => {
        setIsSyncing(true);
        try {
            const newId = await saveToDrive(people, null);
            setDriveFileId(newId);
            showSuccess("Current tree saved as a new file to Google Drive successfully!");
        } catch (e) {
            console.error("Failed to save new file to Google Drive.", e);
            showError("Failed to save new file to Google Drive.");
        } finally {
            setIsSyncing(false);
            onCloseGoogleSyncChoice();
        }
    }, [people, onCloseGoogleSyncChoice]);


    return {
        user,
        isSyncing,
        isDemoMode,
        handleLogin,
        handleLogout,
        stopSyncing,
        onLoadCloudData, // Expose for modal
        onSaveNewCloudFile, // Expose for modal
    };
};