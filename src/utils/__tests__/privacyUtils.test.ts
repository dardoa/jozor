import { describe, expect, it } from 'vitest';
import { calculateAge, isPersonLiving, shouldMaskPerson, maskPerson, maskPeopleMap } from '../privacyUtils';
import type { Person } from '../../types';
import { DEFAULT_PERSON_TEMPLATE } from '../../constants';

const buildPerson = (overrides: Partial<Person> = {}): Person => ({
  id: 'test-person-id',
  ...DEFAULT_PERSON_TEMPLATE,
  firstName: 'John',
  lastName: 'Doe',
  gender: 'male',
  birthDate: '',
  birthPlace: '',
  birthSource: '',
  deathDate: '',
  deathPlace: '',
  deathSource: '',
  burialPlace: '',
  residence: '',
  isDeceased: false,
  gallery: [],
  voiceNotes: [],
  sources: [],
  events: [],
  email: '',
  website: '',
  blog: '',
  address: '',
  parents: [],
  spouses: [],
  children: [],
  ...overrides,
});

describe('privacyUtils', () => {
  describe('calculateAge', () => {
    it('returns -1 for invalid or empty dates', () => {
      expect(calculateAge(null)).toBe(-1);
      expect(calculateAge(undefined)).toBe(-1);
      expect(calculateAge('')).toBe(-1);
      expect(calculateAge('invalid-date')).toBe(-1);
    });

    it('calculates correct age for YYYY format', () => {
      const currentYear = new Date().getFullYear();
      const birthYear = currentYear - 30;
      expect(calculateAge(birthYear.toString())).toBe(30);
    });

    it('calculates correct age for YYYY-MM format', () => {
      const currentYear = new Date().getFullYear();
      const birthYear = currentYear - 15;
      expect(calculateAge(`${birthYear}-01`)).toBe(15);
    });

    it('calculates correct age for YYYY-MM-DD format', () => {
      const now = new Date();
      const birthDate = new Date();
      birthDate.setFullYear(now.getFullYear() - 25);
      
      // format birthDate as YYYY-MM-DD
      const yyyy = birthDate.getFullYear();
      const mm = String(birthDate.getMonth() + 1).padStart(2, '0');
      const dd = String(birthDate.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      
      expect(calculateAge(dateStr)).toBe(25);
    });
  });

  describe('isPersonLiving', () => {
    it('returns false if explicitly marked deceased', () => {
      expect(isPersonLiving({ isDeceased: true })).toBe(false);
      expect(isPersonLiving({ isDeceased: true, birthDate: '2010-01-01' })).toBe(false);
    });

    it('returns false if deathDate is set', () => {
      expect(isPersonLiving({ deathDate: '2020-05-15' })).toBe(false);
      expect(isPersonLiving({ deathDate: '   ' })).toBe(true); // empty string is ignored
    });

    it('returns false if calculated age is over 110 years', () => {
      const currentYear = new Date().getFullYear();
      const birthYear = currentYear - 115;
      expect(isPersonLiving({ birthDate: `${birthYear}-01-01` })).toBe(false);
    });

    it('returns true by default (living)', () => {
      expect(isPersonLiving({})).toBe(true);
      expect(isPersonLiving({ birthDate: '1990-01-01' })).toBe(true);
    });
  });

  describe('shouldMaskPerson', () => {
    it('returns true if isPrivate is true', () => {
      const person = buildPerson({ isPrivate: true, isDeceased: true });
      expect(shouldMaskPerson(person)).toBe(true);
    });

    it('returns true if person is living', () => {
      const person = buildPerson({ isDeceased: false, birthDate: '1995-01-01' });
      expect(shouldMaskPerson(person)).toBe(true);
    });

    it('returns false if person is deceased and not private', () => {
      const person = buildPerson({ isDeceased: true, isPrivate: false });
      expect(shouldMaskPerson(person)).toBe(false);
    });
  });

  describe('maskPerson', () => {
    it('does not mask deceased non-private people', () => {
      const person = buildPerson({
        isDeceased: true,
        firstName: 'John',
        lastName: 'Doe',
      });
      const result = maskPerson(person);
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
    });

    it('masks living people but preserves structural connections, gender, and technical details', () => {
      const person = buildPerson({
        id: 'some-unique-id',
        firstName: 'Ahmad',
        lastName: 'Zaid',
        gender: 'male',
        isDeceased: false,
        birthDate: '1990-01-01',
        birthPlace: 'Cairo',
        bio: 'Active developer',
        email: 'ahmad@example.com',
        parents: ['father-id', 'mother-id'],
        spouses: ['spouse-id'],
        children: ['child-id'],
        partnerDetails: {
          'spouse-id': {
            type: 'married',
            startDate: '2015-05-01',
            startPlace: 'Alexandria',
          },
        },
        metadata: {
          lastUpdated: { name: '2026-06-23T11:00:00Z' },
        },
      });

      const masked = maskPerson(person);

      // Masked details
      expect(masked.firstName).toBe('Private');
      expect(masked.lastName).toBe('');
      expect(masked.birthDate).toBe('');
      expect(masked.birthPlace).toBe('');
      expect(masked.bio).toBe('');
      expect(masked.email).toBe('');
      expect(masked.partnerDetails?.['spouse-id']?.startDate).toBe('');
      expect(masked.partnerDetails?.['spouse-id']?.startPlace).toBe('');

      // Preserved structure and identifiers
      expect(masked.id).toBe('some-unique-id');
      expect(masked.gender).toBe('male');
      expect(masked.parents).toEqual(['father-id', 'mother-id']);
      expect(masked.spouses).toEqual(['spouse-id']);
      expect(masked.children).toEqual(['child-id']);
      expect(masked.partnerDetails?.['spouse-id']?.type).toBe('married');
      expect(masked.metadata?.lastUpdated).toEqual({ name: '2026-06-23T11:00:00Z' });
    });
  });

  describe('maskPeopleMap', () => {
    it('correctly maps and masks multiple people', () => {
      const map = {
        'p-1': buildPerson({ id: 'p-1', firstName: 'Living', isDeceased: false }),
        'p-2': buildPerson({ id: 'p-2', firstName: 'Deceased', isDeceased: true, deathDate: '2000-01-01' }),
      };

      const result = maskPeopleMap(map);
      expect(result['p-1'].firstName).toBe('Private');
      expect(result['p-2'].firstName).toBe('Deceased');
    });
  });
});
