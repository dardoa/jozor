import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { searchService } from '../../../services/searchService';
import { getKindiStrings } from '../logic/kindiLocales';
import { getKindiUndoHistoryToken } from '../logic/kindiUndoHistoryToken';
import { useKindiMessageActions } from '../hooks/useKindiMessageActions';
import type { KindiMessage, KindiUndoAction } from '../types';

const appState = vi.hoisted(() => ({
  people: {},
  past: [] as object[],
  future: [] as object[],
  isHistoryStale: false,
  undo: vi.fn(() => ({ success: true } as {
    success: boolean;
    blockedReason?: 'stale_history';
  })),
}));

const logKindiLearningEventMock = vi.hoisted(() => vi.fn());

vi.mock('../../../store/useAppStore', () => ({
  useAppStore: {
    getState: () => appState,
  },
}));

vi.mock('../../../services/searchService', () => ({
  searchService: {
    updateSearchIndex: vi.fn(),
  },
}));

vi.mock('../services/kindiLearningService', () => ({
  logKindiLearningEvent: logKindiLearningEventMock,
}));

const createHarness = ({
  messages = [],
  hasPendingDecision = false,
  isThinking = false,
}: {
  messages?: KindiMessage[];
  hasPendingDecision?: boolean;
  isThinking?: boolean;
} = {}) => {
  const actions = {
    setDraft: vi.fn(),
    clearPendingAddName: vi.fn(),
    setLastContextPersonId: vi.fn(),
    resetConversation: vi.fn(),
    addAssistantMessage: vi.fn(() => 'assistant-message'),
    setUndoActionStatus: vi.fn(),
    setAnswerFeedback: vi.fn(),
  };
  const hook = renderHook(() => useKindiMessageActions({
    language: 'en',
    messages,
    hasPendingDecision,
    isThinking,
    ...actions,
  }));

  return { ...hook, actions };
};

describe('useKindiMessageActions', () => {
  beforeEach(() => {
    appState.people = {};
    appState.past = [];
    appState.future = [];
    appState.isHistoryStale = false;
    appState.undo.mockReset();
    appState.undo.mockReturnValue({ success: true });
    vi.mocked(searchService.updateSearchIndex).mockReset();
    logKindiLearningEventMock.mockReset();
  });

  it('resets transient conversation state only when no decision or execution is active', () => {
    const allowed = createHarness();
    const blocked = createHarness({ hasPendingDecision: true });

    act(() => allowed.result.current.startNewConversation());
    act(() => blocked.result.current.startNewConversation());

    expect(allowed.actions.setDraft).toHaveBeenCalledWith('');
    expect(allowed.actions.clearPendingAddName).toHaveBeenCalledOnce();
    expect(allowed.actions.setLastContextPersonId).toHaveBeenCalledWith(undefined);
    expect(allowed.actions.resetConversation).toHaveBeenCalledOnce();
    expect(blocked.actions.resetConversation).not.toHaveBeenCalled();
  });

  it('records one privacy-safe answer rating even when the action is repeated', async () => {
    const message: KindiMessage = {
      id: 'answer-1',
      role: 'assistant',
      text: 'Private question text and person name',
      answerMeta: {
        source: 'help-center',
        kind: 'guide',
        interactionId: 'interaction-1',
        topicId: 'cloud-backup',
        feedbackEnabled: true,
      },
    };
    const { result, actions } = createHarness({ messages: [message] });

    await act(async () => {
      result.current.rateKindiAnswer(message.id, 'helpful');
      result.current.rateKindiAnswer(message.id, 'not-helpful');
      await Promise.resolve();
    });

    expect(actions.setAnswerFeedback).toHaveBeenCalledOnce();
    expect(actions.setAnswerFeedback).toHaveBeenCalledWith(message.id, 'helpful');
    await waitFor(() => expect(logKindiLearningEventMock).toHaveBeenCalledOnce());
    expect(logKindiLearningEventMock).toHaveBeenCalledWith({
      eventType: 'answer_feedback_helpful',
      interactionId: 'interaction-1',
      routeKind: 'SUPPORT',
      resultKind: 'guide',
      parserStage: 'support_guide',
      parserName: 'kindiHelpKnowledgeService',
      metadata: {
        answerSource: 'help-center',
        answerKind: 'guide',
        topicId: 'cloud-backup',
      },
    });
    expect(JSON.stringify(logKindiLearningEventMock.mock.calls)).not.toContain(message.text);
  });

  it('undoes only the latest matching history entry and refreshes the search index', () => {
    const historyEntry = {};
    appState.past = [historyEntry];
    appState.people = {};
    const undoAction: KindiUndoAction = {
      status: 'available',
      peopleVersion: 2,
      historyEntryToken: getKindiUndoHistoryToken(historyEntry)!,
      pastCount: 1,
      futureCount: 0,
    };
    const { result, actions } = createHarness();

    act(() => result.current.undoKindiChange('answer-1', undoAction));

    expect(appState.undo).toHaveBeenCalledOnce();
    expect(actions.setUndoActionStatus).toHaveBeenCalledWith('answer-1', 'undone');
    expect(searchService.updateSearchIndex).toHaveBeenCalledWith([]);
    expect(actions.addAssistantMessage).toHaveBeenCalledWith({
      text: getKindiStrings('en').execution.undoSuccess,
    });
  });

  it('expires a stale undo action without touching tree history', () => {
    appState.past = [{}];
    const undoAction: KindiUndoAction = {
      status: 'available',
      peopleVersion: 2,
      historyEntryToken: 'kindi-history-stale',
      pastCount: 1,
      futureCount: 0,
    };
    const { result, actions } = createHarness();

    act(() => result.current.undoKindiChange('answer-1', undoAction));

    expect(appState.undo).not.toHaveBeenCalled();
    expect(actions.setUndoActionStatus).toHaveBeenCalledWith('answer-1', 'expired');
    expect(actions.addAssistantMessage).toHaveBeenCalledWith({
      text: getKindiStrings('en').execution.undoExpired,
    });
  });
});
