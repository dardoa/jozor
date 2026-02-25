import { Suspense, lazy } from 'react';
import {
  AppStateAndActions,
  ModalStateAndActions,
  GoogleSyncStateAndActions,
  WelcomeScreenLogicProps,
  FamilyActionsProps,
  ThemeLanguageProps,
} from '../types';
import { useAppStore } from '../store/useAppStore';
import { LoadingSpinner } from './LoadingSpinner';
import { LinkPersonModal } from './LinkPersonModal';
import { CleanTreeOptionsModal } from './CleanTreeOptionsModal';
import { GoogleSyncChoiceModal } from './GoogleSyncChoiceModal';
import { DriveFileManagerModal } from './DriveFileManagerModal';
import { TreeManagerModal } from './modals/TreeManagerModal';
import { SharedTreePromptModal } from './SharedTreePromptModal';
import { SharedTreeSummary } from '../services/supabaseTreeService';

// Lazy Load Modals
const RelationshipModal = lazy(() =>
  import('./RelationshipModal').then((module) => ({ default: module.RelationshipModal }))
);
const StatisticsDashboard = lazy(() =>
  import('./statistics/StatisticsDashboard').then((module) => ({ default: module.StatisticsDashboard }))
);
const AncestorChatModal = lazy(() =>
  import('./AncestorChatModal').then((module) => ({ default: module.AncestorChatModal }))
);

const TimelineModal = lazy(() =>
  import('./TimelineModal').then((module) => ({ default: module.TimelineModal }))
);
const ShareModal = lazy(() =>
  import('./ShareModal').then((module) => ({ default: module.ShareModal }))
);
const StoryModal = lazy(() =>
  import('./StoryModal').then((module) => ({ default: module.StoryModal }))
);
const GeoMapModal = lazy(() =>
  import('./GeoMapModal').then((module) => ({ default: module.GeoMapModal }))
);
const LayoutSettingsModal = lazy(() =>
  import('./modals/LayoutSettingsModal').then((module) => ({ default: module.LayoutSettingsModal }))
);
const UnifiedLoginModal = lazy(() =>
  import('./modals/UnifiedLoginModal').then((module) => ({ default: module.UnifiedLoginModal }))
);
const SnapshotHistoryModal = lazy(() =>
  import('./SnapshotHistoryModal').then((module) => ({ default: module.SnapshotHistoryModal }))
);
const AdminHubModal = lazy(() =>
  import('./modals/AdminHubModal').then((module) => ({ default: module.AdminHubModal }))
);
const GlobalSettingsModal = lazy(() =>
  import('./modals/GlobalSettingsModal').then((module) => ({ default: module.GlobalSettingsModal }))
);

// Define props for ModalManager directly here, matching the structure from ModalManagerContainer
interface ModalManagerProps {
  activeModal: ModalStateAndActions['activeModal'];
  setActiveModal: ModalStateAndActions['setActiveModal'];
  linkModal: ModalStateAndActions['linkModal'];
  setLinkModal: ModalStateAndActions['setLinkModal'];
  cleanTreeOptionsModal: ModalStateAndActions['cleanTreeOptionsModal'];
  setCleanTreeOptionsModal: ModalStateAndActions['setCleanTreeOptionsModal'];
  googleSyncChoiceModal: ModalStateAndActions['googleSyncChoiceModal'];
  setGoogleSyncChoiceModal: ModalStateAndActions['setGoogleSyncChoiceModal'];
  driveFileManagerModal: ModalStateAndActions['driveFileManagerModal'];
  setDriveFileManagerModal: ModalStateAndActions['setDriveFileManagerModal'];
  people: AppStateAndActions['people'];
  focusId: AppStateAndActions['focusId'];
  setFocusId: AppStateAndActions['setFocusId'];
  activePerson?: AppStateAndActions['activePerson'];
  user: GoogleSyncStateAndActions['user'];
  familyActions: FamilyActionsProps;
  language: ThemeLanguageProps['language'];
  onStartNewTree: WelcomeScreenLogicProps['handleStartNewTree'];
  onTriggerImportFile: WelcomeScreenLogicProps['onTriggerImportFile'];
  onLoadCloudData: GoogleSyncStateAndActions['onLoadCloudData'];
  onSaveNewCloudFile: GoogleSyncStateAndActions['onSaveNewCloudFile'];
  driveFiles: GoogleSyncStateAndActions['driveFiles'];
  currentActiveDriveFileId: GoogleSyncStateAndActions['currentActiveDriveFileId'];
  handleLoadDriveFile: GoogleSyncStateAndActions['handleLoadDriveFile'];
  handleSaveAsNewDriveFile: GoogleSyncStateAndActions['handleSaveAsNewDriveFile'];
  handleOverwriteExistingDriveFile: GoogleSyncStateAndActions['handleOverwriteExistingDriveFile'];
  handleDeleteDriveFile: GoogleSyncStateAndActions['handleDeleteDriveFile'];
  isSavingDriveFile: GoogleSyncStateAndActions['isSaving'];
  isDeletingDriveFile: GoogleSyncStateAndActions['isDeleting'];
  isListingDriveFiles: GoogleSyncStateAndActions['isListing'];
  refreshDriveFiles: GoogleSyncStateAndActions['refreshDriveFiles'];
  onImportLocalFile: (data: unknown) => Promise<void>;
  onGoogleLogin: () => Promise<void>;
  treeManagerModal: ModalStateAndActions['treeManagerModal'];
  setTreeManagerModal: ModalStateAndActions['setTreeManagerModal'];
  activeTreeId: string | null;
  onTreeSelected: (treeId: string) => void;
  sharedTreePromptModal: { isOpen: boolean; sharedTrees: SharedTreeSummary[] };
  setSharedTreePromptModal: (val: { isOpen: boolean; sharedTrees: SharedTreeSummary[] }) => void;
  snapshotHistoryModal: { isOpen: boolean };
  setSnapshotHistoryModal: (val: { isOpen: boolean }) => void;
  googleSync: GoogleSyncStateAndActions;
  themeLanguage: ThemeLanguageProps;
  adminHubModal: { isOpen: boolean };
  setAdminHubModal: (val: { isOpen: boolean }) => void;
  globalSettingsModal: { isOpen: boolean };
  setGlobalSettingsModal: (val: { isOpen: boolean }) => void;
}

