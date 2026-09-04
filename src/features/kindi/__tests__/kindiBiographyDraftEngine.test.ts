import { describe, expect, it } from 'vitest';

import type { Person } from '../../../types/person';
import { resolveKindiBiographyDraft } from '../logic/kindiBiographyDraftEngine';

const person = (id: string, firstName: string, overrides: Partial<Person> = {}): Person => ({
  id,
  title: '',
  firstName,
  middleName: '',
  lastName: 'القرجي',
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

describe('resolveKindiBiographyDraft', () => {
  it('ignores queries that do not request a biography draft', () => {
    expect(resolveKindiBiographyDraft({
      query: 'من هم أبناء هذا الشخص؟',
      people: [],
      language: 'ar',
    })).toBeNull();
  });

  it('builds an Arabic draft from recorded facts without mutating the source record', () => {
    const source = person('raw-person-id-sentinel', 'رمضان', {
      birthDate: '1895-03-02',
      birthPlace: 'المدينة المنورة',
      profession: 'معلّم',
      residence: 'مكة المكرمة',
      isDeceased: true,
      deathDate: '1983-08-01',
      deathPlace: 'جدة',
      email: 'private@example.test',
      photoUrl: 'https://private.supabase.co/photo.jpg',
      bio: 'bearer private-auth-token',
    });
    const snapshot = structuredClone(source);

    const result = resolveKindiBiographyDraft({
      query: 'اكتب مسودة سيرة لهذا الشخص',
      people: [source],
      contextPersonId: source.id,
      language: 'ar',
    });

    expect(result?.kind).toBe('answer');
    expect(result?.draft).toEqual(expect.objectContaining({ isSaved: false }));
    expect(result?.draft?.text).toContain('رمضان القرجي');
    expect(result?.draft?.text).toContain('المدينة المنورة');
    expect(result?.draft?.text).toContain('معلّم');
    expect(result?.draft?.text).toContain('1983');
    expect(result?.draft?.facts.map((fact) => fact.label)).toEqual([
      'الاسم المسجل',
      'سنة الميلاد',
      'مكان الميلاد',
      'المهنة',
      'الإقامة',
      'سنة الوفاة',
      'مكان الوفاة',
    ]);
    expect(JSON.stringify(result?.draft)).not.toContain(source.id);
    expect(JSON.stringify(result?.draft)).not.toContain(source.email);
    expect(JSON.stringify(result?.draft)).not.toContain(source.photoUrl);
    expect(JSON.stringify(result?.draft)).not.toContain(source.bio);
    expect(source).toEqual(snapshot);
  });

  it('answers in English when the interface is English even if the query is Arabic', () => {
    const source = person('p1', 'Mariam', {
      lastName: 'Alqarji',
      birthDate: '1977',
      occupation: 'Architect',
      currentResidence: 'Riyadh',
    });

    const result = resolveKindiBiographyDraft({
      query: 'اكتب سيرة لهذا الشخص',
      people: [source],
      contextPersonId: source.id,
      language: 'en',
    });

    expect(result?.text).toMatch(/^I prepared/);
    expect(result?.draft?.text).toBe('Mariam Alqarji was born in 1977. Mariam Alqarji worked as Architect. Mariam Alqarji lived in Riyadh.');
    expect(result?.draft?.facts[0]).toEqual({ label: 'Recorded name', value: 'Mariam Alqarji' });
  });

  it('uses an explicitly named person instead of the current context', () => {
    const context = person('context', 'سامي', { birthDate: '1980' });
    const named = person('named', 'ليلى', { birthDate: '1990', profession: 'طبيبة' });

    const result = resolveKindiBiographyDraft({
      query: 'اكتب سيرة ليلى القرجي',
      people: [context, named],
      contextPersonId: context.id,
      language: 'ar',
    });

    expect(result?.draft?.text).toContain('ليلى القرجي');
    expect(result?.draft?.text).not.toContain('سامي القرجي');
  });

  it('asks for a contextual choice when full names are duplicated', () => {
    const fatherA = person('father-a', 'أحمد');
    const fatherB = person('father-b', 'خالد');
    const first = person('first', 'محمد', { parents: [fatherA.id], birthDate: '1970' });
    const second = person('second', 'محمد', { parents: [fatherB.id], birthDate: '1980' });

    const result = resolveKindiBiographyDraft({
      query: 'أنشئ مسودة سيرة محمد القرجي',
      people: [fatherA, fatherB, first, second],
      language: 'ar',
    });

    expect(result?.kind).toBe('needs-context');
    expect(result?.people.map((candidate) => candidate.id)).toEqual(['first', 'second']);
    expect(result?.personContexts?.map((context) => context.summary)).toEqual([
      'ابن أحمد القرجي',
      'ابن خالد القرجي',
    ]);
    expect(result?.draft).toBeUndefined();
  });

  it('requires a selected or explicitly named person', () => {
    const result = resolveKindiBiographyDraft({
      query: 'draft a biography for this person',
      people: [],
      language: 'en',
    });

    expect(result).toMatchObject({
      kind: 'needs-context',
      people: [],
    });
    expect(result?.text).toContain('Select a person');
  });

  it('refuses to invent a biography when only a name is recorded', () => {
    const source = person('p1', 'نورة');

    const result = resolveKindiBiographyDraft({
      query: 'اكتب نبذة لهذا الشخص',
      people: [source],
      contextPersonId: source.id,
      language: 'ar',
    });

    expect(result?.kind).toBe('insufficient-data');
    expect(result?.draft).toBeUndefined();
    expect(result?.text).toContain('دون تخمين');
  });

  it('does not include death fields for a living person', () => {
    const source = person('p1', 'سارة', {
      birthDate: '1992',
      isDeceased: false,
      deathDate: 'private-inconsistent-value',
      deathPlace: 'private-inconsistent-place',
    });

    const result = resolveKindiBiographyDraft({
      query: 'اكتب سيرة لهذا الشخص',
      people: [source],
      contextPersonId: source.id,
      language: 'ar',
    });

    expect(result?.draft?.facts.some((fact) => fact.label.includes('الوفاة'))).toBe(false);
    expect(result?.draft?.text).not.toContain('private-inconsistent');
  });
});
