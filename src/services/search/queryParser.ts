import { SearchIntent, SEARCH_CONCEPTS, LogicType } from './searchConcepts';
import { normalizeArabic } from '../../utils/search/arabicUtils';

export interface ParsedIntent {
    id: SearchIntent;
    logicType: LogicType;
    targetName?: string;
    locationCity?: string;
}

export interface ParsedQuery {
    intents: ParsedIntent[];
    remainingText: string;
}

const STOP_WORDS = new Set([
    'of',
    'the',
    'and',
    'with',
    'a',
    'an',
    'ال',
    'باسم',
    'صاحب',
    'صاحبة',
    'هو',
    'هي',
    'من',
]);

const QUESTION_AFTER_MIN = new Set(['هو', 'هي', 'هما', 'هم', 'هن', 'هذا', 'هذه', 'ذلك', 'تلك']);

const cleanTargetCandidate = (value: string): string =>
    value
        .replace(/^(?:of|for|to|عن|لدى|عند|الى|إلى|لـ|ل)\s*/i, '')
        .replace(/^ال\s+/i, '')
        .trim();

/**
 * Parses a natural-language query into search intents and residual free text.
 */
export const parseSearchQuery = (query: string): ParsedQuery => {
    const normalized = normalizeArabic(query);
    const detectedIntents: ParsedIntent[] = [];
    let processedQuery = normalized;

    const allKeywords = SEARCH_CONCEPTS.flatMap(concept =>
        concept.keywords.map(kw => ({
            kw: normalizeArabic(kw),
            id: concept.id,
            logicType: concept.logicType
        }))
    ).sort((a, b) => b.kw.length - a.kw.length);

    for (const { kw, id, logicType } of allKeywords) {
        const escapedKw = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(^|\\s)${escapedKw}(\\s|$)`, 'gi');
        const match = regex.exec(processedQuery);
        if (!match) continue;

        const keywordEndIndex = match.index + match[0].length;
        const afterText = processedQuery.substring(keywordEndIndex).trim();
        const afterFirstWord = afterText.split(/\s+/).filter(Boolean)[0];

        if (logicType === 'LOCATIONAL' && kw === 'من' && QUESTION_AFTER_MIN.has(afterFirstWord)) {
            continue;
        }

        if (id === 'females' && kw === 'بنات' && afterText) {
            continue;
        }

        const intent: ParsedIntent = { id, logicType };

        if (logicType === 'RELATIONAL' || logicType === 'LOCATIONAL') {
            const words = cleanTargetCandidate(afterText).split(/\s+/).filter(Boolean);
            const candidate = words.slice(0, 3).join(' ');
            if (candidate) {
                if (logicType === 'RELATIONAL') {
                    intent.targetName = candidate;
                } else {
                    intent.locationCity = candidate;
                }
                processedQuery = processedQuery.replace(candidate, ' ');
            }
        }

        if (!detectedIntents.some(i => i.id === id)) {
            detectedIntents.push(intent);
        }
        processedQuery = processedQuery.replace(match[0], ' ').trim();
    }

    const remainingText = processedQuery
        .split(/\s+/)
        .filter(w => Boolean(w) && !STOP_WORDS.has(w))
        .join(' ')
        .trim();

    return {
        intents: detectedIntents,
        remainingText
    };
};
