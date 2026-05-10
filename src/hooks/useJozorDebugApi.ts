import * as React from 'react';

import type {
  AppNotification,
  InvitationTelemetry,
  Person,
  SyncStatus,
  TreeSettings,
  UserProfile,
} from '../types';
import type {
  VisibleTreePedigreeValidationOptions,
  VisibleTreePedigreeValidationRun,
} from '../domain/legacy/visibleTree/visibleTreePedigreeValidation';
import type {
  VisibleTreeFanValidationOptions,
  VisibleTreeFanValidationRun,
} from '../domain/legacy/visibleTree/visibleTreeFanValidation';
import type {
  VisibleTreeStatsValidationOptions,
  VisibleTreeStatsValidationRun,
} from '../domain/legacy/visibleTree/visibleTreeStatsValidation';
import type {
  VisibleTreeHighlightingValidationOptions,
  VisibleTreeHighlightingValidationRun,
} from '../domain/legacy/visibleTree/visibleTreeHighlightingValidation';
import type {
  VisibleTreeDescendantValidationOptions,
  VisibleTreeDescendantValidationRun,
} from '../domain/legacy/visibleTree/visibleTreeDescendantValidation';
import { deltaSyncService } from '../services/deltaSyncService';
import { loadFullState, useAppStore } from '../store/useAppStore';

const E2E_SCENARIO_KEY = 'jozor:e2e-scenario';

type DebugScenario = {
  people: Record<string, Person>;
  focusId?: string;
  role?: 'owner' | 'editor' | 'viewer' | null;
  treeId?: string | null;
  treeName?: string;
  user?: UserProfile | null;
};

type JozorDebugApi = {
  clearSyncQueue: () => Promise<void>;
  forceSync: () => Promise<void>;
  getQueueSize: () => Promise<void>;
  seedTreeScenario: (scenario: {
    people: Record<string, Person>;
    focusId: string;
    role?: 'owner' | 'editor' | 'viewer';
    treeId?: string;
    treeName?: string;
    user?: UserProfile | null;
  }) => void;
  setRole: (role: 'owner' | 'editor' | 'viewer' | null) => void;
  setScenarioAccess: (scenario: {
    role: 'owner' | 'editor' | 'viewer' | null;
    user?: UserProfile | null;
  }) => void;
  persistCurrentScenario: () => void;
  getStateSnapshot: () => DebugScenario;
  setFocusPerson: (focusId: string) => void;
  setTreeSettings: (updates: Partial<TreeSettings>) => void;
  setFamilyGraphCollapsedIds: (ids: string[]) => void;
  clearFamilyGraphCollapsedIds: () => void;
  getFamilyGraphCollapsedIds: () => string[];
  setSyncStatus: (status: Partial<SyncStatus>) => void;
  setInvitationTelemetry: (telemetry: Partial<InvitationTelemetry>) => void;
  seedNotifications: (
    notifications: Array<Omit<AppNotification, 'id' | 'timestamp' | 'read' | 'createdAt' | 'updatedAt'>>
  ) => void;
  validateVisibleTreePedigree: (
    options?: VisibleTreePedigreeValidationOptions
  ) => Promise<VisibleTreePedigreeValidationRun>;
  validateVisibleTreeFan: (
    options?: VisibleTreeFanValidationOptions
  ) => Promise<VisibleTreeFanValidationRun>;
  validateVisibleTreeStats: (
    options?: VisibleTreeStatsValidationOptions
  ) => Promise<VisibleTreeStatsValidationRun>;
  validateVisibleTreeHighlighting: (
    options?: VisibleTreeHighlightingValidationOptions
  ) => Promise<VisibleTreeHighlightingValidationRun>;
  validateVisibleTreeDescendant: (
    options?: VisibleTreeDescendantValidationOptions
  ) => Promise<VisibleTreeDescendantValidationRun>;
  getLayoutSnapshot: () => Promise<unknown>;
  clearPersistedScenario: () => void;
  resetScenario: () => void;
};

const captureScenario = (): DebugScenario => {
  const state = useAppStore.getState();
  return {
    people: state.people,
    focusId: state.focusId,
    role: state.currentUserRole,
    treeId: state.currentTreeId,
    treeName: state.treeName,
    user: state.user,
  };
};

