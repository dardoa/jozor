import type Fuse from 'fuse.js';
import { Person } from '../types';
import { logInfo } from '../utils/errorLogger';
import { normalizeArabic } from '../utils/search/arabicUtils';
import { parseSearchQuery, ParsedIntent } from './search/queryParser';
import { getDisplayDate } from '../utils/familyLogic';

let fuse: Fuse<Person> | null = null;
let indexedPeople: Person[] = [];
let fuseLoader: Promise<typeof import('fuse.js').default> | null = null;

const FUSE_OPTIONS = {
    threshold: 0.35,
    distance: 100,
    ignoreLocation: true,
    minMatchCharLength: 2,
    keys: [
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

const calculateAge = (birthDate: string): number | null => {
    if (!birthDate) return null;
    const year = parseInt(getDisplayDate(birthDate), 10);
    if (isNaN(year)) return null;
    return new Date().getFullYear() - year;
};

/**
 * Finds target persons using strict tiered matching:
 * 1. Single word: Match firstName
 * 2. Two words: Match firstName AND lastName (ignore middle)
 * 3. Three words: Match firstName AND middleName AND lastName
 */
const findTargetPeople = async (name: string, people: Person[]): Promise<Person[]> => {
    const normalizedQuery = normalizeArabic(name);
    const words = normalizedQuery.split(/\s+/).filter(Boolean);
    
    if (words.length === 0) return [];

    return people.filter(p => {
        const pFirst = normalizeArabic(p.firstName);
        const pMiddle = normalizeArabic(p.middleName || '');
        const pLast = normalizeArabic(p.lastName);

        if (words.length === 1) {
            // Rule: Match First Name only
            return pFirst === words[0];
        }

        if (words.length === 2) {
            // Rule: Match First AND Last (ignore middle)
            // Note: Use fuzzy for Last name to handle Al-Qarji vs Al-Qairji if needed? 
            // The user said "Match First and Last", I'll start with exact but allow 1 char difference for typos.
            const lastMatch = pLast === words[1] || (pLast.length > 3 && words[1].length > 3 && 
                              (pLast.includes(words[1]) || words[1].includes(pLast)));
            return pFirst === words[0] && lastMatch;
        }

        if (words.length >= 3) {
            // Rule: Match First, Middle, and Last
            const lastWord = words[words.length - 1];
            const middleWord = words[1];
            const lastMatch = pLast === lastWord || pLast.includes(lastWord);
            return pFirst === words[0] && pMiddle.includes(middleWord) && lastMatch;
        }

        return false;
    });
};

export const searchService = {
    async updateSearchIndex(people: Person[]) {
        indexedPeople = people.map(p => ({
            ...p,
            normalizedFirstName: normalizeArabic(p.firstName),
            normalizedLastName: normalizeArabic(p.lastName),
            normalizedMiddleName: normalizeArabic(p.middleName || ''),
            normalizedNickName: normalizeArabic(p.nickName || ''),
            normalizedBirthPlace: normalizeArabic(p.birthPlace || '')
        } as any));

        const FuseConstructor = await loadFuse();
        fuse = new FuseConstructor(indexedPeople, FUSE_OPTIONS);
    },

    async search(query: string, limit = 20): Promise<Person[]> {
        if (!query.trim()) return [];
        
        const parsed = parseSearchQuery(query);
        let candidates = indexedPeople;
        let intentDetected = parsed.intents.length > 0;
        let inferenceSucceeded = false;

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
                    const city = normalizeArabic(intent.locationCity);
                    candidates = candidates.filter(p => 
                        normalizeArabic(p.birthPlace || '').includes(city) || 
                        normalizeArabic(p.currentLocation || '').includes(city)
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
            const FuseConstructor = await loadFuse();
            const fallbackFuse = new FuseConstructor(indexedPeople, FUSE_OPTIONS);
            const results = fallbackFuse.search(normalizeArabic(query));
            return results.slice(0, limit).map(r => r.item);
        }

        if (intentDetected && !inferenceSucceeded) {
            return [];
        }

        // 3. Final Fuzzy Search on remaining text if any
        if (parsed.remainingText && candidates.length > 0) {
            const FuseConstructor = await loadFuse();
            const tempFuse = new FuseConstructor(candidates, FUSE_OPTIONS);
            const results = tempFuse.search(normalizeArabic(parsed.remainingText));
            return results.slice(0, limit).map(r => r.item);
        }

        return candidates.slice(0, limit);
    }
};
