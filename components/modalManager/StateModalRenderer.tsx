import { EMPTY_STRING } from '../../constants';
import type { ModalManagerProps } from './modalManagerTypes';
import {
  CleanTreeOptionsModal,
  DriveFileManagerModal,
  GlobalSettingsModal,
  GoogleSyncChoiceModal,
  LinkPersonModal,
  SharedTreePromptModal,
  SnapshotHistoryModal,
  TreeManagerModal,
} from './lazyModals';

export const StateModalRenderer = (modal: ModalManagerProps) => (
  <>
    {modal.linkModal.isOpen ? (
      <LinkPersonModal
        isOpen={true}
        onClose={() => modal.setLinkModal({ ...modal.linkModal, isOpen: false })}
        people={modal.people}
        type={modal.linkModal.type}
        gender={modal.linkModal.gender}
        currentPersonId={modal.focusId}
        familyActions={modal.familyActions}
        initialMode={modal.linkModal.initialMode}
      />
    ) : null}

    {modal.cleanTreeOptionsModal.isOpen ? (
      <CleanTreeOptionsModal
        isOpen={true}
        onClose={() => modal.setCleanTreeOptionsModal({ isOpen: false })}
        onStartNewTree={modal.onStartNewTree}
        onTriggerImportFile={modal.onTriggerImportFile}
        language={modal.language}
      />
    ) : null}

    {modal.googleSyncChoiceModal.isOpen ? (
      <GoogleSyncChoiceModal
        isOpen={true}
        onClose={() => modal.setGoogleSyncChoiceModal({ isOpen: false, driveFileId: null })}
        onLoadCloud={() => modal.onLoadCloudData(modal.googleSyncChoiceModal.driveFileId!)}
        onSaveNewCloud={modal.onSaveNewCloudFile}
        onOpenDriveManager={() => {
          modal.setGoogleSyncChoiceModal({ isOpen: false, driveFileId: null });
          modal.setDriveFileManagerModal({ isOpen: true });
        }}
        driveFileId={modal.googleSyncChoiceModal.driveFileId}
      />
    ) : null}

    {modal.driveFileManagerModal.isOpen ? (
      <DriveFileManagerModal
        isOpen={true}
        onClose={() => modal.setDriveFileManagerModal({ isOpen: false })}
        files={modal.driveFiles}
        currentActiveFileId={modal.currentActiveDriveFileId}
        onLoadFile={modal.handleLoadDriveFile}
        onSaveAsNewFile={modal.handleSaveAsNewDriveFile}
        onOverwriteExistingFile={modal.handleOverwriteExistingDriveFile}
        onDeleteFile={modal.handleDeleteDriveFile}
        refreshDriveFiles={modal.refreshDriveFiles}
        isSaving={modal.isSavingDriveFile}
        isDeleting={modal.isDeletingDriveFile}
        isListing={modal.isListingDriveFiles}
        onImportLocalFile={modal.onImportLocalFile}
      />
    ) : null}

    {modal.treeManagerModal.isOpen ? (
      <TreeManagerModal
        isOpen={true}
        onClose={() => modal.setTreeManagerModal({ isOpen: false })}
        ownerId={modal.user?.uid || EMPTY_STRING}
        userEmail={modal.user?.email || EMPTY_STRING}
        activeTreeId={modal.activeTreeId}
        onTreeSelected={modal.onTreeSelected}
      />
    ) : null}

    {modal.sharedTreePromptModal.isOpen ? (
      <SharedTreePromptModal
        isOpen={true}
        onClose={() => modal.setSharedTreePromptModal({ isOpen: false, sharedTrees: [] })}
        sharedTrees={modal.sharedTreePromptModal.sharedTrees}
        onSelect={async (tree) => {
          modal.setSharedTreePromptModal({ isOpen: false, sharedTrees: [] });
          modal.onTreeSelected(tree.id);
        }}
      />
    ) : null}

    {modal.snapshotHistoryModal.isOpen ? (
      <SnapshotHistoryModal
        isOpen={true}
        onClose={() => modal.setSnapshotHistoryModal({ isOpen: false })}
        googleSync={modal.googleSync}
        themeLanguage={modal.themeLanguage}
      />
    ) : null}

    {modal.globalSettingsModal.isOpen ? (
      <GlobalSettingsModal
        isOpen={true}
        onClose={() => modal.setGlobalSettingsModal({ isOpen: false })}
      />
    ) : null}
  </>
);
