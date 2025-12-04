import React, { memo } from 'react';
import { ModalManager } from './ModalManager';
import { Person, Language, UserProfile, Gender, FamilyActionsProps } from '../types';

interface ModalManagerContainerProps {
  activeModal: 'none' | 'calculator' | 'stats' | 'chat' | 'consistency' | 'timeline' | 'share' | 'story' | 'map';
  setActiveModal: (m: any) => void;
  linkModal: { isOpen: boolean; type: 'parent' | 'spouse' | 'child' | null; gender: Gender | null; };
  setLinkModal: (val: any) => void;
  people: Record<string, Person>;
  language: Language;
  focusId: string;
  setFocusId: (id: string) => void;
  activePerson?: Person;
  user: UserProfile | null;
  familyActions: FamilyActionsProps;
}

export const ModalManagerContainer: React.FC<ModalManagerContainerProps> = memo(({
  activeModal,
  setActiveModal,
  linkModal,
  setLinkModal,
  people,
  language,
  focusId,
  setFocusId,
  activePerson,
  user,
  familyActions,
}) => {
  return (
    <ModalManager
      activeModal={activeModal}
      setActiveModal={setActiveModal}
      linkModal={linkModal}
      setLinkModal={setLinkModal}
      people={people}
      language={language}
      focusId={focusId}
      setFocusId={setFocusId}
      activePerson={activePerson}
      user={user}
      familyActions={familyActions}
    />
  );
});