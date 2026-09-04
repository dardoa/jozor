import * as React from 'react';

import type {
  AppNotification,
  InvitationTelemetry,
  Person,
  SyncStatus,
  TreeSettings,
  UserProfile,
} from '../../types';
import { deltaSyncService } from '../../services/deltaSyncService';
import { loadFullState, useAppStore } from '../../store/useAppStore';

const E2E_SCENARIO_KEY = 'jozor:e2e-scenario';

type DebugScenario = {
  people: Record<string, Person>;
  focusId?: string;
  role?: 'owner' | 'editor' | 'viewer' | null;
  treeId?: string | null;
  treeName?: string;
  user?: UserProfile | null;
  subscriptionTier?: 'free' | 'pro' | 'family';
  aiCloudQuotaRemaining?: number;
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
    subscriptionTier?: 'free' | 'pro' | 'family';
    aiCloudQuotaRemaining?: number;
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
  openDiagnostics: () => void;
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
    subscriptionTier: state.subscriptionTier,
    aiCloudQuotaRemaining: state.aiCloudQuotaRemaining,
  };
};

const persistScenario = (scenario: DebugScenario) => {
  sessionStorage.setItem(E2E_SCENARIO_KEY, JSON.stringify(scenario));
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
        useAppStore.setState({
          isE2E: true,
          authLoading: false,
          subscriptionTier: scenario.subscriptionTier ?? 'free',
          aiCloudQuotaRemaining: scenario.aiCloudQuotaRemaining ?? 0,
        });
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
        subscriptionTier = 'free',
        aiCloudQuotaRemaining = 0,
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
        useAppStore.setState({
          isE2E: true,
          authLoading: false,
          subscriptionTier,
          aiCloudQuotaRemaining,
        });
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
      openDiagnostics: () => {
        useAppStore.getState().setDiagnosticsDrawerOpen(true);
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
