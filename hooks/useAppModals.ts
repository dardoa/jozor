import { useState, useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';

export const useAppModals = () => {
    const [googleSyncChoiceModal, setGoogleSyncChoiceModal] = useState<{
        isOpen: boolean;
        driveFileId: string | null;
    }>({ isOpen: false, driveFileId: null });

    const onCloseGoogleSyncChoice = useCallback(() => {
        setGoogleSyncChoiceModal({ isOpen: false, driveFileId: null });
    }, []);

    const onOpenGoogleSyncChoice = useCallback((fileId: string) => {
        setGoogleSyncChoiceModal({ isOpen: true, driveFileId: fileId });
    }, []);

    const [driveFileManagerModal, setDriveFileManagerModal] = useState<{ isOpen: boolean }>({
        isOpen: false,
    });

    const onOpenDriveFileManager = useCallback(() => {
        setDriveFileManagerModal({ isOpen: true });
    }, []);

    const [cleanTreeOptionsModal, setCleanTreeOptionsModal] = useState<{ isOpen: boolean }>({
        isOpen: false,
    });

    const onOpenCleanTreeOptions = useCallback(() => {
        setCleanTreeOptionsModal({ isOpen: true });
    }, []);

    const [treeManagerModal, setTreeManagerModal] = useState<{ isOpen: boolean }>({
        isOpen: false,
    });

    const onOpenTreeManager = useCallback(() => {
        setTreeManagerModal({ isOpen: true });
    }, []);

    const [sharedTreePromptModal, setSharedTreePromptModal] = useState<{
        isOpen: boolean;
        sharedTrees: any[];
    }>({ isOpen: false, sharedTrees: [] });

    const [snapshotHistoryModal, setSnapshotHistoryModal] = useState<{ isOpen: boolean }>({
        isOpen: false,
    });

    const onOpenSnapshotHistory = useCallback(() => {
        setSnapshotHistoryModal({ isOpen: true });
    }, []);

    const [adminHubModal, setAdminHubModal] = useState<{ isOpen: boolean }>({
        isOpen: false,
    });

    const onOpenAdminHub = useCallback(() => {
        setAdminHubModal({ isOpen: true });
    }, []);

    const [globalSettingsModal, setGlobalSettingsModal] = useState<{ isOpen: boolean }>({
        isOpen: false,
    });

    const onOpenGlobalSettings = useCallback(() => {
        setGlobalSettingsModal({ isOpen: true });
    }, []);





    return {
        googleSyncChoiceModal,
        setGoogleSyncChoiceModal,
        onCloseGoogleSyncChoice,
        onOpenGoogleSyncChoice,
        driveFileManagerModal,
        setDriveFileManagerModal,
        onOpenDriveFileManager,
        cleanTreeOptionsModal,
        setCleanTreeOptionsModal,
        onOpenCleanTreeOptions,
        sharedTreePromptModal,
        setSharedTreePromptModal,
        treeManagerModal,
        setTreeManagerModal,
        onOpenTreeManager,
        snapshotHistoryModal,
        setSnapshotHistoryModal,
        onOpenSnapshotHistory,
        adminHubModal,
        setAdminHubModal,
        onOpenAdminHub,
        globalSettingsModal,
        setGlobalSettingsModal,
        onOpenGlobalSettings,
    };
};
