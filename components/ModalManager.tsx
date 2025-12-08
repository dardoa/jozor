import React, { Suspense } from 'react';
import { AppStateAndActions, ModalStateAndActions, GoogleSyncStateAndActions, WelcomeScreenLogicProps, FamilyActionsProps, ThemeLanguageProps } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { LinkPersonModal } from './LinkPersonModal';
import { CleanTreeOptionsModal } from './CleanTreeOptionsModal';
import { GoogleSyncChoiceModal } from './GoogleSyncChoiceModal';
import { DriveFileManagerModal } from './DriveFileManagerModal';
import { useTranslation } from '../context/TranslationContext';

// Lazy Load Modals
const RelationshipModal = React.lazy(() => import('./RelationshipModal').then(module => ({ default: module.RelationshipModal })));
const StatisticsModal = React.lazy(() => import('./StatisticsModal').then(module => ({ default: module.StatisticsModal })));
const AncestorChatModal = React.lazy(() => import('./AncestorChatModal').then(module => ({ default: module.AncestorChatModal })));
const ConsistencyModal = React.lazy(() => import('./ConsistencyModal').then(module => ({ default: module.ConsistencyModal })));
const TimelineModal = React.lazy(() => import('./TimelineModal').then(module => ({ default: module.TimelineModal })));
const ShareModal = React.lazy(() => import('./ShareModal').then(module => ({ default: module.ShareModal })));
const StoryModal = React.lazy(() => import('./StoryModal').then(module => ({ default: module.StoryModal })));
const GeoMapModal = React.lazy(() => import('./GeoMapModal').then(module => ({ default: module.GeoMapModal })));

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
    isSavingDriveFile: GoogleSyncStateAndActions['isSavingDriveFile'];
    isDeletingDriveFile: GoogleSyncStateAndActions['isDeletingDriveFile'];
    isListingDriveFiles: GoogleSyncStateAndActions['isListingDriveFiles'];
}

export const ModalManager: React.FC<ModalManagerProps> = ({
    activeModal, setActiveModal, linkModal, setLinkModal,
    cleanTreeOptionsModal, setCleanTreeOptionsModal,
    googleSyncChoiceModal, setGoogleSyncChoiceModal,
    driveFileManagerModal, setDriveFileManagerModal,
    people, focusId, setFocusId, activePerson,
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
}) => {
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
                language={language}
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
                isSaving={isSavingDriveFile}
                isDeleting={isDeletingDriveFile}
                isListing={isListingDriveFiles}
            />

            {activeModal === 'calculator' && (
                <RelationshipModal isOpen={true} onClose={closeModal} people={people} language={language} />
            )}

            {activeModal === 'stats' && (
                <StatisticsModal isOpen={true} onClose={closeModal} people={people} language={language} />
            )}
            
            {activeModal === 'consistency' && (
                <ConsistencyModal isOpen={true} onClose={closeModal} people={people} onSelectPerson={setFocusId} language={language} />
            )}

            {activeModal === 'timeline' && (
                <TimelineModal isOpen={true} onClose={closeModal} people={people} onSelectPerson={setFocusId} language={language} />
            )}

            {activeModal === 'map' && (
                <GeoMapModal isOpen={true} onClose={closeModal} people={people} language={language} />
            )}

            {activeModal === 'chat' && activePerson?.isDeceased && (
                <AncestorChatModal isOpen={true} onClose={closeModal} person={activePerson} people={people} language={language} />
            )}

            {activeModal === 'share' && (
                <ShareModal isOpen={true} onClose={closeModal} language={language} user={user} />
            )}

            {activeModal === 'story' && (
                <StoryModal isOpen={true} onClose={closeModal} people={people} rootId={focusId} language={language} />
            )}
        </Suspense>
    );
};