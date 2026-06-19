import React, { memo } from 'react';
import { ModalManager } from './ModalManager';
import {
  AppStateAndActions,
  ModalStateAndActions,
  GoogleSyncStateAndActions,
  WelcomeScreenLogicProps,
  FamilyActionsProps,
  ThemeLanguageProps,
  AuthProps,
} from '../types';

interface ModalManagerContainerProps {
  appState: AppStateAndActions;
  modals: ModalStateAndActions;
  googleSync: GoogleSyncStateAndActions;
  welcomeScreen: WelcomeScreenLogicProps;
  familyActions: FamilyActionsProps;
  themeLanguage: ThemeLanguageProps;
  auth: AuthProps;
}

export const ModalManagerContainer: React.FC<ModalManagerContainerProps> = memo(
  ({ appState, modals, googleSync, welcomeScreen, familyActions, themeLanguage, auth }) => {
    React.useEffect(() => {
      const handleOpenPaywall = () => {
        modals.setActiveModal('paywall');
      };
      window.addEventListener('open-paywall', handleOpenPaywall);
      return () => window.removeEventListener('open-paywall', handleOpenPaywall);
    }, [modals]);

    return (
      <ModalManager
        activeModal={modals.activeModal}
        setActiveModal={modals.setActiveModal}
        modalContext={modals.modalContext}
        geographicJourneyMode={modals.geographicJourneyMode}
        linkModal={modals.linkModal}
        setLinkModal={modals.setLinkModal}
        googleSyncChoiceDriveFileId={modals.googleSyncChoiceDriveFileId}
        setGoogleSyncChoiceDriveFileId={modals.setGoogleSyncChoiceDriveFileId}
        activeTreeId={appState.currentTreeId}
        onTreeSelected={appState.setCurrentTreeId}
        people={appState.people}
        focusId={appState.focusId}
        setFocusId={appState.setFocusId}
        activePerson={appState.activePerson}
        user={auth.user}
        familyActions={familyActions}
        language={themeLanguage.language}
        onStartNewTree={welcomeScreen.handleStartNewTree}
        onTriggerImportFile={welcomeScreen.onTriggerImportFile}
        onLoadCloudData={googleSync.onLoadCloudData}
        onSaveNewCloudFile={googleSync.onSaveNewCloudFile}
        currentActiveDriveFileId={googleSync.currentActiveDriveFileId}
        onGoogleLogin={auth.onLogin}
        sharedTreesPayload={modals.sharedTreesPayload}
        setSharedTreesPayload={modals.setSharedTreesPayload}
        setSharedTreePromptModal={modals.setSharedTreePromptModal}
        googleSync={googleSync}
        themeLanguage={themeLanguage}
      />
    );
  }
);
