import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Person, TreeSettings } from '../types';
import { FamilySlice, createFamilySlice } from './slices/familySlice';
import { SettingsSlice, createSettingsSlice } from './slices/settingsSlice';
import { AuthSlice, createAuthSlice } from './slices/authSlice';
import { UISlice, createUISlice } from './slices/uiSlice';
import { AppStore } from './storeTypes';

/** State shape when loading from file (people + settings + focusId). */
export interface LoadedState {
    version?: number;
    metadata?: unknown;
    people?: Record<string, Person>;
    settings?: Partial<TreeSettings>;
    focusId?: string;
    lastSyncedVersion?: number;
}

function isPersonLike(v: unknown): v is Record<string, unknown> & { id?: string; firstName?: string } {
    return typeof v === 'object' && v !== null && 'id' in v && 'firstName' in v;
}

function isLegacyPeopleFormat(state: unknown): state is Record<string, Person> {
    if (!state || typeof state !== 'object') return false;
    const obj = state as Record<string, unknown>;
    if (obj.version != null || obj.metadata != null) return false;
    if (obj.people != null && typeof obj.people === 'object' && !Array.isArray(obj.people)) return false;
    return Object.values(obj).some(isPersonLike);
}

// Create the store with all slices combined
export const useAppStore = create<AppStore>()(
    devtools(
        (...args) => ({
            ...createFamilySlice(...args),
            ...createSettingsSlice(...args),
            ...createAuthSlice(...args),
            ...createUISlice(...args),
        }),
        { name: 'AppStore' }
    ),
);

// Global action to load full state
export const loadFullState = (fullState: unknown) => {
    try {
        if (fullState == null) return;

        const start = useAppStore.getState();

        if (isLegacyPeopleFormat(fullState)) {
            start.loadCloudData(fullState as Record<string, Person>);
            return;
        }

        const state = fullState as LoadedState;
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
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to load state from file: ${msg}`);
    }
};

// Selectors for common use cases (optional but recommended)
export const selectPeople = (state: AppStore) => state.people;
export const selectFocusId = (state: AppStore) => state.focusId;
export const selectActivePerson = (state: AppStore) => state.people[state.focusId];
export const selectTreeSettings = (state: AppStore) => state.treeSettings;
export const selectUser = (state: AppStore) => state.user;
export const selectIsSyncing = (state: AppStore) => state.isSyncing;
export const selectCanUndo = (state: AppStore) => state.history.length > 0;
export const selectCanRedo = (state: AppStore) => state.future.length > 0;
