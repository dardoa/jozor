import React, { memo } from 'react';
import { ModalManager } from './ModalManager';
import { AppStateAndActions, ModalStateAndActions, GoogleSyncStateAndActions, WelcomeScreenLogicProps, FamilyActionsProps, ThemeLanguageProps } from '../types';

interface ModalManagerContainerProps {
  appState: AppStateAndActions;
  modals: ModalStateAndActions;
  googleSync: GoogleSyncStateAndActions;
  welcomeScreen: WelcomeScreenLogicProps;
  familyActions: FamilyActionsProps;
  themeLanguage: ThemeLanguageProps;
}

export const ModalManagerContainer: React.FC<ModalManagerContainerProps> = memo(({
  appState,
  modals,
  googleSync,
  welcomeScreen,
  familyActions,
  themeLanguage,
}) => {
  return (
    <ModalManager
      activeModal={modals.activeModal} setActiveModal={modals.setActiveModal}
      linkModal={modals.linkModal} setLinkModal={modals.setLinkModal}
      cleanTreeOptionsModal={modals.cleanTreeOptionsModal} setCleanTreeOptionsModal={modals.setCleanTreeOptionsModal}
      googleSyncChoiceModal={modals.googleSyncChoiceModal} setGoogleSyncChoiceModal={modals.setGoogleSyncChoiceModal}
      driveFileManagerModal={modals.driveFileManagerModal} setDriveFileManagerModal={modals.setDriveFileManagerModal}
      people={appState.people} 
      focusId={appState.focusId} setFocusId={appState.setFocusId} activePerson={appState.activePerson}
      user={googleSync.user}
      familyActions={familyActions}
      language={themeLanguage.language}
      onStartNewTree={welcomeScreen.handleStartNewTree}
      onTriggerImportFile={welcomeScreen.onTriggerImportFile}
      onLoadCloudData={googleSync.onLoadCloudData}
      onSaveNewCloudFile={googleSync.onSaveNewCloudFile}
      driveFiles={googleSync.driveFiles}
      currentActiveDriveFileId={googleSync.currentActiveDriveFileId}
      handleLoadDriveFile={googleSync.handleLoadDriveFile}
      handleSaveAsNewDriveFile={googleSync.handleSaveAsNewDriveFile}
      handleOverwriteExistingDriveFile={googleSync.handleOverwriteExistingDriveFile}
      handleDeleteDriveFile={googleSync.handleDeleteDriveFile}
      isSavingDriveFile={googleSync.isSavingDriveFile}
      isDeletingDriveFile={googleSync.isDeletingDriveFile}
      isListingDriveFiles={googleSync.isListingDriveFiles}
    />
  );
});