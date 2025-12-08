import { useState, useEffect, useCallback, useRef } from 'react';
import { UserProfile, Person, DriveFile } from '../types';
import { 
    initializeGoogleApi, 
    loginToGoogle, 
    logoutFromGoogle, 
    findLatestJozorFile, 
    loadFromDrive, 
    saveToDrive,
    listJozorFiles, 
    deleteDriveFile, 
} from '../services/googleService';
import { showSuccess, showError } from '../utils/toast'; // Import toast utilities

export const useGoogleSync = (
    people: Record<string, Person>, 
    setPeople: (data: Record<string, Person>) => void,
    onOpenGoogleSyncChoice: (fileId: string) => void,
    onCloseGoogleSyncChoice: () => void,
) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [currentActiveDriveFileId, setCurrentActiveDriveFileId] = useState<string | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [isDemoMode, setIsDemoMode] = useState(false);
    const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
    const [isListingDriveFiles, setIsListingDriveFiles] = useState(false);
    const [isSavingDriveFile, setIsSavingDriveFile] = useState(false);
    const [isDeletingDriveFile, setIsDeletingDriveFile] = useState(false);

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

    // --- Drive File Management Functions (Declared early as they are dependencies) ---
    const refreshDriveFiles = useCallback(async () => {
        if (!user) {
            setDriveFiles([]);
            return;
        }
        setIsListingDriveFiles(true);
        try {
            const files = await listJozorFiles();
            setDriveFiles(files);
        } catch (e) {
            console.error("Failed to list Drive files", e);
            showError("Failed to list files from Google Drive.");
        } finally {
            setIsListingDriveFiles(false);
        }
    }, [user]); // Depends on 'user'

    // 2. Auto-save/Update Logic
    useEffect(() => {
        // Only auto-save if user is logged in, not in demo mode, and API is initialized
        if (!user || isDemoMode || !isInitialized) return;

        const timer = setTimeout(async () => {
            if (saveInProgressRef.current) return; // Prevent re-entry if a save is already running

            setIsSyncing(true);
            saveInProgressRef.current = true; // Mark save as in progress

            try {
                // saveToDrive will create a new file if currentActiveDriveFileId is null, or update existing
                const newOrExistingFileId = await saveToDrive(people, currentActiveDriveFileId);
                if (newOrExistingFileId !== currentActiveDriveFileId) {
                    setCurrentActiveDriveFileId(newOrExistingFileId); // Update state if a new file was created
                }
                showSuccess("Successfully synced with Google Drive!");
                refreshDriveFiles(); // Refresh file list after auto-save
            } catch (e) {
                console.error("Auto-save failed", e);
                showError("Failed to sync with Google Drive.");
            } finally {
                setIsSyncing(false);
                saveInProgressRef.current = false; // Reset save in progress flag
            }
        }, 3000); // Debounce save every 3 seconds

        return () => clearTimeout(timer);
    }, [people, user, isDemoMode, currentActiveDriveFileId, isInitialized, refreshDriveFiles]); // Added refreshDriveFiles to dependencies

    // 3. Login Flow
    const handleLogin = useCallback(async (): Promise<boolean> => {
        setIsSyncing(true);
        try {
            const u = await loginToGoogle();
            setUser(u);
            setIsDemoMode(false);

            // After login, refresh the list of files
            await refreshDriveFiles();

            try {
                const latestFileId = await findLatestJozorFile();
                if (latestFileId) {
                    console.log("Found latest existing file, prompting user for action...");
                    onOpenGoogleSyncChoice(latestFileId); // User will choose to load or save new
                } else {
                    console.log("No existing Jozor file found. Will create on first auto-save.");
                    // If no file exists, set currentActiveDriveFileId to null so the next auto-save creates one.
                    setCurrentActiveDriveFileId(null); 
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
    }, [onOpenGoogleSyncChoice, refreshDriveFiles]); // refreshDriveFiles is now defined

    const handleLogout = useCallback(async () => {
        try { logoutFromGoogle(); } catch(e) {}
        setUser(null);
        setCurrentActiveDriveFileId(null); // Clear file ID on logout
        setIsDemoMode(false);
        setDriveFiles([]); // Clear drive files on logout
        showSuccess("Logged out successfully.");
    }, []);

    const stopSyncing = useCallback(() => {
        setCurrentActiveDriveFileId(null); // Stop syncing by clearing the file ID
    }, []);

    // Functions called by GoogleSyncChoiceModal
    const onLoadCloudData = useCallback(async (fileId: string) => {
        setIsSyncing(true);
        try {
            const cloudData = await loadFromDrive(fileId);
            setPeople(cloudData);
            setCurrentActiveDriveFileId(fileId); // Set the file ID of the loaded file
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
            // Explicitly create a NEW file, even if currentActiveDriveFileId already exists
            const newId = await saveToDrive(people, null);
            setCurrentActiveDriveFileId(newId); // Set the new file ID
            showSuccess("Current tree saved as a new file to Google Drive successfully!");
            refreshDriveFiles(); // Refresh file list after saving
        } catch (e) {
            console.error("Failed to save new file to Google Drive.", e);
            showError("Failed to save new file to Google Drive.");
        } finally {
            setIsSyncing(false);
            onCloseGoogleSyncChoice();
        }
    }, [people, onCloseGoogleSyncChoice, refreshDriveFiles]); // refreshDriveFiles is now defined

    const handleLoadDriveFile = useCallback(async (fileId: string) => {
        setIsSyncing(true);
        try {
            const cloudData = await loadFromDrive(fileId);
            setPeople(cloudData);
            setCurrentActiveDriveFileId(fileId);
            showSuccess("File loaded successfully from Google Drive.");
        } catch (e) {
            console.error("Failed to load file from Google Drive.", e);
            showError("Failed to load file from Google Drive.");
        } finally {
            setIsSyncing(false);
        }
    }, [setPeople]);

    const handleSaveAsNewDriveFile = useCallback(async (fileName: string) => {
        setIsSavingDriveFile(true);
        try {
            const newId = await saveToDrive(people, null, fileName);
            setCurrentActiveDriveFileId(newId);
            showSuccess(`Tree saved as '${fileName}' to Google Drive!`);
            await refreshDriveFiles();
        } catch (e) {
            console.error("Failed to save as new file to Google Drive.", e);
            showError("Failed to save as new file to Google Drive.");
        } finally {
            setIsSavingDriveFile(false);
        }
    }, [people, refreshDriveFiles]);

    const handleOverwriteExistingDriveFile = useCallback(async (fileId: string) => {
        setIsSavingDriveFile(true);
        try {
            await saveToDrive(people, fileId);
            setCurrentActiveDriveFileId(fileId);
            showSuccess("File overwritten successfully on Google Drive!");
            await refreshDriveFiles();
        } catch (e) {
            console.error("Failed to overwrite file on Google Drive.", e);
            showError("Failed to overwrite file on Google Drive.");
        } finally {
            setIsSavingDriveFile(false);
        }
    }, [people, refreshDriveFiles]);

    const handleDeleteDriveFile = useCallback(async (fileId: string) => {
        setIsDeletingDriveFile(true);
        try {
            await deleteDriveFile(fileId);
            showSuccess("File deleted from Google Drive.");
            if (currentActiveDriveFileId === fileId) {
                setCurrentActiveDriveFileId(null); // If active file is deleted, clear it
            }
            await refreshDriveFiles();
        } catch (e) {
            console.error("Failed to delete file from Google Drive.", e);
            showError("Failed to delete file from Google Drive.");
        } finally {
            setIsDeletingDriveFile(false);
        }
    }, [currentActiveDriveFileId, refreshDriveFiles]);

    return {
        user,
        isSyncing,
        isDemoMode,
        handleLogin,
        handleLogout,
        stopSyncing,
        onLoadCloudData,
        onSaveNewCloudFile,
        // New exports for Drive File Manager
        driveFiles,
        currentActiveDriveFileId,
        refreshDriveFiles,
        handleLoadDriveFile,
        handleSaveAsNewDriveFile,
        handleOverwriteExistingDriveFile,
        handleDeleteDriveFile,
        isSavingDriveFile,
        isDeletingDriveFile,
        isListingDriveFiles,
    };
};