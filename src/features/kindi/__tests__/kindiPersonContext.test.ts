import { describe, expect, it } from 'vitest';

import type { Person } from '../../../types';
import { getKindiPersonContextLabel } from '../logic/kindiPersonContext';

const person = (id: string, firstName: string, overrides: Partial<Person> = {}): Person => ({
  id,
  title: '',
  firstName,
  middleName: '',
  lastName: 'Alqarji',
  birthName: '',
  nickName: '',
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
  ...overrides,
});

describe('getKindiPersonContextLabel', () => {
  it('describes a person by parent when available', () => {
    const father = person('father', 'Mahmoud');
    const child = person('child', 'Ali', { parents: [father.id] });

    expect(getKindiPersonContextLabel(child, { [father.id]: father, [child.id]: child }))
      .toBe('ابن Mahmoud Alqarji');
  });

  it('falls back to spouse context', () => {
    const spouse = person('spouse', 'Noura', { gender: 'female' });
    const husband = person('husband', 'Sami', { spouses: [spouse.id] });

    expect(getKindiPersonContextLabel(husband, { [spouse.id]: spouse, [husband.id]: husband }))
      .toBe('زوج Noura Alqarji');
  });

  it('uses child context when no parent or spouse exists', () => {
    const child = person('child', 'Lina', { gender: 'female' });
    const mother = person('mother', 'Rana', { gender: 'female', children: [child.id] });

    expect(getKindiPersonContextLabel(mother, { [child.id]: child, [mother.id]: mother }))
      .toBe('والدة Lina Alqarji');
  });
});

