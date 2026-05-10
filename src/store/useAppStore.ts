import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Person, TreeSettings } from '../types';
import { createFamilySlice } from './slices/familySlice';
import { createSettingsSlice } from './slices/settingsSlice';
import { createAuthSlice } from './slices/authSlice';
import { createUISlice } from './slices/uiSlice';
import { createSyncMetaSlice } from './slices/syncMetaSlice';
import { createTreeHealthSlice } from './slices/treeHealthSlice';
import { createHistorySlice } from './slices/historySlice';
import { AppStore } from './storeTypes';
import { hydrateAppearanceLabFromLegacy } from '../domain/appearanceLabPersistence';
import { normalizeChartType } from '../domain/chartTypeAdapter';

/** State shape when loading from file (people + settings + focusId). */
export interface LoadedState {
    version?: number;
    metadata?: unknown;
    people?: Record<string, Person>;
    settings?: Partial<TreeSettings>;
    focusId?: string;
    lastSyncedVersion?: number;
    treeName?: string;
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
            ...createSyncMetaSlice(...args),
            ...createTreeHealthSlice(...args),
            ...createHistorySlice(...args),
        }),
        { name: 'AppStore' }
    ),
);

// Global action to load full state
export const loadFullState = (fullState: unknown) => {
    performance.mark('diagnostic-8-hydration-start');
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
            const normalizedSettings = state.settings.chartType
                ? { ...state.settings, chartType: normalizeChartType(state.settings.chartType) }
                : state.settings;
            start.importSettings({ treeSettings: { ...start.treeSettings, ...normalizedSettings } });
            
            // HYDRATE APPEARANCE LAB STORE DIRECTLY
            hydrateAppearanceLabFromLegacy(normalizedSettings);
        }
        if (state.focusId && state.people && state.people[state.focusId]) {
            start.setFocusId(state.focusId);
        }
        if (state.lastSyncedVersion !== undefined) {
            start.setLastSyncedVersion(state.lastSyncedVersion);
        }
        if (typeof state.treeName === 'string' && state.treeName.trim()) {
            start.setTreeName(state.treeName);
        }
        performance.mark('diagnostic-8-hydration-end');
        performance.measure('Diagnostic Checkpoint 8: State Hydration', 'diagnostic-8-hydration-start', 'diagnostic-8-hydration-end');
    } catch (error) {
        performance.mark('diagnostic-8-hydration-end');
        performance.measure('Diagnostic Checkpoint 8: State Hydration', 'diagnostic-8-hydration-start', 'diagnostic-8-hydration-end');
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
export const selectIsSyncing = (state: AppStore) =>
    state.driveSyncUiStatus === 'syncing' ||
    state.syncStatus.supabaseStatus === 'syncing' ||
    state.syncStatus.state === 'saving' ||
    state.syncStatus.pendingCount > 0;
export const selectCanUndo = (state: AppStore) => state.past.length > 0;
export const selectSyncingNodes = (state: AppStore) => state.syncingNodes;
export const selectHealthScore = (state: AppStore) => state.healthScore;

// Granular Selectors for performance optimization
export const selectPerson = (id: string) => (state: AppStore) => state.people[id];
export const selectSettingsValue = <K extends keyof TreeSettings>(key: K) => (state: AppStore) => state.treeSettings[key];
export const selectUIStatus = (state: AppStore) => state.driveSyncUiStatus;
export const selectIsSelectionActive = (id: string) => (state: AppStore) => (state as any).selectedPersonId === id;
export const selectCurrentTreeId = (state: AppStore) => state.currentTreeId;
