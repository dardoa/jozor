import React, { memo } from 'react';
import { ModalManager } from './ModalManager';
import { Person, Language, UserProfile, Gender, FamilyActionsProps, DriveFile } from '../types'; // Import DriveFile

interface ModalManagerContainerProps {
  activeModal: 'none' | 'calculator' | 'stats' | 'chat' | 'consistency' | 'timeline' | 'share' | 'story' | 'map';
  setActiveModal: (m: any) => void;
  linkModal: { isOpen: boolean; type: 'parent' | 'spouse' | 'child' | null; gender: Gender | null; };
  setLinkModal: (val: any) => void;
  cleanTreeOptionsModal: { isOpen: boolean };
  setCleanTreeOptionsModal: (val: { isOpen: boolean }) => void;
  googleSyncChoiceModal: { isOpen: boolean; driveFileId: string | null; }; // New prop
  setGoogleSyncChoiceModal: (val: { isOpen: boolean; driveFileId: string | null; }) => void; // New prop setter
  driveFileManagerModal: { isOpen: boolean }; // New prop
  setDriveFileManagerModal: (val: { isOpen: boolean }) => void; // New prop setter
  people: Record<string, Person>;
  focusId: string;
  setFocusId: (id: string) => void;
  activePerson?: Person;
  user: UserProfile | null;
  familyActions: FamilyActionsProps;
  language: Language;
  onStartNewTree: () => void;
  onTriggerImportFile: () => void;
  onLoadCloudData: (fileId: string) => Promise<void>; // New prop
  onSaveNewCloudFile: () => Promise<void>; // New prop
  // New props for DriveFileManagerModal
  driveFiles: DriveFile[];
  currentActiveDriveFileId: string | null;
  handleLoadDriveFile: (fileId: string) => Promise<void>;
  handleSaveAsNewDriveFile: (fileName: string) => Promise<void>;
  handleOverwriteExistingDriveFile: (fileId: string) => Promise<void>;
  handleDeleteDriveFile: (fileId: string) => Promise<void>;
  isSavingDriveFile: boolean;
  isDeletingDriveFile: boolean;
  isListingDriveFiles: boolean;
}

export const ModalManagerContainer: React.FC<ModalManagerContainerProps> = memo(({
  activeModal,
  setActiveModal,
  linkModal,
  setLinkModal,
  cleanTreeOptionsModal,
  setCleanTreeOptionsModal,
  googleSyncChoiceModal, // Destructure new prop
  setGoogleSyncChoiceModal, // Destructure new prop setter
  driveFileManagerModal, // Destructure new prop
  setDriveFileManagerModal, // Destructure new prop setter
  people,
  focusId,
  setFocusId,
  activePerson,
  user,
  familyActions,
  language,
  onStartNewTree,
  onTriggerImportFile,
  onLoadCloudData, // Destructure new prop
  onSaveNewCloudFile, // Destructure new prop
  // New props for DriveFileManagerModal
  driveFiles,
  currentActiveDriveFileId,
  handleLoadDriveFile,
  handleSaveAsNewDriveFile,
  handleOverwriteExistingDriveFile,
  handleDeleteDriveFile,
  isSavingDriveFile,
  isDeletingDriveFile,
  isListingDriveFiles,
}) => {
  return (
    <ModalManager
      activeModal={activeModal}
      setActiveModal={setActiveModal}
      linkModal={linkModal}
      setLinkModal={setLinkModal}
      cleanTreeOptionsModal={cleanTreeOptionsModal}
      setCleanTreeOptionsModal={setCleanTreeOptionsModal}
      googleSyncChoiceModal={googleSyncChoiceModal} // Pass new prop
      setGoogleSyncChoiceModal={setGoogleSyncChoiceModal} // Pass new prop setter
      driveFileManagerModal={driveFileManagerModal} // Pass new prop
      setDriveFileManagerModal={setDriveFileManagerModal} // Pass new prop setter
      people={people}
      focusId={focusId}
      setFocusId={setFocusId}
      activePerson={activePerson}
      user={user}
      familyActions={familyActions}
      language={language}
      onStartNewTree={onStartNewTree}
      onTriggerImportFile={onTriggerImportFile}
      onLoadCloudData={onLoadCloudData} // Pass new prop
      onSaveNewCloudFile={onSaveNewCloudFile} // Pass new prop
      // New props for DriveFileManagerModal
      driveFiles={driveFiles}
      currentActiveDriveFileId={currentActiveDriveFileId}
      handleLoadDriveFile={handleLoadDriveFile}
      handleSaveAsNewDriveFile={handleSaveAsNewDriveFile}
      handleOverwriteExistingDriveFile={handleOverwriteExistingDriveFile}
      handleDeleteDriveFile={handleDeleteDriveFile}
      isSavingDriveFile={isSavingDriveFile}
      isDeletingDriveFile={isDeletingDriveFile}
      isListingDriveFiles={isListingDriveFiles}
    />
  );
});