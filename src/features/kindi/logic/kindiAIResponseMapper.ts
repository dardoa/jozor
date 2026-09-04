import type { Language } from '../../../types/common';
import type { KindiConversationCue } from './kindiConversationOrchestrator';
import { getKindiStrings } from './kindiLocales';
import type { KindiAIClassification, KindiMessage } from '../types';

export interface KindiClassifiedResponse {
  message: Omit<KindiMessage, 'id' | 'role'>;
  cue?: KindiConversationCue;
}

interface ResolveKindiClassifiedResponseArgs {
  classification: KindiAIClassification;
  language: Language;
  interactionId?: string;
  random?: () => number;
}

const pickReply = (items: readonly string[], random: () => number): string => {
  const index = Math.min(items.length - 1, Math.floor(random() * items.length));
  return items[Math.max(0, index)];
};

const createCloudAnswerMeta = (
  kind: 'guide' | 'relationship' | 'search',
  interactionId?: string
): NonNullable<KindiMessage['answerMeta']> => ({
  source: 'cloud-assisted',
  kind,
  interactionId,
  feedbackEnabled: true,
});

export const resolveKindiClassifiedResponse = ({
  classification,
  language,
  interactionId,
  random = Math.random,
}: ResolveKindiClassifiedResponseArgs): KindiClassifiedResponse | null => {
  const strings = getKindiStrings(language);

  if (classification.category === 'GREETING') {
    return {
      message: { text: pickReply(strings.greetings.welcome, random) },
      cue: 'greeting',
    };
  }

  if (classification.category === 'SUPPORT') {
    return {
      message: {
        text: strings.support.generic,
        answerMeta: createCloudAnswerMeta('guide', interactionId),
      },
      cue: 'greeting',
    };
  }

  if (classification.category === 'FAMILY_QUERY') {
    return {
      message: {
        text: strings.support.familyQuery,
        answerMeta: createCloudAnswerMeta('relationship', interactionId),
      },
    };
  }

  if (classification.category === 'UNCLEAR') {
    return {
      message: {
        text: strings.support.unclear,
        answerMeta: createCloudAnswerMeta('search', interactionId),
      },
    };
  }

  if (classification.category === 'IRRELEVANT') {
    return {
      message: { text: pickReply(strings.outOfScope, random) },
    };
  }

  return null;
};
