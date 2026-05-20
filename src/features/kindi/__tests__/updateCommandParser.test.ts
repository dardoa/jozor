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
      expect(detectUpdateField('سامي ساكن في الرياض')).toBe('residence');
      expect(detectUpdateField('سامي يشتغل طبيب')).toBe('profession');
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

    it('keeps dialect inline update subjects clean', () => {
      const parsed = parseUpdateCommand('عدل سامي ساكن في الرياض');

      expect(parsed).toEqual({
        field: 'residence',
        subjectText: 'سامي',
        value: undefined,
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

    it('extracts conservative dialect residence and profession updates', () => {
      expect(extractUpdateFields('عدل سامي ساكن في الرياض')).toEqual({
        residence: 'الرياض',
      });

      expect(extractUpdateFields('غير شغل سامي إلى طبيب')).toEqual({
        profession: 'طبيب',
      });
    });
  });
});
