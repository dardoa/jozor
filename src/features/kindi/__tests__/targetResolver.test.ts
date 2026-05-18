import { describe, expect, it } from 'vitest';
import type { Person } from '../../../types';
import { findKindiTargetCandidates, resolveKindiCommandTarget } from '../logic/parsers/targetResolver';

const mockPerson = (id: string, firstName: string, lastName: string, nickName = ''): Person => ({
  id,
  title: '',
  firstName,
  middleName: '',
  lastName,
  birthName: '',
  nickName,
  suffix: '',
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
  profession: '',
  company: '',
  interests: '',
  bio: '',
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
  partnerDetails: {},
});

describe('targetResolver', () => {
  const p1 = mockPerson('p1', 'محمود', 'القرجي', 'أبو حنيفة');
  const p2 = mockPerson('p2', 'رمضان', 'القرجي');
  const people = [p1, p2];

  describe('findKindiTargetCandidates', () => {
    it('finds candidates by exact and fuzzy first name and nick names', () => {
      expect(findKindiTargetCandidates('محمود', people)).toEqual([p1]);
      expect(findKindiTargetCandidates('أبو حنيفة', people)).toEqual([p1]);
      expect(findKindiTargetCandidates('رمضان القرجي', people)).toEqual([p2]);
    });

    it('uses fuzzy match (Levenshtein) for typos', () => {
      // 'محموت' instead of 'محمود'
      expect(findKindiTargetCandidates('محموت', people)).toEqual([p1]);
    });
  });

  describe('resolveKindiCommandTarget', () => {
    it('returns exact match status when only one candidate is matched', () => {
      expect(resolveKindiCommandTarget('محمود', people)).toEqual({
        status: 'exact',
        candidates: [p1],
      });
    });

    it('returns not_found status when no candidate is matched', () => {
      expect(resolveKindiCommandTarget('يوسف', people)).toEqual({
        status: 'not_found',
        candidates: [],
      });
    });

    it('returns ambiguous status when multiple candidates match', () => {
      expect(resolveKindiCommandTarget('القرجي', people)).toEqual({
        status: 'ambiguous',
        candidates: [p1, p2],
      });
    });
  });
});
