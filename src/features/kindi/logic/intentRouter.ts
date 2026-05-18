import { parseSearchQuery } from '../../../services/search/queryParser';
import type { KindiRoutedIntent } from '../types';
import { detectKindiIntentKind, normalizeKindiCommandText } from './kindiCommandLexicon';

export const routeKindiIntent = (query: string): KindiRoutedIntent => {
  const trimmed = query.trim();
  const normalized = normalizeKindiCommandText(trimmed);
  const parsed = parseSearchQuery(trimmed);
  const kind = detectKindiIntentKind(normalized);

  const summary =
    kind === 'ACTION'
      ? 'طلب تنفيذ إجراء على الشجرة'
      : kind === 'UPDATE'
        ? 'طلب تعديل بيانات'
        : kind === 'DELETE'
          ? 'طلب حذف شخص'
          : kind === 'GREETING'
            ? 'تحية'
          : kind === 'SUPPORT'
            ? 'طلب مساعدة'
            : parsed.intents.length > 0
              ? 'استعلام استدلالي'
              : 'بحث نصي';

  return {
    kind,
    query: trimmed,
    parsedIntents: parsed.intents,
    targetText: parsed.remainingText || trimmed,
    summary,
  };
};
