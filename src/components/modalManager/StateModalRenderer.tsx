import type { ModalManagerProps } from './modalManagerTypes';
import {
  CleanTreeOptionsModal,
  GlobalSettingsModal,
  GoogleSyncChoiceModal,
  LinkPersonModal,
  SharedTreePromptModal,
} from './lazyModals';

export const StateModalRenderer = (modal: ModalManagerProps) => (
  <>
    {modal.activeModal === 'link' ? (
      <LinkPersonModal
        isOpen={true}
        onClose={() => modal.setActiveModal('none')}
        people={modal.people}
        type={modal.linkModal.type}
        gender={modal.linkModal.gender}
        currentPersonId={modal.focusId}
        familyActions={modal.familyActions}
        initialMode={modal.linkModal.initialMode}
      />
    ) : null}

    {modal.activeModal === 'cleanTreeOptions' ? (
      <CleanTreeOptionsModal
        isOpen={true}
        onClose={() => modal.setActiveModal('none')}
        onStartNewTree={modal.onStartNewTree}
        onTriggerImportFile={modal.onTriggerImportFile}
        language={modal.language}
      />
    ) : null}

    {modal.activeModal === 'googleSyncChoice' ? (
      <GoogleSyncChoiceModal
        isOpen={true}
        onClose={() => modal.setActiveModal('none')}
        onLoadCloud={() => modal.onLoadCloudData(modal.googleSyncChoiceDriveFileId!)}
        onSaveNewCloud={modal.onSaveNewCloudFile}
        onOpenDriveManager={() => {
          modal.setActiveModal('none');
          modal.googleSync.onOpenCloudBackups();
        }}
        driveFileId={modal.googleSyncChoiceDriveFileId}
      />
    ) : null}

    {modal.activeModal === 'sharedTreePrompt' ? (
      <SharedTreePromptModal
        isOpen={true}
        onClose={() => modal.setSharedTreePromptModal({ isOpen: false, sharedTrees: [] })}
        sharedTrees={modal.sharedTreesPayload}
        onSelect={async (tree) => {
          modal.setSharedTreePromptModal({ isOpen: false, sharedTrees: [] });
          modal.onTreeSelected(tree.id);
        }}
      />
    ) : null}

    {modal.activeModal === 'globalSettings' ? (
      <GlobalSettingsModal
        isOpen={true}
        onClose={() => modal.setActiveModal('none')}
      />
    ) : null}
  </>
);
