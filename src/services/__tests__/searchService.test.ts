import { describe, it, expect, beforeEach, vi } from 'vitest';
import { searchService } from '../searchService';
import { normalizeArabic } from '../../utils/search/arabicUtils';
import { parseSearchQuery } from '../search/queryParser';
import type { Person } from '../../types';

vi.mock('../../utils/errorLogger', () => ({
    logInfo: vi.fn(),
    logError: vi.fn()
}));

const makePerson = (person: Partial<Person> & Pick<Person, 'id' | 'firstName' | 'lastName' | 'gender'>): Person => ({
    id: person.id,
    title: '',
    firstName: person.firstName,
    middleName: person.middleName ?? '',
    lastName: person.lastName,
    birthName: '',
    nickName: person.nickName ?? '',
    suffix: '',
    gender: person.gender,
    birthDate: person.birthDate ?? '',
    birthPlace: person.birthPlace ?? '',
    birthSource: '',
    deathDate: person.deathDate ?? '',
    deathPlace: person.deathPlace ?? '',
    deathSource: '',
    burialPlace: '',
    residence: '',
    isDeceased: person.isDeceased ?? false,
    profession: person.profession ?? '',
    company: '',
    interests: '',
    bio: person.bio ?? '',
    gallery: [],
    voiceNotes: [],
    sources: [],
    events: [],
    email: '',
    website: '',
    blog: '',
    address: '',
    parents: person.parents ?? [],
    spouses: person.spouses ?? [],
    children: person.children ?? [],
});

const mockPeople = [
    makePerson({ id: '1', firstName: 'أحمد', lastName: 'القرجي', gender: 'male', birthDate: '1990-01-01' }),
    makePerson({ id: '2', firstName: 'سارة', lastName: 'القرجي', gender: 'female', birthDate: '2015-05-12' }),
    makePerson({ id: '3', firstName: 'محمد', lastName: 'القرجي', gender: 'male', birthDate: '1940-06-20', isDeceased: true }),
    makePerson({ id: '4', firstName: 'ليلى', lastName: 'القرجي', gender: 'female', birthDate: '1995-11-05' }),
    makePerson({ id: '5', firstName: 'John', lastName: 'Doe', gender: 'male', birthDate: '2020-01-01' }),
    makePerson({ id: '6', firstName: 'لينا', lastName: 'محمد القرجي', gender: 'female', birthDate: '1985-01-01' }),
    makePerson({ id: '7', firstName: 'زيناد', lastName: 'القدور', gender: 'female', birthDate: '2013-01-01' }),
];

