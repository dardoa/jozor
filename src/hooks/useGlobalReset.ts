import { useCallback, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useTreeAppearanceStore } from '../store/useTreeAppearanceStore';
import { DEFAULT_TREE_SETTINGS } from '../constants';

/**
 * useGlobalReset — encapsulates the "Reset all appearance settings" workflow.
 *
 * Responsibilities:
 * - Owns the confirmation dialog state.
 * - Resets both useAppStore.treeSettings and useTreeAppearanceStore on confirm.
 *
 * Usage in any component:
 *   const { isConfirmOpen, requestReset, cancelReset, confirmReset } = useGlobalReset();
 */
export const useGlobalReset = () => {
    const setTreeSettings = useAppStore(state => state.setTreeSettings);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const requestReset = useCallback(() => {
        setIsConfirmOpen(true);
    }, []);

    const cancelReset = useCallback(() => {
        setIsConfirmOpen(false);
    }, []);

    const confirmReset = useCallback(() => {
        setTreeSettings(DEFAULT_TREE_SETTINGS);
        useTreeAppearanceStore.getState().resetToDefault();
        setIsConfirmOpen(false);
    }, [setTreeSettings]);

    return { isConfirmOpen, requestReset, cancelReset, confirmReset };
};
