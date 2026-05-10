import { SearchIntent, SEARCH_CONCEPTS, LogicType } from './searchConcepts';
import { normalizeArabic } from '../../utils/search/arabicUtils';

export interface ParsedIntent {
    id: SearchIntent;
    logicType: LogicType;
    targetName?: string; // For relationships: "أبناء [فلان]"
    locationCity?: string; // For locations: "في [مكة]"
}

export interface ParsedQuery {
    intents: ParsedIntent[];
    remainingText: string;
}

/**
 * Parses a natural language query to extract intentions, relationships, and locations.
 * Optimized for [Keyword] + [TargetName] patterns.
 */
export const parseSearchQuery = (query: string): ParsedQuery => {
    let normalized = normalizeArabic(query);
    const STOP_WORDS = new Set(['of', 'the', 'and', 'with', 'a', 'an', 'ال', 'باسم', 'صاحب']);
    
    const detectedIntents: ParsedIntent[] = [];
    let processedQuery = normalized;

    // Sort concepts by keyword length (descending)
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
        if (match) {
            const intent: ParsedIntent = { id, logicType };

            if (logicType === 'RELATIONAL' || logicType === 'LOCATIONAL') {
                // More robust extraction: everything after the matched keyword up to 3 words
                const keywordEndIndex = match.index + match[0].length;
                const afterText = processedQuery.substring(keywordEndIndex).trim();
                
                if (afterText) {
                    const words = afterText.split(/\s+/);
                    const candidate = words.slice(0, 3).join(' ');
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
            // Use the match result to replace specifically
            processedQuery = processedQuery.replace(match[0], ' ').trim();
        }
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
