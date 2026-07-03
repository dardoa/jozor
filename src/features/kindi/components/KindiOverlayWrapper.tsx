import React, { useEffect } from 'react';
import type { Person } from '../../../types/person';
import { useTranslation } from '../../../context/TranslationContext';
import { useSpeechToText } from '../../../hooks/utils/useSpeechToText';
import { KindiOverlay } from './KindiOverlay';
import { useKindiController } from '../hooks/useKindiController';

export interface KindiOverlayWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  people: Record<string, Person>;
  onFocusPerson: (personId: string) => void;
}

const KindiOverlayWrapper: React.FC<KindiOverlayWrapperProps> = ({
  isOpen,
  onClose,
  people,
  onFocusPerson,
}) => {
  const controller = useKindiController({ people, onFocusPerson });
  const { language } = useTranslation();
  const {
    isOpen: controllerIsOpen,
    setIsOpen: setControllerIsOpen,
  } = controller;

  const {
    isListening,
    startListening,
    stopListening,
    isSupported: isVoiceSupported,
  } = useSpeechToText({
    language: language === 'ar' ? 'ar-SA' : 'en-US',
    onResult: (text) => {
      controller.setDraft(text);
      void controller.submit(text);
    },
    onError: (error) => {
      console.error('Kindi voice input error:', error);
    },
  });

  const toggleVoice = () => {
    if (isListening) {
      stopListening();
      return;
    }
    startListening();
  };

  // Sync parent open state to controller
  useEffect(() => {
    if (isOpen) {
      setControllerIsOpen(true);
    }
  }, [isOpen, setControllerIsOpen]);

  // Sync controller close state back to parent
  useEffect(() => {
    if (!controllerIsOpen && isOpen) {
      onClose();
    }
  }, [controllerIsOpen, isOpen, onClose]);

  return (
    <KindiOverlay
      isOpen={controllerIsOpen}
      draft={controller.draft}
      messages={controller.messages}
      peopleById={people}
      isThinking={controller.isThinking}
      onDraftChange={controller.setDraft}
      onSubmit={() => controller.submit()}
      onClose={() => setControllerIsOpen(false)}
      onFocusPerson={controller.focusPerson}
      onConfirm={controller.confirm}
      onCancel={controller.cancel}
      onCancelDisambiguation={controller.cancelDisambiguation}
      onShowMorePeople={controller.showMorePeople}
      onChooseDisambiguation={controller.chooseDisambiguation}
      hasPendingDecision={controller.hasPendingDecision}
      isListening={isListening}
      isVoiceSupported={isVoiceSupported}
      onToggleVoice={toggleVoice}
    />
  );
};

export default KindiOverlayWrapper;
