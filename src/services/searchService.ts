import type Fuse from 'fuse.js';
import { Person } from '../types';
import { normalizeArabic, stripArabicPrefixes } from '../utils/search/arabicUtils';
import { parseSearchQuery, ParsedIntent } from './search/queryParser';
import { getDisplayDate } from '../utils/familyLogic';

let fuse: Fuse<Person> | null = null;
let indexedPeople: Person[] = [];
let fuseLoader: Promise<typeof import('fuse.js').default> | null = null;

export type SearchMatchType = 'exact' | 'fuzzy';

export interface SearchResult {
    person: Person;
    score: number;
    matchType: SearchMatchType;
    reason?: string;
}

const FUSE_OPTIONS = {
    threshold: 0.28,
    distance: 100,
    ignoreLocation: true,
    minMatchCharLength: 2,
    keys: [
        { name: 'normalizedFullName', weight: 0.6 },
        { name: 'normalizedFirstName', weight: 0.4 },
        { name: 'normalizedLastName', weight: 0.3 },
        { name: 'normalizedMiddleName', weight: 0.2 },
        { name: 'normalizedNickName', weight: 0.1 },
        { name: 'normalizedBirthPlace', weight: 0.1 },
        { name: 'profession', weight: 0.1 },
        { name: 'bio', weight: 0.05 }
    ]
};

const loadFuse = async () => {
    fuseLoader ??= import('fuse.js').then((module) => module.default);
    return fuseLoader;
};

