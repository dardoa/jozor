import type { Language } from '../../../types/common';
import type { KindiRoutedIntent } from '../types';
import { getConversationFlowIntent } from './kindiCommandLexicon';
import { routeKindiIntent } from './intentRouter';

export type KindiConversationCue = 'greeting' | 'flow-search' | 'flow-add' | undefined;

export type KindiConversationTurn =
  | { kind: 'pending-decision' }
  | { kind: 'pending-add-name' }
  | {
      kind: 'routed';
      routed: KindiRoutedIntent;
      flowIntent?: ReturnType<typeof getConversationFlowIntent>;
    };

interface OrchestrateKindiConversationTurnArgs {
  query: string;
  language: Language;
  hasPendingDecision: boolean;
  hasPendingAddName: boolean;
  lastConversationCue: KindiConversationCue;
}

export const orchestrateKindiConversationTurn = ({
  query,
  language,
  hasPendingDecision,
  hasPendingAddName,
  lastConversationCue,
}: OrchestrateKindiConversationTurnArgs): KindiConversationTurn => {
  if (hasPendingDecision) return { kind: 'pending-decision' };
  if (hasPendingAddName) return { kind: 'pending-add-name' };

  const routed = routeKindiIntent(query, language);
  return {
    kind: 'routed',
    routed,
    flowIntent: lastConversationCue === 'greeting'
      ? getConversationFlowIntent(query)
      : undefined,
  };
};
