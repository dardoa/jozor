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
import { createDiscussionSlice } from '../features/discussions';
import { AppStore } from './storeTypes';
import { createAppearanceSlice } from './slices/appearanceSlice';
import { hydrateAppearanceLabFromLegacy } from '../domain/appearance/appearanceHydration';
import { normalizeChartType } from '../domain/chartTypeAdapter';

/** State shape when loading from file (people + settings + focusId). */
export interface LoadedState {
    version?: number;
    metadata?: unknown;
    people?: Record<string, Person>;
    settings?: Partial<TreeSettings> | {
        treeSettings?: Partial<TreeSettings>;
        darkMode?: boolean;
        language?: 'en' | 'ar';
    };
    focusId?: string;
    lastSyncedVersion?: number;
    treeName?: string;
}

const resolveLoadedSettings = (
    settings: LoadedState['settings'],
    currentTreeSettings: TreeSettings
) => {
    if (!settings || typeof settings !== 'object') return null;

    const record = settings as Record<string, unknown>;
    const wrappedTreeSettings = record.treeSettings && typeof record.treeSettings === 'object'
        ? record.treeSettings as Partial<TreeSettings>
        : null;
    const rawTreeSettings = wrappedTreeSettings ?? settings as Partial<TreeSettings>;
    const normalizedTreeSettings = rawTreeSettings.chartType
        ? { ...rawTreeSettings, chartType: normalizeChartType(rawTreeSettings.chartType) }
        : rawTreeSettings;

    return {
        appSettings: {
            ...('darkMode' in record ? { darkMode: record.darkMode as boolean } : {}),
            ...('language' in record ? { language: record.language as 'en' | 'ar' } : {}),
            treeSettings: { ...currentTreeSettings, ...normalizedTreeSettings },
        },
        treeSettings: { ...currentTreeSettings, ...normalizedTreeSettings },
    };
};

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
            ...createDiscussionSlice(...args),
            ...createAppearanceSlice(...args),
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

        const state = fullState as LoadedState;
        if (state.people) {
            start.loadCloudData(state.people);
        }
        if (state.settings) {
            const resolvedSettings = resolveLoadedSettings(state.settings, start.treeSettings);
            if (resolvedSettings) {
                start.importSettings(resolvedSettings.appSettings);

                // HYDRATE APPEARANCE LAB STORE DIRECTLY
                hydrateAppearanceLabFromLegacy(resolvedSettings.treeSettings);
            }
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
export const selectIsSelectionActive = (id: string) => (state: AppStore & { selectedPersonId?: string | null }) => state.selectedPersonId === id;
export const selectCurrentTreeId = (state: AppStore) => state.currentTreeId;


