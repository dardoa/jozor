import React, { memo } from 'react';
import { ModalManager } from './ModalManager';
import {
  AppStateAndActions,
  ModalStateAndActions,
  GoogleSyncStateAndActions,
  WelcomeScreenLogicProps,
  FamilyActionsProps,
  ThemeLanguageProps,
  FullState,
  Person,
  AuthProps,
} from '../types';
import { loadFullState } from '../store/useAppStore';
import { validatePerson } from '../utils/familyLogic';

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
    return (
      <ModalManager
        activeModal={modals.activeModal}
        setActiveModal={modals.setActiveModal}
        linkModal={modals.linkModal}
        setLinkModal={modals.setLinkModal}
        cleanTreeOptionsModal={modals.cleanTreeOptionsModal}
        setCleanTreeOptionsModal={modals.setCleanTreeOptionsModal}
        googleSyncChoiceModal={modals.googleSyncChoiceModal}
        setGoogleSyncChoiceModal={modals.setGoogleSyncChoiceModal}
        driveFileManagerModal={modals.driveFileManagerModal}
        setDriveFileManagerModal={modals.setDriveFileManagerModal}
        treeManagerModal={modals.treeManagerModal}
        setTreeManagerModal={modals.setTreeManagerModal}
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
        driveFiles={googleSync.driveFiles}
        currentActiveDriveFileId={googleSync.currentActiveDriveFileId}
        handleLoadDriveFile={googleSync.handleLoadDriveFile}
        handleSaveAsNewDriveFile={googleSync.handleSaveAsNewDriveFile}
        handleOverwriteExistingDriveFile={googleSync.handleOverwriteExistingDriveFile}
        handleDeleteDriveFile={googleSync.handleDeleteDriveFile}
        isSavingDriveFile={googleSync.isSavingDriveFile}
        isDeletingDriveFile={googleSync.isDeletingDriveFile}
        isListingDriveFiles={googleSync.isListingDriveFiles}
        refreshDriveFiles={googleSync.refreshDriveFiles}
        onGoogleLogin={auth.onLogin}
        sharedTreePromptModal={modals.sharedTreePromptModal}
        setSharedTreePromptModal={modals.setSharedTreePromptModal}
        onImportLocalFile={async (data: unknown) => {
          try {
            if (!data || typeof data !== 'object') {
              throw new Error('Invalid import format');
            }

            const anyData = data as any;

            // Case 1: FullState format { version, people, settings, ... }
            if (anyData.people && typeof anyData.people === 'object') {
              const fullState = anyData as FullState;
              loadFullState(fullState);
              return;
            }

            // Case 2: Legacy format: Record<string, Person>
            const values = Object.values(anyData as Record<string, unknown>);
            const looksLikePeople = values.some(
              (v: unknown) =>
                v &&
                typeof v === 'object' &&
                (v as Person).id &&
                typeof (v as Person).firstName === 'string'
            );

            if (!looksLikePeople) {
              throw new Error('No valid people data found in imported file');
            }

            const importedPeople = anyData as Record<string, Person>;
            const validated: Record<string, Person> = {};
            Object.keys(importedPeople).forEach((k) => {
              validated[k] = validatePerson(importedPeople[k]);
            });

            if (Object.keys(validated).length === 0) {
              throw new Error('No valid data after validation');
            }

            const focusId = Object.keys(validated)[0] ?? undefined;
            loadFullState({ people: validated, focusId } as Partial<FullState> as FullState);
          } catch (e) {
            console.error('Local import failed', e);
            // Leave user feedback to the caller (DriveFileManagerModal already shows toasts)
          }
        }}
        snapshotHistoryModal={modals.snapshotHistoryModal}
        setSnapshotHistoryModal={modals.setSnapshotHistoryModal}
        googleSync={googleSync}
        themeLanguage={themeLanguage}
        adminHubModal={modals.adminHubModal}
        setAdminHubModal={modals.setAdminHubModal}
        globalSettingsModal={modals.globalSettingsModal}
        setGlobalSettingsModal={modals.setGlobalSettingsModal}
      />
    );
  }
);
