import { normalizeArabic, stripArabicPrefixes } from './arabicUtils';

export const SEARCH_STOP_WORDS = new Set([
    'of',
    'the',
    'and',
    'with',
    'a',
    'an',
    'عن',
    'على',
    'في',
    'من',
    'هو',
    'هي',
    'هذا',
    'هذه',
    'اسم',
    'صاحب',
    'صاحبة',
]);

export const normalizeSearchText = (text: string | undefined): string =>
    stripArabicPrefixes(normalizeArabic(text || '')).replace(/\s+/g, ' ').trim();

export const tokenizeSearchQuery = (query: string): string[] =>
    normalizeSearchText(query)
        .split(/\s+/)
        .filter((token) => token && !SEARCH_STOP_WORDS.has(token));
