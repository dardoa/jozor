import type { ModalManagerProps } from './modalManagerTypes';
import type { LocationData } from '../../types';
import {
  AncestorChatModal,
  GeographicJourneyModal,
  RelationshipModal,
  ShareModal,
  StatisticsDashboard,
  TimelineModal,
  UnifiedLoginModal,
  PaywallModal,
} from './lazyModals';

interface ActiveModalRendererProps {
  modal: Pick<
    ModalManagerProps,
    | 'activeModal'
    | 'setActiveModal'
    | 'modalContext'
    | 'geographicJourneyMode'
    | 'people'
    | 'setFocusId'
    | 'user'
    | 'language'
    | 'onGoogleLogin'
    | 'currentActiveDriveFileId'
    | 'activeTreeId'
  >;
  locations: Record<string, LocationData>;
}

export const ActiveModalRenderer = ({ modal, locations }: ActiveModalRendererProps) => {
  const closeModal = () => modal.setActiveModal('none');
  const sourcePersonId = modal.modalContext?.sourcePersonId;

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
        initialView={modal.activeModal === 'consistency' ? 'consistency' : 'stats'}
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
        focusPersonId={sourcePersonId}
      />
    );
  }

  if (modal.activeModal === 'chat') {
    const person = sourcePersonId ? modal.people[sourcePersonId] : undefined;

    return (
      <AncestorChatModal
        isOpen={true}
        onClose={closeModal}
        person={person}
        people={modal.people}
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
        focusPersonId={sourcePersonId}
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

  if (modal.activeModal === 'paywall') {
    return (
      <PaywallModal
        isOpen={true}
        onClose={closeModal}
      />
    );
  }

  return null;
};