const persistScenario = (scenario: DebugScenario) => {
  sessionStorage.setItem(E2E_SCENARIO_KEY, JSON.stringify(scenario));
};

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const importDevOnlyModule = async <T,>(path: string): Promise<T> => {
  try {
    const importer = new Function('path', 'return import(path)') as (modulePath: string) => Promise<T>;
    return await importer(path);
  } catch (error) {
    throw new Error(
      `[jozorDebug] Legacy VisibleTree diagnostic module is unavailable: ${path}. ` +
        `The VisibleTree pipeline is archived outside the active V3 runtime. ` +
        `Original error: ${getErrorMessage(error)}`
    );
  }
};

export const useJozorDebugApi = (setShowWelcome: (show: boolean) => void) => {
  const hasRestoredDebugScenarioRef = React.useRef(false);
  const setCurrentTreeId = useAppStore((state) => state.setCurrentTreeId);
  const setCurrentUserRole = useAppStore((state) => state.setCurrentUserRole);

  React.useEffect(() => {
    if (!import.meta.env.DEV) return;

    const debugWindow = window as Window & { jozorDebug?: JozorDebugApi };

    const restoreScenario = () => {
      if (hasRestoredDebugScenarioRef.current) return;
      const raw = sessionStorage.getItem(E2E_SCENARIO_KEY);
      if (!raw) return;

      try {
        const scenario = JSON.parse(raw) as DebugScenario;
        if (!scenario.people || Object.keys(scenario.people).length === 0) return;

        hasRestoredDebugScenarioRef.current = true;

        loadFullState({
          version: 1,
          people: scenario.people,
          focusId: scenario.focusId,
          settings: {},
          treeName: scenario.treeName,
        });
        setCurrentTreeId(scenario.treeId || null);
        setCurrentUserRole(scenario.role || null);
        useAppStore.getState().setUser(scenario.user || null);
        useAppStore.setState({ isE2E: true, authLoading: false });
        setShowWelcome(false);
      } catch (error) {
        console.warn('[jozorDebug] Failed to restore persisted scenario', error);
      }
    };

    restoreScenario();

    debugWindow.jozorDebug = {
      ...debugWindow.jozorDebug,
      clearSyncQueue: async () => {
        await deltaSyncService.clearOutgoingQueue();
      },
      forceSync: async () => {
        await deltaSyncService.flushPendingChanges();
      },
      getQueueSize: async () => {
        console.warn('[jozorDebug] Queue size inspection is only available through service logs.');
      },
      seedTreeScenario: ({
        people,
        focusId,
        role = 'owner',
        treeId = '00000000-0000-0000-0000-000000000001',
        treeName = 'E2E Tree',
        user,
      }) => {
        loadFullState({
          version: 1,
          people,
          focusId,
          settings: {},
          treeName,
        });
        setCurrentTreeId(treeId);
        setCurrentUserRole(role);
        useAppStore.getState().setUser(
          user === undefined
            ? {
                uid: 'e2e-user',
                displayName: 'E2E User',
                email: 'e2e@example.com',
                photoURL: '',
              }
            : user
        );
        useAppStore.setState({ isE2E: true, authLoading: false });
        setShowWelcome(false);
      },
      setRole: (role) => {
        useAppStore.getState().setCurrentUserRole(role);
        persistScenario({
          ...captureScenario(),
          role,
        });
      },
      setScenarioAccess: ({ role, user }) => {
        useAppStore.getState().setCurrentUserRole(role);
        if (user !== undefined) {
          useAppStore.getState().setUser(user);
        }
        persistScenario({
          ...captureScenario(),
          role,
          user: user !== undefined ? user : captureScenario().user,
        });
      },
      persistCurrentScenario: () => {
        persistScenario(captureScenario());
      },
      getStateSnapshot: () => captureScenario(),
      setFocusPerson: (focusId) => {
        useAppStore.getState().setFocusId(focusId);
        persistScenario({
          ...captureScenario(),
          focusId,
        });
      },
      setTreeSettings: (updates) => {
        const state = useAppStore.getState();
        state.setTreeSettings({
          ...state.treeSettings,
          ...updates,
        });
      },
      setFamilyGraphCollapsedIds: (ids) => {
        window.dispatchEvent(
          new CustomEvent('jozor-debug-set-family-graph-collapsed-ids', {
            detail: { ids },
          })
        );
      },
      clearFamilyGraphCollapsedIds: () => {
        window.dispatchEvent(new CustomEvent('jozor-debug-clear-family-graph-collapsed-ids'));
      },
      getFamilyGraphCollapsedIds: () => {
        return (
          (window as Window & { __jozorFamilyGraphCollapsedIds?: string[] })
            .__jozorFamilyGraphCollapsedIds ?? []
        );
      },
      setSyncStatus: (status) => {
        const state = useAppStore.getState();
        state.setSyncStatus({
          ...state.syncStatus,
          ...status,
        });
      },
      setInvitationTelemetry: (telemetry) => {
        useAppStore.getState().updateInvitationTelemetry(telemetry);
      },
      seedNotifications: (notifications) => {
        const state = useAppStore.getState();
        state.clearNotifications();
        notifications.forEach((notification) => {
          state.enqueueNotification(notification);
        });
      },
      validateVisibleTreePedigree: async (options) => {
        const { runVisibleTreePedigreeValidation, logVisibleTreePedigreeValidationRun } =
          await importDevOnlyModule<typeof import('../domain/legacy/visibleTree/visibleTreePedigreeValidation')>(
            '/domain/legacy/visibleTree/visibleTreePedigreeValidation.ts'
          );
        const state = useAppStore.getState();
        const run = runVisibleTreePedigreeValidation({
          people: state.people,
          activeFocusPersonId: state.focusId,
          baseSettings: state.treeSettings,
          options,
        });
        return logVisibleTreePedigreeValidationRun(run);
      },
      validateVisibleTreeFan: async (options) => {
        const { runVisibleTreeFanValidation, logVisibleTreeFanValidationRun } =
          await importDevOnlyModule<typeof import('../domain/legacy/visibleTree/visibleTreeFanValidation')>(
            '/domain/legacy/visibleTree/visibleTreeFanValidation.ts'
          );
        const state = useAppStore.getState();
        const run = runVisibleTreeFanValidation({
          people: state.people,
          activeFocusPersonId: state.focusId,
          baseSettings: state.treeSettings,
          options,
        });
        return logVisibleTreeFanValidationRun(run);
      },
      validateVisibleTreeStats: async (options) => {
        const { runVisibleTreeStatsValidation, logVisibleTreeStatsValidationRun } =
          await importDevOnlyModule<typeof import('../domain/legacy/visibleTree/visibleTreeStatsValidation')>(
            '/domain/legacy/visibleTree/visibleTreeStatsValidation.ts'
          );
        const state = useAppStore.getState();
        const run = runVisibleTreeStatsValidation({
          people: state.people,
          validationErrors: state.validationErrors,
          activeFocusPersonId: state.focusId,
          baseSettings: state.treeSettings,
          options,
        });
        return logVisibleTreeStatsValidationRun(run);
      },
      validateVisibleTreeHighlighting: async (options) => {
        const { runVisibleTreeHighlightingValidation, logVisibleTreeHighlightingValidationRun } =
          await importDevOnlyModule<typeof import('../domain/legacy/visibleTree/visibleTreeHighlightingValidation')>(
            '/domain/legacy/visibleTree/visibleTreeHighlightingValidation.ts'
          );
        const state = useAppStore.getState();
        const run = runVisibleTreeHighlightingValidation({
          people: state.people,
          activeFocusPersonId: state.focusId,
          baseSettings: state.treeSettings,
          options,
        });
        return logVisibleTreeHighlightingValidationRun(run);
      },
      validateVisibleTreeDescendant: async (options) => {
        const { runVisibleTreeDescendantValidation, logVisibleTreeDescendantValidationRun } =
          await importDevOnlyModule<typeof import('../domain/legacy/visibleTree/visibleTreeDescendantValidation')>(
            '/domain/legacy/visibleTree/visibleTreeDescendantValidation.ts'
          );
        const state = useAppStore.getState();
        const run = runVisibleTreeDescendantValidation({
          people: state.people,
          activeFocusPersonId: state.focusId,
          baseSettings: state.treeSettings,
          options,
        });
        return logVisibleTreeDescendantValidationRun(run);
      },
      getLayoutSnapshot: async () => {
        const layoutDebug = (window as Window & { __JOZOR_LAYOUT_DEBUG__?: unknown })
          .__JOZOR_LAYOUT_DEBUG__;
        return layoutDebug ?? null;
      },
      clearPersistedScenario: () => {
        sessionStorage.removeItem(E2E_SCENARIO_KEY);
      },
      resetScenario: () => {
        useAppStore.getState().startNewTree();
        useAppStore.getState().setCurrentTreeId(null);
        useAppStore.getState().setCurrentUserRole(null);
        useAppStore.getState().setUser(null);
        useAppStore.setState({ isE2E: false, authLoading: false });
        setShowWelcome(true);
      },
    };

    return () => {
      delete debugWindow.jozorDebug;
    };
  }, [setCurrentTreeId, setCurrentUserRole, setShowWelcome]);
};
