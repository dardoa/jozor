import { AppearanceState } from './appearanceEngine';
import { TreeSettings } from '../../types';
import { mapAppearanceLabStateToTreeSettings } from './appearanceSettingsAdapter';

export const normalizeAppearanceLabForPersistence = (
    appearanceState: AppearanceState
): Partial<TreeSettings> => {
    return mapAppearanceLabStateToTreeSettings(appearanceState);
};

/**
 * Merges legacy treeSettings with live appearance lab state.
 *
 * @param legacySettings - the base TreeSettings from AppStore
 * @param appearanceState - the current AppearanceState from useAppStore().appearance
 */
export const buildPersistedTreeSettings = (
    legacySettings: TreeSettings,
    appearanceState: AppearanceState
): TreeSettings => {
    const normalizedLabSettings = normalizeAppearanceLabForPersistence(appearanceState);
    return {
        ...legacySettings,
        ...normalizedLabSettings,
    };
};
