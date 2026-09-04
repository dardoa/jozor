import { normalizeKindiCommandText } from './kindiCommandLexicon';
import type { Language } from '../../../types/common';
import { getKindiAppGuideTopics, type KindiGuideTopic } from './kindiAppGuide';

export interface KindiGuideMatch {
  topic: KindiGuideTopic;
  score: number;
}

const tokenize = (value: string): string[] =>
  normalizeKindiCommandText(value)
    .split(' ')
    .map((item) => item.trim())
    .filter((item) => item.length >= 2);

const normalizedKeywords = (topic: KindiGuideTopic): string[] =>
  topic.keywords
    .map((keyword) => normalizeKindiCommandText(keyword))
    .filter(Boolean);

export const matchKindiGuideTopic = (
  query: string,
  language: Language = 'ar',
  topics: readonly KindiGuideTopic[] = getKindiAppGuideTopics(language)
): KindiGuideMatch | null => {
  const normalizedQuery = normalizeKindiCommandText(query);
  const queryTokens = new Set(tokenize(query));
  if (!normalizedQuery || queryTokens.size === 0) return null;

  let bestMatch: KindiGuideMatch | null = null;

  for (const topic of topics) {
    let score = 0;

    for (const keyword of normalizedKeywords(topic)) {
      if (normalizedQuery.includes(keyword)) {
        score += keyword.includes(' ') ? 3 : 2;
        continue;
      }

      if (queryTokens.has(keyword)) {
        score += 2;
      }
    }

    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { topic, score };
    }
  }

  return bestMatch;
};

export const getKindiGuideAnswer = (query: string, language: Language = 'ar'): string | undefined =>
  matchKindiGuideTopic(query, language)?.topic.answer;

