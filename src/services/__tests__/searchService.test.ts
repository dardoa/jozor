// @ts-nocheck
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { searchService } from '../searchService';
import { normalizeArabic } from '../../utils/search/arabicUtils';
import { parseSearchQuery } from '../search/queryParser';

// Mocking console and errorLogger to keep test output clean
vi.mock('../../utils/errorLogger', () => ({
    logInfo: vi.fn(),
    logError: vi.fn()
}));

const mockPeople = [
    { id: '1', firstName: 'أحمد', lastName: 'القرجي', gender: 'male', birthDate: '1990-01-01', isDeceased: false },
    { id: '2', firstName: 'سارة', lastName: 'القرجي', gender: 'female', birthDate: '2015-05-12', isDeceased: false }, // Child
    { id: '3', firstName: 'محمد', lastName: 'القرجي', gender: 'male', birthDate: '1940-06-20', isDeceased: true },   // Senior & Deceased
    { id: '4', firstName: 'ليلى', lastName: 'القرجي', gender: 'female', birthDate: '1995-11-05', isDeceased: false },
    { id: '5', firstName: 'John', lastName: 'Doe', gender: 'male', birthDate: '2020-01-01', isDeceased: false }      // English Child
];

describe('Search Service & NLP Utilities', () => {
    
    describe('Arabic Normalization', () => {
        it('should normalize Alifs and Teh Marbuta', () => {
            expect(normalizeArabic('أحمد')).toBe('احمد');
            expect(normalizeArabic('فاطمة')).toBe('فاطمه');
            expect(normalizeArabic('ليلى')).toBe('ليلي');
        });

        it('should remove diacritics', () => {
            expect(normalizeArabic('أَحْمَدُ')).toBe('احمد');
        });
    });

    describe('Query Parser', () => {
        it('should detect Arabic intents', () => {
            const parsed = parseSearchQuery('أطفال القرجي');
            expect(parsed.intents).toContain('children');
            expect(parsed.remainingText).toBe('القرجي');
        });

        it('should detect English intents and remove stop-words', () => {
            const parsed = parseSearchQuery('children of Doe');
            expect(parsed.intents).toContain('children');
            expect(parsed.remainingText).toBe('doe'); // "of" is removed
        });

        it('should handle complex intents', () => {
            const parsed = parseSearchQuery('بنات متوفين');
            expect(parsed.intents).toContain('females');
            expect(parsed.intents).toContain('deceased');
        });
    });

    describe('searchService logic', () => {
        beforeEach(async () => {
            await searchService.updateSearchIndex(mockPeople as any);
        });

        it('should filter by children intent', async () => {
            const results = await searchService.search('أطفال');
            // Sara (2015) and John (2020) are children in 2026
            expect(results.some(p => p.firstName === 'سارة')).toBe(true);
            expect(results.some(p => p.firstName === 'John')).toBe(true);
            expect(results.length).toBe(2);
        });

        it('should filter by gender and name', async () => {
            const results = await searchService.search('بنات القرجي');
            expect(results.every(p => p.gender === 'female')).toBe(true);
            expect(results.some(p => p.firstName === 'سارة')).toBe(true);
            expect(results.some(p => p.firstName === 'ليلى')).toBe(true);
        });

        it('should handle deceased senior search', async () => {
            const results = await searchService.search('متوفين كبار السن');
            expect(results.length).toBe(1);
            expect(results[0].firstName).toBe('محمد');
        });
    });
});

