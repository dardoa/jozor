import { describe, expect, it } from 'vitest';

import type { Person } from '../../../types';
import { searchService } from '../../../services/searchService';
import { findKindiTargetCandidates } from '../logic/kindiExecutivePlanner';

const person = (
  id: string,
  firstName: string,
  middleName = '',
  lastName = 'القرجي'
): Person => ({
  id,
  title: '',
  firstName,
  middleName,
  lastName,
  birthName: '',
  nickName: '',
  suffix: '',
  gender: id.endsWith('f') ? 'female' : 'male',
  birthDate: '',
  birthPlace: id.endsWith('makkah') ? 'مكة' : '',
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

const buildPeople = (count: number): Person[] => {
  const firstNames = ['محمد', 'محمود', 'سامي', 'رمضان', 'علي', 'ليلى', 'نورة', 'فاطمة'];
  const middleNames = ['خير', 'علي', 'رمضان', 'سالم', 'حسن', 'محمود'];
  const lastNames = ['القرجي', 'الشريف', 'العلي', 'الشيخ'];

  return Array.from({ length: count }, (_, index) =>
    person(
      `p-${index}`,
      firstNames[index % firstNames.length],
      middleNames[index % middleNames.length],
      lastNames[index % lastNames.length]
    )
  );
};

const measure = <T>(label: string, action: () => T): { durationMs: number; value: T } => {
  const startedAt = performance.now();
  const value = action();
  const durationMs = performance.now() - startedAt;
  console.info(`[Kindi performance] ${label}: ${durationMs.toFixed(2)}ms`);
  return { durationMs, value };
};

const measureAsync = async <T>(label: string, action: () => Promise<T>): Promise<{ durationMs: number; value: T }> => {
  const startedAt = performance.now();
  const value = await action();
  const durationMs = performance.now() - startedAt;
  console.info(`[Kindi performance] ${label}: ${durationMs.toFixed(2)}ms`);
  return { durationMs, value };
};

describe('Kindi performance guardrails', () => {
  it('resolves command targets within broad guardrails for large trees', () => {
    const thresholds: Record<number, number> = {
      1000: 500,
      5000: 1500,
      10000: 3000,
    };

    for (const count of [1000, 5000, 10000]) {
      const people = buildPeople(count);
      people.push(person('target', 'محمد', 'خير', 'القرجي'));

      const { durationMs, value } = measure(
        `findKindiTargetCandidates ${count}`,
        () => findKindiTargetCandidates('محمد خير القرجي', people)
      );

      expect(value.some((candidate) => candidate.id === 'target')).toBe(true);
      expect(durationMs).toBeLessThan(thresholds[count]);
    }
  });

  it('keeps indexed search responsive on a large synthetic tree', async () => {
    const people = buildPeople(5000);
    people.push(person('target-search', 'لينا', 'محمد', 'القرجي'));

    const update = await measureAsync(
      'searchService.updateSearchIndex 5000',
      () => searchService.updateSearchIndex(people)
    );
    const search = await measureAsync(
      'searchService.search exact Arabic compound 5000',
      () => searchService.search('لينا محمد القرجي', 12)
    );

    expect(search.value[0]?.person.id).toBe('target-search');
    expect(update.durationMs).toBeLessThan(4000);
    expect(search.durationMs).toBeLessThan(1000);
  });
});
