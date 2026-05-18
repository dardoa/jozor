import { describe, expect, it } from 'vitest';
import {
  detectUpdateField,
  parseUpdateCommand,
  extractUpdateFields,
} from '../logic/parsers/updateCommandParser';

describe('updateCommandParser', () => {
  describe('detectUpdateField', () => {
    it('detects fields correctly from Arabic and English queries', () => {
      expect(detectUpdateField('تاريخ ميلاد أحمد')).toBe('birthDate');
      expect(detectUpdateField('مكان سكن فاطمة')).toBe('residence');
      expect(detectUpdateField('المهنة لمحمود')).toBe('profession');
    });
  });

  describe('parseUpdateCommand', () => {
    it('parses update field, subject name and target value', () => {
      const parsed = parseUpdateCommand('عدل السكن لمحمود القرجي إلى الرياض');
      expect(parsed).toEqual({
        field: 'residence',
        subjectText: 'محمود القرجي',
        value: 'الرياض',
      });
    });
  });

  describe('extractUpdateFields', () => {
    it('extracts correct fields in partial Person form', () => {
      const updates = extractUpdateFields('تغيير مهنة أحمد القرجي إلى طبيب ولد في الرياض عام 1990');
      expect(updates).toEqual({
        profession: 'طبيب',
        birthPlace: 'الرياض',
        birthDate: '1990',
      });
    });
  });
});