const SEARCH_STOP_WORDS = new Set([
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

const normalizeSearchText = (text: string | undefined): string =>
    stripArabicPrefixes(normalizeArabic(text || '')).replace(/\s+/g, ' ').trim();

const getPersonFullName = (person: Person): string => {
    const extended = person as Person & { fatherName?: string; familyName?: string };
    return [
        person.firstName,
        person.middleName || extended.fatherName,
        person.lastName || extended.familyName,
    ].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
};

const getPersonNameVariants = (person: Person): string[] => {
    const full = normalizeSearchText(getPersonFullName(person));
    const first = normalizeSearchText(person.firstName);
    const middle = normalizeSearchText(person.middleName || (person as Person & { fatherName?: string }).fatherName || '');
    const last = normalizeSearchText(person.lastName || (person as Person & { familyName?: string }).familyName || '');
    const nick = normalizeSearchText(person.nickName || '');

    return Array.from(new Set([
        full,
        [first, last].filter(Boolean).join(' '),
        [first, middle].filter(Boolean).join(' '),
        nick,
        [nick, last].filter(Boolean).join(' '),
    ].map(normalizeSearchText).filter(Boolean)));
};

const getPersonNameTokens = (person: Person) => ({
    first: normalizeSearchText(person.firstName),
    middle: normalizeSearchText(person.middleName || ''),
    last: normalizeSearchText(person.lastName),
    nick: normalizeSearchText(person.nickName || ''),
    full: normalizeSearchText(getPersonFullName(person)),
});

const tokenizeSearchQuery = (query: string): string[] =>
    normalizeSearchText(query)
        .split(/\s+/)
        .filter((token) => token && !SEARCH_STOP_WORDS.has(token));

const levenshteinDistance = (a: string, b: string): number => {
    if (a === b) return 0;
    if (!a) return b.length;
    if (!b) return a.length;

    const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
    const current = new Array<number>(b.length + 1);

    for (let i = 1; i <= a.length; i += 1) {
        current[0] = i;
        for (let j = 1; j <= b.length; j += 1) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            current[j] = Math.min(
                current[j - 1] + 1,
                previous[j] + 1,
                previous[j - 1] + cost
            );
        }
        previous.splice(0, previous.length, ...current);
    }

    return previous[b.length];
};

const isNormalizedNameMatch = (query: string, candidate: string): boolean => {
    if (!query || !candidate) return false;
    if (candidate === query) return true;
    if (candidate.startsWith(`${query} `) || query.startsWith(`${candidate} `)) return true;
    if (` ${candidate} `.includes(` ${query} `)) return true;

    const queryWords = query.split(/\s+/).filter(Boolean);
    const candidateWords = candidate.split(/\s+/).filter(Boolean);
    if (queryWords.length >= 2 && queryWords.every((word) => candidateWords.includes(word))) {
        return true;
    }

    const maxDistance = query.length <= 6 ? 1 : query.length <= 14 ? 2 : 3;
    return levenshteinDistance(query, candidate) <= maxDistance;
};

const uniqueResults = (results: SearchResult[], limit: number): SearchResult[] => {
    const seen = new Set<string>();
    return results
        .sort((a, b) => b.score - a.score)
        .filter((result) => {
            if (seen.has(result.person.id)) return false;
            seen.add(result.person.id);
            return true;
        })
        .slice(0, limit);
};

const runExactNameSearch = (query: string, people: Person[], limit: number): SearchResult[] => {
    const normalizedQuery = normalizeSearchText(query);
    const tokens = tokenizeSearchQuery(query);
    if (!normalizedQuery || tokens.length === 0) return [];

    const isShortSingleToken = tokens.length === 1 && tokens[0].length <= 3;
    const results: SearchResult[] = [];

    for (const person of people) {
        const name = getPersonNameTokens(person);
        let score = 0;
        let reason = '';

        if (name.full === normalizedQuery) {
            score = 100;
            reason = 'full-name';
        } else if (tokens.length >= 2 && isNormalizedNameMatch(normalizedQuery, name.full)) {
            score = name.full.startsWith(normalizedQuery) ? 96 : 92;
            reason = 'full-name-partial';
        } else if (tokens.length === 1) {
            const token = tokens[0];
            if (name.first === token) {
                score = 98;
                reason = 'first-name';
            } else if (name.nick === token) {
                score = 96;
                reason = 'nickname';
            } else if (!isShortSingleToken && name.last === token) {
                score = 88;
                reason = 'last-name';
            } else if (token.length >= 3 && name.first.startsWith(token)) {
                score = 82;
                reason = 'first-name-prefix';
            } else if (!isShortSingleToken && token.length >= 3 && name.full.split(/\s+/).some((part) => part.startsWith(token))) {
                score = 76;
                reason = 'name-token-prefix';
            }
        } else {
            const nameParts = [name.first, name.middle, name.last, name.nick].filter(Boolean);
            const allTokensMatch = tokens.every((token) =>
                nameParts.some((part) => part === token || part.startsWith(token))
            );

            if (allTokensMatch) {
                score = tokens.length >= 2 && name.first === tokens[0] && name.last === tokens[tokens.length - 1]
                    ? 94
                    : 86;
                reason = 'name-token-match';
            }
        }

        if (score > 0) {
            results.push({ person, score, matchType: 'exact', reason });
        }
    }

    return uniqueResults(results, limit);
};

const runFuzzySearch = async (query: string, people: Person[], limit: number): Promise<SearchResult[]> => {
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) return [];

    const FuseConstructor = await loadFuse();
    const strictOptions = normalizedQuery.length <= 4
        ? { ...FUSE_OPTIONS, threshold: 0.18, keys: FUSE_OPTIONS.keys.slice(0, 4) }
        : FUSE_OPTIONS;
    const searchFuse = new FuseConstructor(people, { ...strictOptions, includeScore: true });

    return searchFuse.search(normalizedQuery)
        .map((result) => ({
            person: result.item,
            score: Math.round((1 - (result.score ?? 1)) * 70),
            matchType: 'fuzzy' as const,
            reason: 'fuse',
        }))
        .filter((result) => normalizedQuery.length > 4 || result.score >= 62)
        .slice(0, limit);
};

const calculateAge = (birthDate: string): number | null => {
    if (!birthDate) return null;
    const year = parseInt(getDisplayDate(birthDate), 10);
    if (isNaN(year)) return null;
    return new Date().getFullYear() - year;
};

const findTargetPeople = async (name: string, people: Person[]): Promise<Person[]> => {
    const normalizedQuery = normalizeSearchText(name);
    const words = normalizedQuery.split(/\s+/).filter(Boolean);
    
    if (words.length === 0) return [];

    return people.filter(p => {
        const nameTokens = getPersonNameTokens(p);
        const variants = getPersonNameVariants(p);

        if (words.length === 1) {
            return nameTokens.first === words[0] || nameTokens.nick === words[0];
        }

        if (variants.some((variant) => isNormalizedNameMatch(normalizedQuery, variant))) {
            return true;
        }

        if (words.length >= 2 && nameTokens.first !== words[0] && nameTokens.nick !== words[0]) {
            return false;
        }

        const fullWords = nameTokens.full.split(/\s+/).filter(Boolean);
        return words.every((word) => fullWords.includes(word));
    });
};

