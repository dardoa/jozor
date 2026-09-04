import { parseSearchQuery } from '../../../services/search/queryParser';
import type { Language } from '../../../types/common';
import type { KindiRoutedIntent } from '../types';
import { detectKindiIntentKind, normalizeKindiCommandText } from './kindiCommandLexicon';
import { getKindiStrings } from './kindiLocales';

export const routeKindiIntent = (query: string, language: Language = 'ar'): KindiRoutedIntent => {
  const trimmed = query.trim();
  const normalized = normalizeKindiCommandText(trimmed);
  const parsed = parseSearchQuery(trimmed);
  const kind = detectKindiIntentKind(normalized);

  const summary = getKindiStrings(language).routeSummary(kind, parsed.intents.length > 0);

  return {
    kind,
    query: trimmed,
    parsedIntents: parsed.intents,
    targetText: parsed.remainingText || trimmed,
    summary,
  };
};
