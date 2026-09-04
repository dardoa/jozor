import { useCallback, useMemo, useState } from 'react';

import type { Language } from '../../../types/common';
import type { KindiConversationCue } from '../logic/kindiConversationOrchestrator';
import { getKindiStrings } from '../logic/kindiLocales';
import type {
  KindiAnswerFeedback,
  KindiConfirmation,
  KindiMessage,
  KindiUndoAction,
} from '../types';

export const createKindiMessageId = () => `kindi:${Date.now()}:${crypto.randomUUID()}`;

const createInitialMessages = (language: Language): KindiMessage[] => [
  {
    id: 'kindi:welcome',
    role: 'assistant',
    text: getKindiStrings(language).initialMessage,
  },
];

export const useKindiMessages = (language: Language = 'ar') => {
  const [messages, setMessages] = useState<KindiMessage[]>(() => createInitialMessages(language));
  const [lastConversationCue, setLastConversationCue] = useState<KindiConversationCue>('greeting');

  const hasPendingDecision = useMemo(() => messages.some((message) => {
    const hasPendingConfirmation = Boolean(message.confirmation)
      && (!message.confirmation?.status || message.confirmation.status === 'pending' || message.confirmation.status === 'processing');
    const hasPendingDisambiguation = Boolean(message.disambiguation)
      && (!message.disambiguation?.status || message.disambiguation.status === 'pending');
    return hasPendingConfirmation || hasPendingDisambiguation;
  }), [messages]);

  const localizedMessages = useMemo(() => messages.map((message) =>
    message.id === 'kindi:welcome'
      ? { ...message, text: getKindiStrings(language).initialMessage }
      : message
  ), [language, messages]);

  const addAssistantMessage = useCallback((message: Omit<KindiMessage, 'id' | 'role'>) => {
    const id = createKindiMessageId();
    setMessages((current) => [
      ...current,
      {
        id,
        role: 'assistant',
        ...message,
      },
    ]);
    return id;
  }, []);

  const addAssistantMessageWithCue = useCallback((
    message: Omit<KindiMessage, 'id' | 'role'>,
    cue?: KindiConversationCue
  ) => {
    setLastConversationCue(cue);
    addAssistantMessage(message);
  }, [addAssistantMessage]);

  const addUserMessage = useCallback((text: string) => {
    setMessages((current) => [
      ...current,
      {
        id: createKindiMessageId(),
        role: 'user',
        text,
      },
    ]);
  }, []);

  const clearConversationCue = useCallback(() => {
    setLastConversationCue(undefined);
  }, []);

  const resetConversation = useCallback(() => {
    setMessages(createInitialMessages(language));
    setLastConversationCue('greeting');
  }, [language]);

  const setUndoActionStatus = useCallback((
    messageId: string,
    status: KindiUndoAction['status']
  ) => {
    setMessages((current) => current.map((message) =>
      message.id === messageId && message.undoAction
        ? { ...message, undoAction: { ...message.undoAction, status } }
        : message
    ));
  }, []);

  const setAnswerFeedback = useCallback((
    messageId: string,
    feedback: KindiAnswerFeedback
  ) => {
    setMessages((current) => current.map((message) =>
      message.id === messageId && message.answerMeta?.feedbackEnabled && !message.answerMeta.feedback
        ? { ...message, answerMeta: { ...message.answerMeta, feedback } }
        : message
    ));
  }, []);

  const setConfirmationStatus = useCallback((
    confirmationId: string,
    status: NonNullable<KindiConfirmation['status']>,
    error?: string
  ) => {
    setMessages((current) =>
      current.map((message) =>
        message.confirmation?.id === confirmationId
          ? { ...message, confirmation: { ...message.confirmation, status, error } }
          : message
      )
    );
  }, []);

  const setDisambiguationStatus = useCallback((
    messageId: string,
    status: NonNullable<NonNullable<KindiMessage['disambiguation']>['status']>
  ) => {
    setMessages((current) =>
      current.map((message) =>
        message.id === messageId && message.disambiguation
          ? { ...message, disambiguation: { ...message.disambiguation, status } }
          : message
      )
    );
  }, []);

  const showMorePeople = useCallback((messageId: string) => {
    setMessages((current) =>
      current.map((message) => {
        if (message.id !== messageId || (!message.people && !message.peopleResults)) return message;

        const resultCount = message.peopleResults?.length ?? message.people?.length ?? 0;
        const currentVisibleCount = message.visiblePeopleCount ?? resultCount;
        return {
          ...message,
          visiblePeopleCount: Math.min(currentVisibleCount + 12, resultCount),
        };
      })
    );
  }, []);

  return {
    messages: localizedMessages,
    setMessages,
    lastConversationCue,
    hasPendingDecision,
    addAssistantMessage,
    addAssistantMessageWithCue,
    addUserMessage,
    clearConversationCue,
    resetConversation,
    setConfirmationStatus,
    setDisambiguationStatus,
    setUndoActionStatus,
    setAnswerFeedback,
    showMorePeople,
  };
};
