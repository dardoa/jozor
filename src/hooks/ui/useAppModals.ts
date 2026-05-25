import { useState, useCallback } from 'react';
import type { SharedTreeSummary } from '../../services/supabaseTreeTypes';
import { useAppStore } from '../../store/useAppStore';

export const useAppModals = () => {
    const setVaultOpen = useAppStore((state) => state.setVaultOpen);
    const setVaultTab = useAppStore((state) => state.setVaultTab);
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

    const onOpenCloudBackups = useCallback(() => {
        setVaultTab('cloud');
        setVaultOpen(true);
    }, [setVaultOpen, setVaultTab]);

    const [cleanTreeOptionsModal, setCleanTreeOptionsModal] = useState<{ isOpen: boolean }>({
        isOpen: false,
    });

    const onOpenCleanTreeOptions = useCallback(() => {
        setCleanTreeOptionsModal({ isOpen: true });
    }, []);

    const onOpenTreeManager = useCallback(() => {
        setVaultTab('trees');
        setVaultOpen(true);
    }, [setVaultOpen, setVaultTab]);

    const [sharedTreePromptModal, setSharedTreePromptModal] = useState<{
        isOpen: boolean;
        sharedTrees: SharedTreeSummary[];
    }>({ isOpen: false, sharedTrees: [] });

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
        onOpenCloudBackups,
        cleanTreeOptionsModal,
        setCleanTreeOptionsModal,
        onOpenCleanTreeOptions,
        sharedTreePromptModal,
        setSharedTreePromptModal,
        onOpenTreeManager,
        globalSettingsModal,
        setGlobalSettingsModal,
        onOpenGlobalSettings,
    };
};