export const ModalManager = ({
  activeModal,
  setActiveModal,
  linkModal,
  setLinkModal,
  cleanTreeOptionsModal,
  setCleanTreeOptionsModal,
  googleSyncChoiceModal,
  setGoogleSyncChoiceModal,
  driveFileManagerModal,
  setDriveFileManagerModal,
  people,
  focusId,
  setFocusId,
  activePerson,
  user,
  familyActions,
  language,
  onStartNewTree,
  onTriggerImportFile,
  onLoadCloudData,
  onSaveNewCloudFile,
  driveFiles,
  currentActiveDriveFileId,
  handleLoadDriveFile,
  handleSaveAsNewDriveFile,
  handleOverwriteExistingDriveFile,
  handleDeleteDriveFile,
  isSavingDriveFile,
  isDeletingDriveFile,
  isListingDriveFiles,
  refreshDriveFiles,
  onImportLocalFile,
  onGoogleLogin,
  treeManagerModal,
  setTreeManagerModal,
  activeTreeId,
  onTreeSelected,
  sharedTreePromptModal,
  setSharedTreePromptModal,
  snapshotHistoryModal,
  setSnapshotHistoryModal,
  googleSync,
  themeLanguage,
  adminHubModal,
  setAdminHubModal,
  globalSettingsModal,
  setGlobalSettingsModal,
}: ModalManagerProps) => {
  const closeModal = () => setActiveModal('none');

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <LinkPersonModal
        isOpen={linkModal.isOpen}
        onClose={() => setLinkModal({ ...linkModal, isOpen: false })}
        people={people}
        type={linkModal.type}
        gender={linkModal.gender}
        currentPersonId={focusId}
        familyActions={familyActions}
      />

      <CleanTreeOptionsModal
        isOpen={cleanTreeOptionsModal.isOpen}
        onClose={() => setCleanTreeOptionsModal({ isOpen: false })}
        onStartNewTree={onStartNewTree}
        onTriggerImportFile={onTriggerImportFile}
        language={language}
      />

      <GoogleSyncChoiceModal
        isOpen={googleSyncChoiceModal.isOpen}
        onClose={() => setGoogleSyncChoiceModal({ isOpen: false, driveFileId: null })}
        onLoadCloud={() => onLoadCloudData(googleSyncChoiceModal.driveFileId!)}
        onSaveNewCloud={onSaveNewCloudFile}
        onOpenDriveManager={() => {
          setGoogleSyncChoiceModal({ isOpen: false, driveFileId: null });
          setDriveFileManagerModal({ isOpen: true });
        }}
        driveFileId={googleSyncChoiceModal.driveFileId}
      />

      <DriveFileManagerModal
        isOpen={driveFileManagerModal.isOpen}
        onClose={() => setDriveFileManagerModal({ isOpen: false })}
        files={driveFiles}
        currentActiveFileId={currentActiveDriveFileId}
        onLoadFile={handleLoadDriveFile}
        onSaveAsNewFile={handleSaveAsNewDriveFile}
        onOverwriteExistingFile={handleOverwriteExistingDriveFile}
        onDeleteFile={handleDeleteDriveFile}
        refreshDriveFiles={refreshDriveFiles}
        isSaving={isSavingDriveFile}
        isDeleting={isDeletingDriveFile}
        isListing={isListingDriveFiles}
        onImportLocalFile={onImportLocalFile}
      />

      <TreeManagerModal
        isOpen={treeManagerModal.isOpen}
        onClose={() => setTreeManagerModal({ isOpen: false })}
        ownerId={user?.uid || ''}
        userEmail={user?.email || ''}
        activeTreeId={activeTreeId}
        onTreeSelected={onTreeSelected}
      />

      <SharedTreePromptModal
        isOpen={sharedTreePromptModal.isOpen}
        onClose={() => setSharedTreePromptModal({ isOpen: false, sharedTrees: [] })}
        sharedTrees={sharedTreePromptModal.sharedTrees}
        onSelect={async (tree) => {
          setSharedTreePromptModal({ isOpen: false, sharedTrees: [] });
          // If it has a driveFileId, we should prioritize loading that snapshot
          if (tree.driveFileId) {
            await handleLoadDriveFile(tree.driveFileId);
          }
          // Set the current tree ID so delta sync and metadata fetch work
          onTreeSelected(tree.id);
        }}
      />

      {activeModal === 'calculator' && (
        <RelationshipModal isOpen={true} onClose={closeModal} people={people} language={language} />
      )}

      {activeModal === 'stats' && (
        <StatisticsDashboard
          people={people}
          onNavigateToPerson={(id) => {
            setFocusId(id);
            closeModal();
          }}
        />
      )}

      {activeModal === 'consistency' && (
        <StatisticsDashboard
          people={people}
          onNavigateToPerson={(id) => {
            setFocusId(id);
            closeModal();
          }}
        />
      )}

      {activeModal === 'timeline' && (
        <TimelineModal
          isOpen={true}
          onClose={closeModal}
          people={people}
          onSelectPerson={setFocusId}
          language={language}
        />
      )}

      {activeModal === 'map' && (
        <GeoMapModal
          isOpen={true}
          onClose={closeModal}
          people={people}
          language={language}
          onSelectPerson={(id) => {
            setFocusId(id);
            closeModal();
          }}
        />
      )}

      {activeModal === 'chat' && activePerson?.isDeceased && (
        <AncestorChatModal
          isOpen={true}
          onClose={closeModal}
          person={activePerson}
          people={people}
          language={language}
        />
      )}

      {activeModal === 'share' && (
        <ShareModal
          isOpen={true}
          onClose={closeModal}
          language={language}
          user={user}
          driveFileId={currentActiveDriveFileId}
          treeId={activeTreeId}
        />
      )}

      {activeModal === 'layoutSettings' && <LayoutSettingsModal isOpen={true} onClose={closeModal} />}

      {activeModal === 'story' && (
        <StoryModal
          isOpen={true}
          onClose={closeModal}
          people={people}
          rootId={focusId}
          language={language}
        />
      )}

      {activeModal === 'login' && (
        <UnifiedLoginModal
          isOpen={true}
          onClose={closeModal}
          onGoogleLogin={onGoogleLogin}
        />
      )}

      {snapshotHistoryModal.isOpen && (
        <SnapshotHistoryModal
          isOpen={true}
          onClose={() => setSnapshotHistoryModal({ isOpen: false })}
          googleSync={googleSync}
          themeLanguage={themeLanguage}
        />
      )}

      {adminHubModal.isOpen && (
        <AdminHubModal
          isOpen={true}
          onClose={() => setAdminHubModal({ isOpen: false })}
          treeId={activeTreeId || ''}
          ownerId={user?.uid || ''}
          ownerEmail={user?.email || ''}
          currentUserRole={useAppStore.getState().currentUserRole || 'viewer'}
          googleSync={googleSync}
          onRootChanged={setFocusId}
        />
      )}

      {globalSettingsModal.isOpen && (
        <GlobalSettingsModal
          isOpen={true}
          onClose={() => setGlobalSettingsModal({ isOpen: false })}
        />
      )}
    </Suspense>
  );
};
