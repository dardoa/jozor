import { useAppStore } from '../../store/useAppStore';
import { buildPersistedTreeSettings } from './appearancePersistence';

/**
 * appearanceSettingsGateway
 * 
 * OWNERSHIP BOUNDARY (Phase 5 — final state):
 * - Reads from: useAppStore().appearance (new SSOT)
 * - Writes to: useAppStore.treeSettings (Persistence Target)
 * 
 * Called whenever a visual setting needs to be flushed to the persistent layer.
 */

export const syncAppearanceToPersistence = () => {
    // 1. Get current tree settings from AppStore
    const legacySettings = useAppStore.getState().treeSettings;
    
    // 2. Build the updated payload based on the AppearanceStore
    const persistedSettings = buildPersistedTreeSettings(legacySettings, useAppStore.getState().appearance);
    
    // 3. Dispatch to AppStore to update treeSettings for saving
    useAppStore.getState().importSettings({ treeSettings: persistedSettings });
};
