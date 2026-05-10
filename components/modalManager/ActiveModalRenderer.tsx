import type { ModalManagerProps } from './modalManagerTypes';
import {
  GeographicJourneyModal,
  RelationshipModal,
  ShareModal,
  StatisticsDashboard,
  TimelineModal,
  UnifiedLoginModal,
} from './lazyModals';

interface ActiveModalRendererProps {
  modal: Pick<
    ModalManagerProps,
    | 'activeModal'
    | 'setActiveModal'
    | 'geographicJourneyMode'
    | 'people'
    | 'setFocusId'
    | 'user'
    | 'language'
    | 'onGoogleLogin'
    | 'currentActiveDriveFileId'
    | 'activeTreeId'
  >;
  locations: Record<string, unknown>;
}

export const ActiveModalRenderer = ({ modal, locations }: ActiveModalRendererProps) => {
  const closeModal = () => modal.setActiveModal('none');

  if (modal.activeModal === 'calculator') {
    return (
      <RelationshipModal
        isOpen={true}
        onClose={closeModal}
        people={modal.people}
        language={modal.language}
      />
    );
  }

  if (modal.activeModal === 'stats' || modal.activeModal === 'consistency') {
    return (
      <StatisticsDashboard
        isOpen={true}
        onClose={closeModal}
        people={modal.people}
        onNavigateToPerson={(id) => {
          modal.setFocusId(id);
          closeModal();
        }}
      />
    );
  }

  if (modal.activeModal === 'timeline') {
    return (
      <TimelineModal
        isOpen={true}
        onClose={closeModal}
        people={modal.people}
        onSelectPerson={modal.setFocusId}
        language={modal.language}
      />
    );
  }

  if (modal.activeModal === 'geographicJourney') {
    return (
      <GeographicJourneyModal
        isOpen={true}
        onClose={closeModal}
        people={modal.people}
        locations={locations}
        language={modal.language}
        initialMode={modal.geographicJourneyMode}
        onSelectPerson={(id) => {
          modal.setFocusId(id);
          closeModal();
        }}
      />
    );
  }

  if (modal.activeModal === 'share') {
    return (
      <ShareModal
        isOpen={true}
        onClose={closeModal}
        language={modal.language}
        user={modal.user}
        driveFileId={modal.currentActiveDriveFileId}
        treeId={modal.activeTreeId}
      />
    );
  }

  if (modal.activeModal === 'login') {
    return (
      <UnifiedLoginModal
        isOpen={true}
        onClose={closeModal}
        onGoogleLogin={modal.onGoogleLogin}
      />
    );
  }

  return null;
};
