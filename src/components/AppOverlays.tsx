import * as React from 'react';

import { AppMobileOverlays } from './AppMobileOverlays';
import { AppPersonOverlays } from './AppPersonOverlays';
import { AppSystemOverlays } from './AppSystemOverlays';
import type {
  AppStateAndActions,
  AuthProps,
  FamilyActionsProps,
  GoogleSyncStateAndActions,
  ModalStateAndActions,
  ToolsActionsProps,
  TreeSettings,
  ViewSettingsProps,
} from '../types';

interface AppOverlaysProps {
  appState: AppStateAndActions;
  modals: ModalStateAndActions;
  googleSync: GoogleSyncStateAndActions;
  viewSettings: {
    currentUserRole?: ViewSettingsProps['currentUserRole'];
  };
  toolsActions: ToolsActionsProps;
  detailsPanelFamilyActions: FamilyActionsProps;
  auth: AuthProps;
  isPresentMode: boolean;
  detailsPanelOpen: boolean;
  setDetailsPanelOpen: (v: boolean) => void;
  focusAndNavigate: (personId: string) => void;
  openVaultTab: (tab: 'trees' | 'members' | 'security' | 'cloud' | 'stats') => void;
  openAppearanceLab: () => void;
  openAddPersonModal: () => void;
  effectiveTreeSettings: TreeSettings;
  canEditActiveTree: boolean;
}

export const AppOverlays: React.FC<AppOverlaysProps> = ({
  appState,
  modals,
  googleSync,
  viewSettings,
  toolsActions,
  detailsPanelFamilyActions,
  auth,
  isPresentMode,
  detailsPanelOpen,
  setDetailsPanelOpen,
  focusAndNavigate,
  openVaultTab,
  openAppearanceLab,
  openAddPersonModal,
  effectiveTreeSettings,
  canEditActiveTree,
}) => (
  <>
    <AppPersonOverlays
      appState={appState}
      modals={modals}
      toolsActions={toolsActions}
      detailsPanelFamilyActions={detailsPanelFamilyActions}
      auth={auth}
      isPresentMode={isPresentMode}
      detailsPanelOpen={detailsPanelOpen}
      setDetailsPanelOpen={setDetailsPanelOpen}
      focusAndNavigate={focusAndNavigate}
      effectiveTreeSettings={effectiveTreeSettings}
      canEditActiveTree={canEditActiveTree}
      currentUserRole={viewSettings.currentUserRole}
    />
    <AppSystemOverlays
      appState={appState}
      modals={modals}
      googleSync={googleSync}
      auth={auth}
      focusAndNavigate={focusAndNavigate}
      openVaultTab={openVaultTab}
      currentUserRole={viewSettings.currentUserRole}
    />
    <AppMobileOverlays
      isPresentMode={isPresentMode}
      canEditActiveTree={canEditActiveTree}
      setDetailsPanelOpen={setDetailsPanelOpen}
      openVaultTab={openVaultTab}
      openAppearanceLab={openAppearanceLab}
      openAddPersonModal={openAddPersonModal}
    />
  </>
);
