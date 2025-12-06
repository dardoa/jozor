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

export const useGoogleSync = (
    people: Record<string, Person>, 
    setPeople: (data: Record<string, Person>) => void
) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [driveFileId, setDriveFileId] = useState<string | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isDemoMode, setIsDemoMode] = useState(false);

    // 1. Init
    useEffect(() => {
        // let mounted = true; // Removed unused variable
        initializeGoogleApi()
            .then(() => { /* if(mounted) setIsInitialized(true); */ })
            .catch((e) => {
                console.warn("Google API Init warn:", e);
                /* if(mounted) setIsInitialized(true); */
            });
        // return () => { mounted = false; }; // Removed unused cleanup
    }, []);

    // 2. Sync Loop (Only for real auth now)
    useEffect(() => {
        if (!user || isDemoMode || !driveFileId) return;

        const timer = setTimeout(async () => {
            setIsSyncing(true);
            try {
                await saveToDrive(people, driveFileId);
            } catch (e) {
                console.error("Auto-save failed", e);
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
                    console.log("Found existing file, loading...");
                    setDriveFileId(existingId);
                    const cloudData = await loadFromDrive(existingId);
                    setPeople(cloudData);
                } else {
                    console.log("Creating new file...");
                    const newId = await saveToDrive(people, null);
                    setDriveFileId(newId);
                }
            } catch (driveErr) {
                console.error("Drive Setup Error:", driveErr);
                alert("Logged in, but failed to access Google Drive. Check permissions.");
            }
            return true;

        } catch(e: any) {
            console.error("Login failed", e);
            alert("Login failed. Please ensure your Google Client ID is configured correctly in the code.");
            return false;
        } finally {
            setIsSyncing(false);
        }
    }, [people, setPeople]);

    const handleLogout = useCallback(async () => {
        try { logoutFromGoogle(); } catch(e) {}
        setUser(null);
        setDriveFileId(null);
        setIsDemoMode(false);
    }, []);

    const stopSyncing = useCallback(() => {
        setDriveFileId(null);
    }, []);

    return {
        user,
        isSyncing,
        isDemoMode,
        handleLogin,
        handleLogout,
        stopSyncing
    };
};