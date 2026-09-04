import { describe, expect, it } from 'vitest';
import { parseKindiCommand, extractKindiTargetText } from '../logic/parsers/addCommandParser';

describe('addCommandParser', () => {
  describe('extractKindiTargetText', () => {
    it('extracts targets with lam and other prepositions', () => {
      expect(extractKindiTargetText('أضف ولد لـ محمود')).toBe('محمود');
      expect(extractKindiTargetText('أضف بنت إلى رمضان القرجي')).toBe('رمضان القرجي');
      expect(extractKindiTargetText('أضف ولد له')).toBeUndefined();
    });
  });

  describe('parseKindiCommand', () => {
    it('correctly parses relation, gender, new person name, target mention and initial profile records', () => {
      const parsed = parseKindiCommand('أضف ابن اسمه آدم لـ محمود القرجي ولد في الرياض عام 2020');
      expect(parsed).toEqual({
        relation: 'child',
        gender: 'male',
        newPersonName: {
          firstName: 'آدم',
          lastName: undefined,
        },
        targetMention: 'محمود القرجي',
        initialUpdates: {
          birthPlace: 'الرياض',
          birthDate: '2020',
        },
      });
    });

    it('parses conservative dialect relation terms without touching names', () => {
      const parsed = parseKindiCommand('ضيف ولده لمحمود اسمه علي');

      expect(parsed).toEqual({
        relation: 'child',
        gender: 'male',
        newPersonName: {
          firstName: 'علي',
          lastName: undefined,
        },
        targetMention: 'محمود',
        initialUpdates: undefined,
      });
    });

    it('does not mistake English articles or relationship words for a person name', () => {
      expect(parseKindiCommand('add a son to this person')).toMatchObject({
        relation: 'child',
        gender: 'male',
        newPersonName: undefined,
        targetMention: 'this person',
      });
      expect(parseKindiCommand('add a daughter')).toMatchObject({
        relation: 'child',
        gender: 'female',
        newPersonName: undefined,
      });
    });

    it('preserves an explicitly marked English name', () => {
      expect(parseKindiCommand('add a son named Adam Test to Sami Test')).toMatchObject({
        relation: 'child',
        gender: 'male',
        newPersonName: {
          firstName: 'Adam',
          lastName: 'Test',
        },
        targetMention: 'Sami Test',
      });
    });
  });
});
