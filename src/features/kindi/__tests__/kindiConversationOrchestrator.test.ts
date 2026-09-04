import { describe, expect, it } from 'vitest';

import { orchestrateKindiConversationTurn } from '../logic/kindiConversationOrchestrator';

describe('orchestrateKindiConversationTurn', () => {
  it('blocks a new turn while a confirmation or disambiguation is pending', () => {
    expect(orchestrateKindiConversationTurn({
      query: 'find Lina',
      language: 'en',
      hasPendingDecision: true,
      hasPendingAddName: false,
      lastConversationCue: undefined,
    })).toEqual({ kind: 'pending-decision' });
  });

  it('keeps a supplied name inside the pending add-name flow', () => {
    expect(orchestrateKindiConversationTurn({
      query: 'Ali Al-Qurji',
      language: 'en',
      hasPendingDecision: false,
      hasPendingAddName: true,
      lastConversationCue: 'flow-add',
    })).toEqual({ kind: 'pending-add-name' });
  });

  it('derives a contextual flow only after a greeting cue', () => {
    const turn = orchestrateKindiConversationTurn({
      query: 'search',
      language: 'en',
      hasPendingDecision: false,
      hasPendingAddName: false,
      lastConversationCue: 'greeting',
    });

    expect(turn.kind).toBe('routed');
    if (turn.kind === 'routed') {
      expect(turn.flowIntent).toBe('search');
      expect(turn.routed.summary).toBe('Text search');
    }
  });

  it('routes commands and localizes their summaries using the interface language', () => {
    const turn = orchestrateKindiConversationTurn({
      query: 'أضف ابنًا لمحمود',
      language: 'en',
      hasPendingDecision: false,
      hasPendingAddName: false,
      lastConversationCue: undefined,
    });

    expect(turn.kind).toBe('routed');
    if (turn.kind === 'routed') {
      expect(turn.routed.kind).toBe('ACTION');
      expect(turn.routed.summary).toBe('Add to the family tree');
      expect(turn.flowIntent).toBeUndefined();
    }
  });
});