describe('Search Service & NLP Utilities', () => {
    describe('Arabic Normalization', () => {
        it('normalizes Alifs and Teh Marbuta', () => {
            expect(normalizeArabic('أحمد')).toBe('احمد');
            expect(normalizeArabic('فاطمة')).toBe('فاطمه');
            expect(normalizeArabic('ليلى')).toBe('ليلي');
        });

        it('removes diacritics', () => {
            expect(normalizeArabic('أَحْمَدُ')).toBe('احمد');
        });
    });

    describe('Query Parser', () => {
        it('detects Arabic intents', () => {
            const parsed = parseSearchQuery('أطفال القرجي');
            expect(parsed.intents.map(intent => intent.id)).toContain('children');
            expect(parsed.remainingText).toBe('القرجي');
        });

        it('detects English relational intents', () => {
            const parsed = parseSearchQuery('children of Doe');
            expect(parsed.intents.map(intent => intent.id)).toContain('rel_children');
            expect(parsed.intents[0]).toMatchObject({ targetName: 'doe' });
            expect(parsed.remainingText).toBe('');
        });

        it('prefers daughters relationship when "بنات" has a target', () => {
            const parsed = parseSearchQuery('بنات محمد');
            expect(parsed.intents.map(intent => intent.id)).toContain('rel_daughters');
            expect(parsed.intents.map(intent => intent.id)).not.toContain('females');
            expect(parsed.intents[0]).toMatchObject({ targetName: 'محمد' });
        });

        it('does not treat interrogative "من" as a location', () => {
            const parsed = parseSearchQuery('من هي لينا');
            expect(parsed.intents.map(intent => intent.id)).not.toContain('loc_indicator');
            expect(parsed.remainingText).toBe('لينا');
        });

        it('handles complex categorical intents', () => {
            const parsed = parseSearchQuery('بنات متوفين');
            expect(parsed.intents.map(intent => intent.id)).toContain('females');
            expect(parsed.intents.map(intent => intent.id)).toContain('deceased');
        });
        it('detects colloquial Arabic spouse relationship queries', () => {
            const parsed = parseSearchQuery('جوز ريم');
            expect(parsed.intents.map(intent => intent.id)).toContain('rel_spouses');
            expect(parsed.intents[0]).toMatchObject({ targetName: 'ريم' });
        });
        it('detects local dialect wife queries such as "مرت محمود"', () => {
            const parsed = parseSearchQuery('مرت محمود');
            expect(parsed.intents.map(intent => intent.id)).toContain('rel_spouses');
            expect(parsed.intents[0]).toMatchObject({ targetName: 'محمود' });
            expect(parsed.remainingText).toBe('');
        });
    });

    describe('searchService logic', () => {
        beforeEach(async () => {
            await searchService.updateSearchIndex(mockPeople);
        });

        it('filters by children intent', async () => {
            const results = await searchService.search('أطفال');
            expect(results.some(result => result.person.firstName === 'سارة')).toBe(true);
            expect(results.some(result => result.person.firstName === 'John')).toBe(true);
            expect(results.length).toBe(3);
        });

        it('filters by gender and name', async () => {
            const results = await searchService.search('نساء القرجي');
            expect(results.every(result => result.person.gender === 'female')).toBe(true);
            expect(results.some(result => result.person.firstName === 'سارة')).toBe(true);
            expect(results.some(result => result.person.firstName === 'ليلى')).toBe(true);
        });

        it('handles deceased senior search', async () => {
            const results = await searchService.search('متوفين كبار السن');
            expect(results.length).toBe(1);
            expect(results[0].person.firstName).toBe('محمد');
        });

        it('puts exact first-name matches before fuzzy matching', async () => {
            const results = await searchService.search('لينا');
            expect(results).toHaveLength(1);
            expect(results[0]).toMatchObject({
                person: expect.objectContaining({ firstName: 'لينا' }),
                matchType: 'exact',
                confidence: 'exact',
            });
            expect(results.some(result => result.person.firstName === 'زيناد')).toBe(false);
        });

        it('exposes raw Fuse confidence metadata for fuzzy matches', async () => {
            const results = await searchService.search('Johns');

            expect(results.length).toBeGreaterThan(0);
            expect(results[0]).toMatchObject({
                person: expect.objectContaining({ firstName: 'John' }),
                matchType: 'fuzzy',
                reason: 'fuse',
            });
            expect(results[0].fuseScore).toEqual(expect.any(Number));
            expect(['high', 'medium', 'low']).toContain(results[0].confidence);
        });

        it('matches compound names through normalized full-name search', async () => {
            const people = [
                makePerson({
                    id: 'compound',
                    firstName: 'محمد',
                    middleName: 'علي',
                    lastName: 'القرجي',
                    gender: 'male',
                }),
                makePerson({
                    id: 'other',
                    firstName: 'محمد',
                    middleName: 'خير',
                    lastName: 'القرجي',
                    gender: 'male',
                }),
            ];

            await searchService.updateSearchIndex(people);

            const exact = await searchService.search('محمد علي القرجي');
            expect(exact[0]).toMatchObject({
                person: expect.objectContaining({ id: 'compound' }),
                matchType: 'exact',
            });

            const prefix = await searchService.search('محمد علي');
            expect(prefix[0]).toMatchObject({
                person: expect.objectContaining({ id: 'compound' }),
                matchType: 'exact',
            });
        });

        it('finds spouses through colloquial Arabic spouse queries', async () => {
            const reem = makePerson({
                id: 'reem',
                firstName: 'ريم',
                lastName: 'القرجي',
                gender: 'female',
                spouses: ['husband'],
            });
            const husband = makePerson({
                id: 'husband',
                firstName: 'سامي',
                lastName: 'القرجي',
                gender: 'male',
                spouses: ['reem'],
            });

            await searchService.updateSearchIndex([reem, husband]);

            const results = await searchService.search('جوز ريم');
            expect(results).toHaveLength(1);
            expect(results[0]).toMatchObject({
                person: expect.objectContaining({ id: 'husband' }),
                reason: 'intent',
            });
        });
        it('finds wives through local dialect spouse queries', async () => {
            const mahmoud = makePerson({
                id: 'mahmoud',
                firstName: 'محمود',
                lastName: 'القرجي',
                gender: 'male',
                spouses: ['wife'],
            });
            const wife = makePerson({
                id: 'wife',
                firstName: 'فاطمة',
                lastName: 'القرجي',
                gender: 'female',
                spouses: ['mahmoud'],
            });

            await searchService.updateSearchIndex([mahmoud, wife]);

            const results = await searchService.search('مرت محمود');
            expect(results).toHaveLength(1);
            expect(results[0]).toMatchObject({
                person: expect.objectContaining({ id: 'wife' }),
                reason: 'intent',
            });
        });
    });
});
