import { useCallback, useRef } from 'react';

import { searchService } from '../../../services/searchService';
import { useAppStore } from '../../../store/useAppStore';
import type { Language } from '../../../types/common';
import { getKindiStrings } from '../logic/kindiLocales';
import { getKindiUndoHistoryToken } from '../logic/kindiUndoHistoryToken';
import type {
  KindiAnswerFeedback,
  KindiMessage,
  KindiUndoAction,
} from '../types';

interface UseKindiMessageActionsArgs {
  language: Language;
  messages: KindiMessage[];
  hasPendingDecision: boolean;
  isThinking: boolean;
  setDraft: (value: string) => void;
  clearPendingAddName: () => void;
  setLastContextPersonId: (personId: string | undefined) => void;
  resetConversation: () => void;
  addAssistantMessage: (message: Omit<KindiMessage, 'id' | 'role'>) => string;
  setUndoActionStatus: (messageId: string, status: KindiUndoAction['status']) => void;
  setAnswerFeedback: (messageId: string, feedback: KindiAnswerFeedback) => void;
}

const logAnswerFeedback = (
  answer: NonNullable<KindiMessage['answerMeta']>,
  feedback: KindiAnswerFeedback
): void => {
  void import('../services/kindiLearningService').then(({ logKindiLearningEvent }) => {
    logKindiLearningEvent({
      eventType: feedback === 'helpful' ? 'answer_feedback_helpful' : 'answer_feedback_unhelpful',
      interactionId: answer.interactionId,
      routeKind: answer.kind === 'guide' ? 'SUPPORT' : 'QUERY',
      resultKind: answer.kind,
      parserStage: answer.source === 'cloud-assisted'
        ? 'ai_fallback'
        : answer.source === 'help-center'
          ? 'support_guide'
          : 'local_search',
      parserName: answer.source === 'cloud-assisted'
        ? 'kindiAIService'
        : answer.source === 'help-center'
          ? 'kindiHelpKnowledgeService'
          : answer.kind === 'diagnostic'
            ? 'kindiTreeDiagnosticsEngine'
            : answer.kind === 'biography'
              ? 'kindiBiographyDraftEngine'
              : answer.kind === 'record-review'
                ? 'kindiRecordReviewEngine'
                : answer.kind === 'search'
                  ? 'kindiSearchFlow'
                  : 'kindiLocalQueryEngine',
      metadata: {
        answerSource: answer.source,
        answerKind: answer.kind,
        ...(answer.topicId ? { topicId: answer.topicId } : {}),
      },
    });
  });
};

export const useKindiMessageActions = ({
  language,
  messages,
  hasPendingDecision,
  isThinking,
  setDraft,
  clearPendingAddName,
  setLastContextPersonId,
  resetConversation,
  addAssistantMessage,
  setUndoActionStatus,
  setAnswerFeedback,
}: UseKindiMessageActionsArgs) => {
  const ratedAnswerIdsRef = useRef(new Set<string>());
  const strings = getKindiStrings(language);

  const startNewConversation = useCallback(() => {
    if (hasPendingDecision || isThinking) return;

    setDraft('');
    clearPendingAddName();
    setLastContextPersonId(undefined);
    ratedAnswerIdsRef.current.clear();
    resetConversation();
  }, [
    clearPendingAddName,
    hasPendingDecision,
    isThinking,
    resetConversation,
    setDraft,
    setLastContextPersonId,
  ]);

  const undoKindiChange = useCallback((messageId: string, undoAction: KindiUndoAction) => {
    if (undoAction.status !== 'available') return;

    const state = useAppStore.getState();
    const currentHistoryEntryToken = getKindiUndoHistoryToken(state.past.at(-1));
    const isStillLatestChange = !state.isHistoryStale
      && currentHistoryEntryToken === undoAction.historyEntryToken
      && state.past.length === undoAction.pastCount
      && state.future.length === undoAction.futureCount;

    if (!isStillLatestChange) {
      setUndoActionStatus(messageId, 'expired');
      addAssistantMessage({ text: strings.execution.undoExpired });
      return;
    }

    const result = state.undo();
    if (!result.success) {
      setUndoActionStatus(messageId, result.blockedReason === 'stale_history' ? 'expired' : 'failed');
      addAssistantMessage({
        text: result.blockedReason === 'stale_history'
          ? strings.execution.undoExpired
          : strings.execution.undoFailed,
      });
      return;
    }

    setUndoActionStatus(messageId, 'undone');
    void searchService.updateSearchIndex(Object.values(useAppStore.getState().people));
    addAssistantMessage({ text: strings.execution.undoSuccess });
  }, [addAssistantMessage, setUndoActionStatus, strings.execution]);

  const rateKindiAnswer = useCallback((messageId: string, feedback: KindiAnswerFeedback) => {
    const message = messages.find((item) => item.id === messageId);
    const answer = message?.answerMeta;
    if (!answer?.feedbackEnabled || answer.feedback || ratedAnswerIdsRef.current.has(messageId)) return;

    ratedAnswerIdsRef.current.add(messageId);
    setAnswerFeedback(messageId, feedback);
    logAnswerFeedback(answer, feedback);
  }, [messages, setAnswerFeedback]);

  return {
    startNewConversation,
    undoKindiChange,
    rateKindiAnswer,
  };
};
