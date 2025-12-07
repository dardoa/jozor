import { useState, useEffect, useCallback, useRef } from 'react';
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
    onOpenGoogleSyncChoice: (fileId: string) => void,
    onCloseGoogleSyncChoice: () => void,
) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [driveFileId, setDriveFileId] = useState<string | null>(null); // This will store the ID of the *current* file
    const [isSyncing, setIsSyncing] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [isDemoMode, setIsDemoMode] = useState(false);

    // Ref to track if a save is already in progress to prevent multiple simultaneous saves
    const saveInProgressRef = useRef(false);

    // 1. Init Google API
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

    // 2. Auto-save/Update Logic
    useEffect(() => {
        // Only auto-save if user is logged in, not in demo mode, and API is initialized
        if (!user || isDemoMode || !isInitialized) return;

        const timer = setTimeout(async () => {
            if (saveInProgressRef.current) return; // Prevent re-entry if a save is already running

            setIsSyncing(true);
            saveInProgressRef.current = true; // Mark save as in progress

            try {
                // saveToDrive will create a new file if driveFileId is null, or update existing
                const newOrExistingFileId = await saveToDrive(people, driveFileId);
                if (newOrExistingFileId !== driveFileId) {
                    setDriveFileId(newOrExistingFileId); // Update state if a new file was created
                }
                showSuccess("Successfully synced with Google Drive!");
            } catch (e) {
                console.error("Auto-save failed", e);
                showError("Failed to sync with Google Drive.");
            } finally {
                setIsSyncing(false);
                saveInProgressRef.current = false; // Reset save in progress flag
            }
        }, 3000); // Debounce save every 3 seconds

        return () => clearTimeout(timer);
    }, [people, user, isDemoMode, driveFileId, isInitialized]); // Add isInitialized to dependencies

    // 3. Login Flow
    const handleLogin = useCallback(async (): Promise<boolean> => {
        setIsSyncing(true);
        try {
            const u = await loginToGoogle();
            setUser(u);
            setIsDemoMode(false);

            try {
                const existingId = await findAppFile();
                if (existingId) {
                    console.log("Found existing file, prompting user for action...");
                    onOpenGoogleSyncChoice(existingId); // User will choose to load or save new
                } else {
                    console.log("No existing file found. Will create on first auto-save.");
                    // If no file exists, set driveFileId to null so the next auto-save creates one.
                    setDriveFileId(null); 
                }
            } catch (driveErr) {
                console.error("Drive Setup Error:", driveErr);
                showError("Logged in, but failed to access Google Drive. Check permissions.");
            }
            return true;

        } catch(e: any) {
            console.error("Login failed", e);
            showError("Login failed. Please ensure your Google Client ID is configured correctly in the code.");
            return false;
        } finally {
            setIsSyncing(false);
        }
    }, [onOpenGoogleSyncChoice]); // Removed 'people' from dependencies as it's not directly used here

    const handleLogout = useCallback(async () => {
        try { logoutFromGoogle(); } catch(e) {}
        setUser(null);
        setDriveFileId(null); // Clear file ID on logout
        setIsDemoMode(false);
        showSuccess("Logged out successfully.");
    }, []);

    const stopSyncing = useCallback(() => {
        setDriveFileId(null); // Stop syncing by clearing the file ID
    }, []);

    // Functions called by GoogleSyncChoiceModal
    const onLoadCloudData = useCallback(async (fileId: string) => {
        setIsSyncing(true);
        try {
            const cloudData = await loadFromDrive(fileId);
            setPeople(cloudData);
            setDriveFileId(fileId); // Set the file ID of the loaded file
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
            // Explicitly create a NEW file, even if driveFileId already exists
            const newId = await saveToDrive(people, null);
            setDriveFileId(newId); // Set the new file ID
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
        onLoadCloudData,
        onSaveNewCloudFile,
    };
};