export const searchService = {
    async updateSearchIndex(people: Person[]) {
        indexedPeople = people.map(p => ({
            ...p,
            normalizedFullName: normalizeSearchText(getPersonFullName(p)),
            normalizedFirstName: normalizeArabic(p.firstName),
            normalizedLastName: normalizeArabic(p.lastName),
            normalizedMiddleName: normalizeArabic(p.middleName || ''),
            normalizedNickName: normalizeArabic(p.nickName || ''),
            normalizedBirthPlace: normalizeArabic(p.birthPlace || '')
        } as any));

        const FuseConstructor = await loadFuse();
        fuse = new FuseConstructor(indexedPeople, FUSE_OPTIONS);
    },

    async search(query: string, limit = 20): Promise<SearchResult[]> {
        if (!query.trim()) return [];
        
        const parsed = parseSearchQuery(query);
        let candidates = indexedPeople;
        let intentDetected = parsed.intents.length > 0;
        let inferenceSucceeded = false;

        if (!intentDetected) {
            const exactResults = runExactNameSearch(query, indexedPeople, limit);
            if (exactResults.length > 0) return exactResults;
        }

        // 1. Process Relational and Locational Intents (Inference Layer)
        if (intentDetected) {
            for (const intent of parsed.intents) {
                if (intent.logicType === 'RELATIONAL' && intent.targetName) {
                    const targets = await findTargetPeople(intent.targetName, indexedPeople);
                    if (targets.length > 0) {
                        inferenceSucceeded = true;
                        const targetIds = new Set(targets.map(t => t.id));
                        
                        switch (intent.id) {
                            case 'rel_children':
                            case 'rel_sons':
                                candidates = candidates.filter(p => 
                                    (intent.id === 'rel_sons' ? p.gender === 'male' : true) &&
                                    (p.parents?.some(pid => targetIds.has(pid)) || 
                                     targetIds.has((p as any).fatherId) || 
                                     targetIds.has((p as any).motherId)) &&
                                    !targetIds.has(p.id)
                                );
                                break;
                            case 'rel_daughters':
                                candidates = candidates.filter(p => 
                                    p.gender === 'female' &&
                                    (p.parents?.some(pid => targetIds.has(pid)) || 
                                     targetIds.has((p as any).fatherId) || 
                                     targetIds.has((p as any).motherId)) &&
                                    !targetIds.has(p.id)
                                );
                                break;
                            case 'rel_grandchildren':
                            case 'rel_granddaughters':
                            case 'rel_grandsons':
                                const allChildIds = new Set(targets.flatMap(t => t.children || []));
                                candidates = candidates.filter(p => 
                                    (intent.id === 'rel_granddaughters' ? p.gender === 'female' : 
                                     intent.id === 'rel_grandsons' ? p.gender === 'male' : true) &&
                                    (p.parents?.some(pid => allChildIds.has(pid)) ||
                                     allChildIds.has((p as any).fatherId) ||
                                     allChildIds.has((p as any).motherId)) &&
                                    !targetIds.has(p.id)
                                );
                                break;
                            case 'rel_spouses':
                                candidates = candidates.filter(p => targets.some(t => t.spouses?.includes(p.id)));
                                break;
                            case 'rel_siblings':
                                const allParentIds = new Set(targets.flatMap(t => t.parents || []));
                                candidates = candidates.filter(p => 
                                    !targetIds.has(p.id) && 
                                    (p.parents?.some(pid => allParentIds.has(pid)) || 
                                     allParentIds.has((p as any).fatherId) ||
                                     allParentIds.has((p as any).motherId))
                                );
                                break;
                            case 'rel_uncles_paternal':
                            case 'rel_aunts_paternal':
                                // 1. Find the fathers of the targets
                                const targetFatherIds = new Set<string>();
                                targets.forEach(t => {
                                    if ((t as any).fatherId) targetFatherIds.add((t as any).fatherId);
                                    // Also check parents array for male parents
                                    t.parents?.forEach(pid => {
                                        const p = indexedPeople.find(ip => ip.id === pid);
                                        if (p?.gender === 'male') targetFatherIds.add(pid);
                                    });
                                });

                                // 2. Find the grandparents (parents of these fathers)
                                const grandParentIds = new Set<string>();
                                indexedPeople.filter(p => targetFatherIds.has(p.id)).forEach(f => {
                                    f.parents?.forEach(pid => grandParentIds.add(pid));
                                    if ((f as any).fatherId) grandParentIds.add((f as any).fatherId);
                                    if ((f as any).motherId) grandParentIds.add((f as any).motherId);
                                });

                                // 3. Find the siblings of these fathers (Uncles/Aunts)
                                candidates = indexedPeople.filter(p => 
                                    (intent.id === 'rel_uncles_paternal' ? p.gender === 'male' : p.gender === 'female') && 
                                    (p.parents?.some(pid => grandParentIds.has(pid)) || 
                                     grandParentIds.has((p as any).fatherId) || 
                                     grandParentIds.has((p as any).motherId)) &&
                                    !targetFatherIds.has(p.id)
                                );
                                break;
                            case 'rel_uncles_maternal':
                            case 'rel_aunts_maternal':
                                // 1. Find the mothers of the targets
                                const targetMotherIds = new Set<string>();
                                targets.forEach(t => {
                                    if ((t as any).motherId) targetMotherIds.add((t as any).motherId);
                                    t.parents?.forEach(pid => {
                                        const p = indexedPeople.find(ip => ip.id === pid);
                                        if (p?.gender === 'female') targetMotherIds.add(pid);
                                    });
                                });

                                // 2. Find the grandparents (parents of these mothers)
                                const grandParentIdsM = new Set<string>();
                                indexedPeople.filter(p => targetMotherIds.has(p.id)).forEach(m => {
                                    m.parents?.forEach(pid => grandParentIdsM.add(pid));
                                    if ((m as any).fatherId) grandParentIdsM.add((m as any).fatherId);
                                    if ((m as any).motherId) grandParentIdsM.add((m as any).motherId);
                                });

                                // 3. Find the siblings of these mothers (Maternal Uncles/Aunts)
                                candidates = indexedPeople.filter(p => 
                                    (intent.id === 'rel_uncles_maternal' ? p.gender === 'male' : p.gender === 'female') && 
                                    (p.parents?.some(pid => grandParentIdsM.has(pid)) || 
                                     grandParentIdsM.has((p as any).fatherId) || 
                                     grandParentIdsM.has((p as any).motherId)) &&
                                    !targetMotherIds.has(p.id)
                                );
                                break;
                            case 'rel_cousins_paternal_uncle':
                            case 'rel_cousins_paternal_aunt':
                                // 1. Find the target's father's siblings
                                const tFatherIdsP = new Set<string>();
                                targets.forEach(t => {
                                    if ((t as any).fatherId) tFatherIdsP.add((t as any).fatherId);
                                    t.parents?.forEach(pid => {
                                        const p = indexedPeople.find(ip => ip.id === pid);
                                        if (p?.gender === 'male') tFatherIdsP.add(pid);
                                    });
                                });
                                const gParentIdsP = new Set<string>();
                                indexedPeople.filter(p => tFatherIdsP.has(p.id)).forEach(f => {
                                    f.parents?.forEach(pid => gParentIdsP.add(pid));
                                    if ((f as any).fatherId) gParentIdsP.add((f as any).fatherId);
                                    if ((f as any).motherId) gParentIdsP.add((f as any).motherId);
                                });
                                // Filter by gender based on whether we want kids of Uncle or Aunt
                                const specificParentIdsP = indexedPeople.filter(p => 
                                    (intent.id === 'rel_cousins_paternal_uncle' ? p.gender === 'male' : p.gender === 'female') && 
                                    (p.parents?.some(pid => gParentIdsP.has(pid)) || 
                                     gParentIdsP.has((p as any).fatherId) || 
                                     gParentIdsP.has((p as any).motherId)) &&
                                    !tFatherIdsP.has(p.id)
                                ).map(u => u.id);

                                // 2. Find children
                                candidates = indexedPeople.filter(p => 
                                    (p.parents?.some(pid => specificParentIdsP.includes(pid)) || 
                                     specificParentIdsP.includes((p as any).fatherId) || 
                                     specificParentIdsP.includes((p as any).motherId)) &&
                                    !targetIds.has(p.id)
                                );
                                break;
                            case 'rel_cousins_maternal_uncle':
                            case 'rel_cousins_maternal_aunt':
                                // 1. Find the target's mother's siblings
                                const tMotherIdsM = new Set<string>();
                                targets.forEach(t => {
                                    if ((t as any).motherId) tMotherIdsM.add((t as any).motherId);
                                    t.parents?.forEach(pid => {
                                        const p = indexedPeople.find(ip => ip.id === pid);
                                        if (p?.gender === 'female') tMotherIdsM.add(pid);
                                    });
                                });
                                const gParentIdsMM = new Set<string>();
                                indexedPeople.filter(p => tMotherIdsM.has(p.id)).forEach(m => {
                                    m.parents?.forEach(pid => gParentIdsMM.add(pid));
                                    if ((m as any).fatherId) gParentIdsMM.add((m as any).fatherId);
                                    if ((m as any).motherId) gParentIdsMM.add((m as any).motherId);
                                });
                                // Filter by gender: Uncle (خال) or Aunt (خالة)
                                const specificParentIdsM = indexedPeople.filter(p => 
                                    (intent.id === 'rel_cousins_maternal_uncle' ? p.gender === 'male' : p.gender === 'female') && 
                                    (p.parents?.some(pid => gParentIdsMM.has(pid)) || 
                                     gParentIdsMM.has((p as any).fatherId) || 
                                     gParentIdsMM.has((p as any).motherId)) &&
                                    !tMotherIdsM.has(p.id)
                                ).map(u => u.id);

                                // 2. Find children
                                candidates = indexedPeople.filter(p => 
                                    (p.parents?.some(pid => specificParentIdsM.includes(pid)) || 
                                     specificParentIdsM.includes((p as any).fatherId) || 
                                     specificParentIdsM.includes((p as any).motherId)) &&
                                    !targetIds.has(p.id)
                                );
                                break;
                            case 'rel_grandparents':
                            case 'rel_grandmothers':
                                // 1. Find all parents of the targets
                                const parentsOfTargetsIds = new Set<string>();
                                targets.forEach(t => {
                                    t.parents?.forEach(pid => parentsOfTargetsIds.add(pid));
                                    if ((t as any).fatherId) parentsOfTargetsIds.add((t as any).fatherId);
                                    if ((t as any).motherId) parentsOfTargetsIds.add((t as any).motherId);
                                });

                                // 2. Find the grandparents (parents of those parents)
                                const grandparentsIds = new Set<string>();
                                indexedPeople.filter(p => parentsOfTargetsIds.has(p.id)).forEach(parent => {
                                    parent.parents?.forEach(pid => grandparentsIds.add(pid));
                                    if ((parent as any).fatherId) grandparentsIds.add((parent as any).fatherId);
                                    if ((parent as any).motherId) grandparentsIds.add((parent as any).motherId);
                                });

                                // 3. Set candidates
                                candidates = indexedPeople.filter(p => 
                                    grandparentsIds.has(p.id) &&
                                    (intent.id === 'rel_grandmothers' ? p.gender === 'female' : true)
                                );
                                break;
                        }
                    }
                } else if (intent.logicType === 'LOCATIONAL' && intent.locationCity) {
                    inferenceSucceeded = true;
                    const city = normalizeSearchText(intent.locationCity);
                    candidates = candidates.filter(p => 
                        normalizeSearchText(p.birthPlace || '').includes(city) || 
                        normalizeSearchText((p as any).currentLocation || '').includes(city)
                    );
                } else if (intent.logicType === 'CATEGORICAL') {
                    inferenceSucceeded = true;
                    candidates = candidates.filter(p => {
                        switch (intent.id) {
                            case 'children': return (calculateAge(p.birthDate || '') || 99) < 15;
                            case 'seniors': return (calculateAge(p.birthDate || '') || 0) > 60;
                            case 'females': return p.gender === 'female';
                            case 'males': return p.gender === 'male';
                            case 'deceased': return p.isDeceased;
                            case 'living': return !p.isDeceased;
                            default: return true;
                        }
                    });
                }
            }
        }

        // 2. FALLBACK Control
        if (!inferenceSucceeded && !intentDetected) {
            return runFuzzySearch(query, indexedPeople, limit);
        }

        if (intentDetected && !inferenceSucceeded) {
            return [];
        }

        // 3. Final Fuzzy Search on remaining text if any
        if (parsed.remainingText && candidates.length > 0) {
            const exactWithinCandidates = runExactNameSearch(parsed.remainingText, candidates, limit);
            if (exactWithinCandidates.length > 0) return exactWithinCandidates;
            return runFuzzySearch(parsed.remainingText, candidates, limit);
        }

        return candidates.slice(0, limit).map((person) => ({
            person,
            score: 90,
            matchType: 'exact',
            reason: 'intent',
        }));
    }
};
