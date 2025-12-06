import React, { memo } from 'react';
import { ModalManager } from './ModalManager';
import { Person, Language, UserProfile, Gender, FamilyActionsProps } from '../types';

interface ModalManagerContainerProps {
  activeModal: 'none' | 'calculator' | 'stats' | 'chat' | 'consistency' | 'timeline' | 'share' | 'story' | 'map';
  setActiveModal: (m: any) => void;
  linkModal: { isOpen: boolean; type: 'parent' | 'spouse' | 'child' | null; gender: Gender | null; };
  setLinkModal: (val: any) => void;
  cleanTreeOptionsModal: { isOpen: boolean }; // New prop
  setCleanTreeOptionsModal: (val: { isOpen: boolean }) => void; // New prop setter
  people: Record<string, Person>;
  focusId: string;
  setFocusId: (id: string) => void;
  activePerson?: Person;
  user: UserProfile | null;
  familyActions: FamilyActionsProps;
  language: Language;
  onStartNewTree: () => void; // New prop
  onTriggerImportFile: () => void; // New prop
}

export const ModalManagerContainer: React.FC<ModalManagerContainerProps> = memo(({
  activeModal,
  setActiveModal,
  linkModal,
  setLinkModal,
  cleanTreeOptionsModal, // Destructure new prop
  setCleanTreeOptionsModal, // Destructure new prop setter
  people,
  focusId,
  setFocusId,
  activePerson,
  user,
  familyActions,
  language,
  onStartNewTree, // Destructure new prop
  onTriggerImportFile, // Destructure new prop
}) => {
  return (
    <ModalManager
      activeModal={activeModal}
      setActiveModal={setActiveModal}
      linkModal={linkModal}
      setLinkModal={setLinkModal}
      cleanTreeOptionsModal={cleanTreeOptionsModal} // Pass new prop
      setCleanTreeOptionsModal={setCleanTreeOptionsModal} // Pass new prop setter
      people={people}
      focusId={focusId}
      setFocusId={setFocusId}
      activePerson={activePerson}
      user={user}
      familyActions={familyActions}
      language={language}
      onStartNewTree={onStartNewTree} // Pass new prop
      onTriggerImportFile={onTriggerImportFile} // Pass new prop
    />
  );
});