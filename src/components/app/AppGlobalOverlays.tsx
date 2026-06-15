import * as React from 'react';
import type {
  AppStateAndActions,
  AuthProps,
  ExportActionsProps,
  FamilyActionsProps,
  GoogleSyncStateAndActions,
  ModalStateAndActions,
  ThemeLanguageProps,
  ToolsActionsProps,
  WelcomeScreenLogicProps,
} from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { ModalManagerContainer } from '../ModalManagerContainer';

const TheVaultDrawer = React.lazy(() =>
  import('../../features/the-vault').then((module) => ({
    default: module.TheVaultDrawer,
  }))
);
const DiagnosticsDrawer = React.lazy(() =>
  import('../../features/diagnostics').then((module) => ({
    default: module.DiagnosticsDrawer,
  }))
);

interface AppGlobalOverlaysProps {
  appState: AppStateAndActions;
  modals: ModalStateAndActions;
  googleSync: GoogleSyncStateAndActions;
  welcomeScreen: WelcomeScreenLogicProps;
  familyActions: FamilyActionsProps;
  themeLanguage: ThemeLanguageProps;
  auth: AuthProps;
  exportActions: ExportActionsProps;
  toolsActions: ToolsActionsProps;
}

export const AppGlobalOverlays: React.FC<AppGlobalOverlaysProps> = ({
  appState,
  modals,
  googleSync,
  welcomeScreen,
  familyActions,
  themeLanguage,
  auth,
  exportActions,
  toolsActions,
}) => {
  const isVaultOpen = useAppStore((state) => state.isVaultOpen);
  const isDiagnosticsDrawerOpen = useAppStore(
    (state) => state.isDiagnosticsDrawerOpen
  );
  const setActivityLogOpen = useAppStore((state) => state.setActivityLogOpen);

  return (
    <>
      {isVaultOpen ? (
        <React.Suspense fallback={null}>
          <TheVaultDrawer
            googleSync={googleSync}
            auth={auth}
            exportActions={exportActions}
            toolsActions={toolsActions}
            onOpenDiagnostics={() => {
              useAppStore.getState().setDiagnosticsDrawerOpen(true);
            }}
            onOpenActivityLog={() => setActivityLogOpen(true)}
            onOpenCleanTree={modals.onOpenCleanTreeOptions}
          />
        </React.Suspense>
      ) : null}

      {isDiagnosticsDrawerOpen ? (
        <React.Suspense fallback={null}>
          <DiagnosticsDrawer />
        </React.Suspense>
      ) : null}

      <ModalManagerContainer
        appState={appState}
        modals={modals}
        googleSync={googleSync}
        welcomeScreen={welcomeScreen}
        familyActions={familyActions}
        themeLanguage={themeLanguage}
        auth={auth}
      />
    </>
  );
};
