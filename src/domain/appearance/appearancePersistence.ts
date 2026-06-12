import { TreeSettings } from '../../types';
import {
    mapAppearanceLabStateToTreeSettings,
    type TreeSettingsAppearanceState,
} from './appearanceSettingsAdapter';

export const normalizeAppearanceLabForPersistence = (
    appearanceState: TreeSettingsAppearanceState
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
    appearanceState: TreeSettingsAppearanceState
): TreeSettings => {
    const normalizedLabSettings = normalizeAppearanceLabForPersistence(appearanceState);
    return {
        ...legacySettings,
        ...normalizedLabSettings,
    };
};
