import { describe, expect, it } from 'vitest';

import type { KindiAIClassificationCategory } from '../types';
import { resolveKindiClassifiedResponse } from '../logic/kindiAIResponseMapper';
import { getKindiStrings } from '../logic/kindiLocales';

const resolve = (
  category: KindiAIClassificationCategory,
  language: 'ar' | 'en' = 'ar'
) => resolveKindiClassifiedResponse({
  classification: { category, confidence: 0.9 },
  language,
  interactionId: 'interaction-1',
  random: () => 0,
});

describe('resolveKindiClassifiedResponse', () => {
  it.each([
    ['ar', 'SUPPORT', 'guide'],
    ['en', 'SUPPORT', 'guide'],
    ['ar', 'FAMILY_QUERY', 'relationship'],
    ['en', 'FAMILY_QUERY', 'relationship'],
    ['ar', 'UNCLEAR', 'search'],
    ['en', 'UNCLEAR', 'search'],
  ] as const)('maps %s %s to a feedback-enabled cloud answer', (language, category, answerKind) => {
    const result = resolve(category, language);

    expect(result?.message.answerMeta).toEqual({
      source: 'cloud-assisted',
      kind: answerKind,
      interactionId: 'interaction-1',
      feedbackEnabled: true,
    });
  });

  it('uses localized deterministic copy for greeting and irrelevant classifications', () => {
    const arabicGreeting = resolve('GREETING', 'ar');
    const englishIrrelevant = resolve('IRRELEVANT', 'en');

    expect(arabicGreeting).toEqual({
      message: { text: getKindiStrings('ar').greetings.welcome[0] },
      cue: 'greeting',
    });
    expect(englishIrrelevant).toEqual({
      message: { text: getKindiStrings('en').outOfScope[0] },
    });
  });

  it('does not turn an executable classification into a conversational answer', () => {
    expect(resolve('EXECUTABLE_COMMAND')).toBeNull();
  });
});
