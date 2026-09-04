import React, { useCallback, useEffect, useState } from 'react';
import type { Person } from '../../../types/person';
import { useTranslation } from '../../../context/TranslationContext';
import { useSpeechToText } from '../../../hooks/utils/useSpeechToText';
import { KindiOverlay } from './KindiOverlay';
import { useKindiController } from '../hooks/useKindiController';
import type {
  KindiDiagnosticTargetField,
  KindiDiagnosticTargetSection,
  KindiDiagnosticTargetTab,
} from '../types';

export interface KindiOverlayWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  people: Record<string, Person>;
  onFocusPerson: (personId: string) => void;
  onOpenPersonRecord?: (
    personId: string,
    targetTab?: KindiDiagnosticTargetTab,
    targetSection?: KindiDiagnosticTargetSection,
    targetField?: KindiDiagnosticTargetField
  ) => void;
}

const KindiOverlayWrapper: React.FC<KindiOverlayWrapperProps> = ({
  isOpen,
  onClose,
  people,
  onFocusPerson,
  onOpenPersonRecord,
}) => {
  const controller = useKindiController({ people, onFocusPerson });
  const { language, t } = useTranslation();
  const [voiceError, setVoiceError] = useState<string | null>(null);
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
      setVoiceError(null);
      controller.setDraft(text);
    },
    onError: () => {
      setVoiceError(t.kindi.voiceError);
    },
  });

  const toggleVoice = () => {
    if (isListening) {
      stopListening();
      return;
    }
    setVoiceError(null);
    startListening();
  };

  // Sync parent open state to controller
  useEffect(() => {
    if (isOpen) {
      setControllerIsOpen(true);
    }
  }, [isOpen, setControllerIsOpen]);

  const handleClose = useCallback(() => {
    setControllerIsOpen(false);
    onClose();
  }, [onClose, setControllerIsOpen]);

  const handleFocusPerson = useCallback((personId: string) => {
    controller.focusPerson(personId);
    onClose();
  }, [controller, onClose]);

  const handleOpenPersonRecord = useCallback((
    personId: string,
    targetTab?: KindiDiagnosticTargetTab,
    targetSection?: KindiDiagnosticTargetSection,
    targetField?: KindiDiagnosticTargetField
  ) => {
    setControllerIsOpen(false);
    onOpenPersonRecord?.(personId, targetTab, targetSection, targetField);
    onClose();
  }, [onClose, onOpenPersonRecord, setControllerIsOpen]);

  return (
    <KindiOverlay
      isOpen={controllerIsOpen}
      draft={controller.draft}
      messages={controller.messages}
      peopleById={people}
      contextPerson={controller.currentContextPerson}
      isThinking={controller.isThinking}
      onDraftChange={controller.setDraft}
      onSubmit={() => controller.submit()}
      onClose={handleClose}
      onFocusPerson={handleFocusPerson}
      onOpenPersonRecord={onOpenPersonRecord ? handleOpenPersonRecord : undefined}
      onPrepareDiagnosticUpdate={controller.canPrepareDiagnosticUpdate
        ? controller.prepareDiagnosticUpdate
        : undefined}
      onConfirm={controller.confirm}
      onCancel={controller.cancel}
      onCancelDisambiguation={controller.cancelDisambiguation}
      onShowMorePeople={controller.showMorePeople}
      onChooseDisambiguation={controller.chooseDisambiguation}
      onStartNewConversation={controller.startNewConversation}
      onUndoChange={controller.undoKindiChange}
      onRateAnswer={controller.rateKindiAnswer}
      hasPendingDecision={controller.hasPendingDecision}
      isListening={isListening}
      isVoiceSupported={isVoiceSupported}
      voiceError={voiceError}
      onToggleVoice={toggleVoice}
    />
  );
};

export default KindiOverlayWrapper;
