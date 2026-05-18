import { useCallback, useMemo, useState } from 'react';

import { KINDI_STRINGS } from '../logic/kindiLocales';
import type { KindiConfirmation, KindiMessage } from '../types';

export type KindiConversationCue = 'greeting' | 'flow-search' | 'flow-add' | undefined;

export const createKindiMessageId = () => `kindi:${Date.now()}:${Math.random().toString(36).slice(2)}`;

const INITIAL_MESSAGES: KindiMessage[] = [
  {
    id: 'kindi:welcome',
    role: 'assistant',
    text: KINDI_STRINGS.initialMessage,
  },
];

export const useKindiMessages = () => {
  const [messages, setMessages] = useState<KindiMessage[]>(INITIAL_MESSAGES);
  const [lastConversationCue, setLastConversationCue] = useState<KindiConversationCue>('greeting');

  const hasPendingDecision = useMemo(() => messages.some((message) => {
    const hasPendingConfirmation = Boolean(message.confirmation)
      && (!message.confirmation?.status || message.confirmation.status === 'pending' || message.confirmation.status === 'processing');
    const hasPendingDisambiguation = Boolean(message.disambiguation)
      && (!message.disambiguation?.status || message.disambiguation.status === 'pending');
    return hasPendingConfirmation || hasPendingDisambiguation;
  }), [messages]);

  const addAssistantMessage = useCallback((message: Omit<KindiMessage, 'id' | 'role'>) => {
    setMessages((current) => [
      ...current,
      {
        id: createKindiMessageId(),
        role: 'assistant',
        ...message,
      },
    ]);
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
    messages,
    setMessages,
    lastConversationCue,
    hasPendingDecision,
    addAssistantMessage,
    addAssistantMessageWithCue,
    addUserMessage,
    clearConversationCue,
    setConfirmationStatus,
    setDisambiguationStatus,
    showMorePeople,
  };
};
