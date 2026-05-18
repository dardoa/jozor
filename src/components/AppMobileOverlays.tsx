import * as React from 'react';

import { useAppStore } from '../store/useAppStore';
import { ExportProgressOverlay } from './ui/ExportProgressOverlay';
import { MobileActionBar } from './ui/MobileActionBar';
import { OnboardingTour } from './OnboardingTour';

interface AppMobileOverlaysProps {
  isPresentMode: boolean;
  canEditActiveTree: boolean;
  setDetailsPanelOpen: (v: boolean) => void;
  openVaultTab: (tab: 'trees' | 'members' | 'security' | 'cloud' | 'stats') => void;
  openAppearanceLab: () => void;
  openAddPersonModal: () => void;
}

export const AppMobileOverlays: React.FC<AppMobileOverlaysProps> = ({
  isPresentMode,
  canEditActiveTree,
  setDetailsPanelOpen,
  openVaultTab,
  openAppearanceLab,
  openAddPersonModal,
}) => {
  const isSettingsDrawerOpen = useAppStore((state) => state.isSettingsDrawerOpen);
  const isVaultOpen = useAppStore((state) => state.isVaultOpen);

  return (
    <>
      <ExportProgressOverlay />
      <OnboardingTour setDetailsPanelOpen={setDetailsPanelOpen} />

      {!isPresentMode && (
        <MobileActionBar
          activeTab={isVaultOpen ? 'vault' : isSettingsDrawerOpen ? 'appearance' : null}
          canAddPerson={canEditActiveTree}
          onOpenVault={() => openVaultTab('trees')}
          onOpenAppearance={openAppearanceLab}
          onAddPerson={openAddPersonModal}
        />
      )}
    </>
  );
};
