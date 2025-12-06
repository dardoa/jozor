import React, { memo } from 'react';
import { ModalManager } from './ModalManager';
import { Person, Language, UserProfile, Gender, FamilyActionsProps } from '../types';

interface ModalManagerContainerProps {
  activeModal: 'none' | 'calculator' | 'stats' | 'chat' | 'consistency' | 'timeline' | 'share' | 'story' | 'map';
  setActiveModal: (m: any) => void;
  linkModal: { isOpen: boolean; type: 'parent' | 'spouse' | 'child' | null; gender: Gender | null; };
  setLinkModal: (val: any) => void;
  people: Record<string, Person>;
  focusId: string;
  setFocusId: (id: string) => void;
  activePerson?: Person;
  user: UserProfile | null;
  familyActions: FamilyActionsProps;
  language: Language; // Added language prop
}

export const ModalManagerContainer: React.FC<ModalManagerContainerProps> = memo(({
  activeModal,
  setActiveModal,
  linkModal,
  setLinkModal,
  people,
  focusId,
  setFocusId,
  activePerson,
  user,
  familyActions,
  language, // Destructure language
}) => {
  return (
    <ModalManager
      activeModal={activeModal}
      setActiveModal={setActiveModal}
      linkModal={linkModal}
      setLinkModal={setLinkModal}
      people={people}
      focusId={focusId}
      setFocusId={setFocusId}
      activePerson={activePerson}
      user={user}
      familyActions={familyActions}
      language={language} // Pass language to ModalManager
    />
  );
});