import * as React from 'react';

import { EMPTY_STRING } from '../constants';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../context/TranslationContext';
import type {
  AppStateAndActions,
  AuthProps,
  GoogleSyncStateAndActions,
  ModalStateAndActions,
  ViewSettingsProps,
} from '../types';

const ActivityLogDrawer = React.lazy(() => import('../features/activity-log').then(m => ({ default: m.ActivityLogDrawer })));
const DiagnosticsDrawer = React.lazy(() =>
  import('../features/diagnostics').then((module) => ({ default: module.DiagnosticsDrawer }))
);
const SettingsDrawer = React.lazy(() =>
  import('./ui/SettingsDrawer').then((module) => ({ default: module.SettingsDrawer }))
);
const TreeControlCenter = React.lazy(() =>
  import('../features/tree-control').then((module) => ({ default: module.TreeControlCenter }))
);
const TreeDiscussionDrawer = React.lazy(() => import('../features/discussions').then(m => ({ default: m.TreeDiscussionDrawer })));
import { DiscussionListener } from '../features/discussions';

interface AppSystemOverlaysProps {
  appState: AppStateAndActions;
  modals: ModalStateAndActions;
  googleSync: GoogleSyncStateAndActions;
  auth: AuthProps;
  focusAndNavigate: (personId: string) => void;
  openVaultTab: (tab: 'trees' | 'members' | 'security' | 'cloud' | 'stats') => void;
  currentUserRole?: ViewSettingsProps['currentUserRole'];
}

export const AppSystemOverlays: React.FC<AppSystemOverlaysProps> = ({
  appState,
  googleSync,
  auth,
  focusAndNavigate,
  openVaultTab,
  currentUserRole,
}) => {
  const { t, language } = useTranslation();
  const { people, focusId } = appState;
  const isSettingsDrawerOpen = useAppStore((state) => state.isSettingsDrawerOpen);
  const isDiagnosticsDrawerOpen = useAppStore((state) => state.isDiagnosticsDrawerOpen);
  const isActivityLogOpen = useAppStore((state) => state.isActivityLogOpen);
  const setActivityLogOpen = useAppStore((state) => state.setActivityLogOpen);
  const setDiagnosticsDrawerOpen = useAppStore((state) => state.setDiagnosticsDrawerOpen);
  const isTreeControlCenterOpen = useAppStore((state) => state.isTreeControlCenterOpen);
  const setTreeControlCenterOpen = useAppStore((state) => state.setTreeControlCenterOpen);
  const isDiscussionOpen = useAppStore((state) => state.isDiscussionOpen);
  const setDiscussionOpen = useAppStore((state) => state.setDiscussionOpen);
  const treeName = useAppStore((state) => state.treeName);
  const setTreeName = useAppStore((state) => state.setTreeName);
  const currentRootName = focusId ? [people[focusId]?.firstName, people[focusId]?.lastName].filter(Boolean).join(' ').trim() : EMPTY_STRING;

  return (
    <>
      {isActivityLogOpen ? (
        <React.Suspense fallback={null}>
          <ActivityLogDrawer
            isOpen={true}
            onClose={() => setActivityLogOpen(false)}
            treeId={appState.currentTreeId || EMPTY_STRING}
            onNavigate={focusAndNavigate}
          />
        </React.Suspense>
      ) : null}

      {isSettingsDrawerOpen ? (
        <React.Suspense fallback={null}>
          <SettingsDrawer />
        </React.Suspense>
      ) : null}

      {isDiagnosticsDrawerOpen ? (
        <React.Suspense fallback={null}>
          <DiagnosticsDrawer />
        </React.Suspense>
      ) : null}

      {isTreeControlCenterOpen ? (
        <React.Suspense fallback={null}>
          <TreeControlCenter
            isOpen={isTreeControlCenterOpen}
            onClose={() => setTreeControlCenterOpen(false)}
            treeName={treeName?.trim() || t.untitledTree}
            treeId={appState.currentTreeId}
            ownerId={auth.user?.uid || EMPTY_STRING}
            ownerEmail={auth.user?.email || EMPTY_STRING}
            language={language}
            roleLabel={
              currentUserRole === 'owner'
                ? t.roles.owner
                : currentUserRole === 'editor'
                  ? t.roles.editor
                  : currentUserRole === 'viewer'
                    ? t.roles.viewer
                    : t.roles.unknown
            }
            peopleCount={Object.keys(people).length}
            people={Object.values(people)}
            currentRootName={currentRootName || null}
            currentRootId={focusId || null}
            hasPendingSync={auth.syncStatus.state !== 'synced'}
            googleSync={{
              handleCreateSnapshot: googleSync.handleCreateSnapshot,
              handleRestoreSnapshot: googleSync.handleRestoreSnapshot,
            }}
            onRootChanged={focusAndNavigate}
            onTreeRenamed={setTreeName}
            onOpenShare={() => {
              setTreeControlCenterOpen(false);
              openVaultTab('members');
            }}
            onOpenDiagnostics={() => {
              setTreeControlCenterOpen(false);
              setDiagnosticsDrawerOpen(true);
            }}
          />
        </React.Suspense>
      ) : null}
      <DiscussionListener />
      {isDiscussionOpen ? (
        <React.Suspense fallback={null}>
          <TreeDiscussionDrawer
            isOpen={isDiscussionOpen}
            onClose={() => setDiscussionOpen(false)}
            treeId={appState.currentTreeId || EMPTY_STRING}
          />
        </React.Suspense>
      ) : null}
    </>
  );
};
