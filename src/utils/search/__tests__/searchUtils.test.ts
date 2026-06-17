import { describe, it, expect } from 'vitest';
import { normalizeSearchText, tokenizeSearchQuery } from '../searchUtils';

describe('searchUtils', () => {
    describe('normalizeSearchText', () => {
        it('should normalize Arabic hamzas and teh marbuta', () => {
            expect(normalizeSearchText('أحمد')).toBe('احمد');
            expect(normalizeSearchText('إبراهيم')).toBe('ابراهيم');
            expect(normalizeSearchText('فاطمة')).toBe('فاطمه');
            expect(normalizeSearchText('آية')).toBe('ايه');
        });

        it('should strip Arabic "Al-" prefix correctly', () => {
            expect(normalizeSearchText('العربي')).toBe('عربي');
            expect(normalizeSearchText('عبد الرحمن')).toBe('عبد رحمن');
            expect(normalizeSearchText('الالفي')).toBe('الفي'); // Note: ال + الفي -> strip ال -> الفي
        });

        it('should normalize English casing and spaces', () => {
            expect(normalizeSearchText('  John   DOE  ')).toBe('john doe');
        });

        it('should handle undefined or empty string gracefully', () => {
            expect(normalizeSearchText(undefined)).toBe('');
            expect(normalizeSearchText('')).toBe('');
        });
    });

    describe('tokenizeSearchQuery', () => {
        it('should split query and filter out stop words', () => {
            expect(tokenizeSearchQuery('احمد في القاهرة')).toEqual(['احمد', 'قاهره']);
            expect(tokenizeSearchQuery('john and doe')).toEqual(['john', 'doe']);
            expect(tokenizeSearchQuery('صاحب اسم')).toEqual([]);
        });

        it('should filter out extra spaces and empty tokens', () => {
            expect(tokenizeSearchQuery('  احمد   ')).toEqual(['احمد']);
        });
    });
});
