import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { createFamilySlice } from './slices/familySlice';
import { createSettingsSlice } from './slices/settingsSlice';
import { createAuthSlice } from './slices/authSlice';
import { createUISlice } from './slices/uiSlice';
function isPersonLike(v) {
    return typeof v === 'object' && v !== null && 'id' in v && 'firstName' in v;
}
function isLegacyPeopleFormat(state) {
    if (!state || typeof state !== 'object')
        return false;
    const obj = state;
    if (obj.version != null || obj.metadata != null)
        return false;
    if (obj.people != null && typeof obj.people === 'object' && !Array.isArray(obj.people))
        return false;
    return Object.values(obj).some(isPersonLike);
}
// Create the store with all slices combined
export const useAppStore = create()(devtools((...args) => ({
    ...createFamilySlice(...args),
    ...createSettingsSlice(...args),
    ...createAuthSlice(...args),
    ...createUISlice(...args),
}), { name: 'AppStore' }));
// Global action to load full state
export const loadFullState = (fullState) => {
    try {
        if (fullState == null)
            return;
        const start = useAppStore.getState();
        if (isLegacyPeopleFormat(fullState)) {
            start.loadCloudData(fullState);
            return;
        }
        const state = fullState;
        if (state.people) {
            start.loadCloudData(state.people);
        }
        if (state.settings) {
            start.importSettings({ treeSettings: { ...start.treeSettings, ...state.settings } });
        }
        if (state.focusId && state.people && state.people[state.focusId]) {
            start.setFocusId(state.focusId);
        }
        if (state.lastSyncedVersion !== undefined) {
            start.setLastSyncedVersion(state.lastSyncedVersion);
        }
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to load state from file: ${msg}`);
    }
};
// Selectors for common use cases (optional but recommended)
export const selectPeople = (state) => state.people;
export const selectFocusId = (state) => state.focusId;
export const selectActivePerson = (state) => state.people[state.focusId];
export const selectTreeSettings = (state) => state.treeSettings;
export const selectUser = (state) => state.user;
export const selectIsSyncing = (state) => state.isSyncing;
export const selectCanUndo = (state) => state.history.length > 0;
export const selectCanRedo = (state) => state.future.length > 0;
