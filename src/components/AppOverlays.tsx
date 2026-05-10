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
} from '../types';

interface AppOverlaysProps {
  appState: AppStateAndActions;
  modals: ModalStateAndActions;
  googleSync: GoogleSyncStateAndActions;
  viewSettings: {
    currentUserRole?: string | null;
    onOpenSnapshotHistory?: () => void;
  };
  toolsActions: ToolsActionsProps;
  sidebarFamilyActions: FamilyActionsProps;
  auth: AuthProps;
  isPresentMode: boolean;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  focusAndNavigate: (personId: string) => void;
  openVaultTab: (tab: 'trees' | 'members' | 'security' | 'cloud' | 'stats') => void;
  openAppearanceLab: () => void;
  openAddPersonModal: () => void;
  effectiveTreeSettings: TreeSettings;
  canEditActiveTree: boolean;
  isTreeOwner: boolean;
}

export const AppOverlays: React.FC<AppOverlaysProps> = ({
  appState,
  modals,
  googleSync,
  viewSettings,
  toolsActions,
  sidebarFamilyActions,
  auth,
  isPresentMode,
  sidebarOpen,
  setSidebarOpen,
  focusAndNavigate,
  openVaultTab,
  openAppearanceLab,
  openAddPersonModal,
  effectiveTreeSettings,
  canEditActiveTree,
  isTreeOwner,
}) => (
  <>
    <AppPersonOverlays
      appState={appState}
      modals={modals}
      toolsActions={toolsActions}
      sidebarFamilyActions={sidebarFamilyActions}
      auth={auth}
      isPresentMode={isPresentMode}
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      focusAndNavigate={focusAndNavigate}
      effectiveTreeSettings={effectiveTreeSettings}
      canEditActiveTree={canEditActiveTree}
      isTreeOwner={isTreeOwner}
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
      setSidebarOpen={setSidebarOpen}
      openVaultTab={openVaultTab}
      openAppearanceLab={openAppearanceLab}
      openAddPersonModal={openAddPersonModal}
    />
  </>
);
