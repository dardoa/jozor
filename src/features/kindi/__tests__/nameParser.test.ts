import { describe, expect, it } from 'vitest';
import {
  normalizeKindiText,
  cleanNameText,
  splitPersonName,
  parseKindiProvidedName,
  cleanUpdateValue,
} from '../logic/parsers/nameParser';

describe('nameParser', () => {
  describe('normalizeKindiText', () => {
    it('normalizes Arabic characters and trims whitespace', () => {
      expect(normalizeKindiText('أحمد  ')).toBe('احمد');
      expect(normalizeKindiText('فاطمة')).toBe('فاطمه');
      expect(normalizeKindiText(undefined)).toBe('');
    });
  });

  describe('cleanNameText', () => {
    it('removes punctuation and cleans spaces', () => {
      expect(cleanNameText('أحمد، محمد')).toBe('أحمد محمد');
      expect(cleanNameText('  ')).toBeUndefined();
    });
  });

  describe('splitPersonName', () => {
    it('splits first and last names correctly', () => {
      expect(splitPersonName('أحمد')).toEqual({
        firstName: 'أحمد',
        lastName: undefined,
      });
      expect(splitPersonName('أحمد محمد القرجي')).toEqual({
        firstName: 'أحمد',
        lastName: 'محمد القرجي',
      });
    });
  });

  describe('parseKindiProvidedName', () => {
    it('removes common name introducing prefixes', () => {
      expect(parseKindiProvidedName('اسمه أحمد')).toEqual({
        firstName: 'أحمد',
        lastName: undefined,
      });
      expect(parseKindiProvidedName('اسمها فاطمة')).toEqual({
        firstName: 'فاطمة',
        lastName: undefined,
      });
    });
  });

  describe('cleanUpdateValue', () => {
    it('removes narrative pronouns and matches empty placeholders', () => {
      expect(cleanUpdateValue('هو طبيب')).toBe('طبيب');
      expect(cleanUpdateValue('فارغ')).toBe('');
      expect(cleanUpdateValue(undefined)).toBeUndefined();
    });
  });
});
