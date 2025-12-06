import React, { Suspense } from 'react';
import { Person, Gender, Language, UserProfile, FamilyActionsProps, ModalManagerProps } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { LinkPersonModal } from './LinkPersonModal';
import { useTranslation } from '../context/TranslationContext'; // Import useTranslation

// Lazy Load Modals
const RelationshipModal = React.lazy(() => import('./RelationshipModal').then(module => ({ default: module.RelationshipModal })));
const StatisticsModal = React.lazy(() => import('./StatisticsModal').then(module => ({ default: module.StatisticsModal })));
const AncestorChatModal = React.lazy(() => import('./AncestorChatModal').then(module => ({ default: module.AncestorChatModal })));
const ConsistencyModal = React.lazy(() => import('./ConsistencyModal').then(module => ({ default: module.ConsistencyModal })));
const TimelineModal = React.lazy(() => import('./TimelineModal').then(module => ({ default: module.TimelineModal })));
const ShareModal = React.lazy(() => import('./ShareModal').then(module => ({ default: module.ShareModal })));
const StoryModal = React.lazy(() => import('./StoryModal').then(module => ({ default: module.StoryModal })));
const GeoMapModal = React.lazy(() => import('./GeoMapModal').then(module => ({ default: module.GeoMapModal })));

export const ModalManager: React.FC<ModalManagerProps> = ({
    activeModal, setActiveModal, linkModal, setLinkModal,
    people, focusId, setFocusId, activePerson,
    user,
    familyActions
}) => {
    const closeModal = () => setActiveModal('none');
    const { language } = useTranslation(); // Get language from context

    return (
        <Suspense fallback={<LoadingSpinner />}>
            <LinkPersonModal 
                isOpen={linkModal.isOpen}
                onClose={() => setLinkModal({ ...linkModal, isOpen: false })}
                people={people}
                type={linkModal.type}
                gender={linkModal.gender}
                currentPersonId={focusId}
                language={language} // Pass language from context
                familyActions={familyActions}
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