import { describe, expect, it } from 'vitest';

import type { Person } from '../../../types/person';
import { resolveKindiRecordReview } from '../logic/kindiRecordReviewEngine';

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

describe('resolveKindiRecordReview', () => {
  it('ignores unrelated questions', () => {
    expect(resolveKindiRecordReview({
      query: 'من هم أبناؤه؟',
      people: [],
      language: 'ar',
    })).toBeNull();
  });

  it('organizes facts, notes, and safe source labels without mutating the person', () => {
    const ramadan = person('raw-person-id', 'رمضان', {
      birthDate: '1895-03-02',
      birthPlace: 'المدينة المنورة',
      birthSource: 'private-storage-path',
      profession: 'معلّم',
      residence: 'مكة المكرمة',
      bio: 'خدم في مدرسة الحي.\nانتقل إلى مكة في شبابه.',
      sources: [{
        id: 'source-raw-id',
        title: 'سجل العائلة',
        url: 'https://private.supabase.co/source-raw-id',
        date: '1950',
        type: 'دفتر عائلي',
      }],
      email: 'private@example.test',
      photoUrl: 'https://private.supabase.co/photo.jpg',
    });
    const snapshot = structuredClone(ramadan);

    const result = resolveKindiRecordReview({
      query: 'نظّم ملاحظات ومصادر هذا الشخص',
      people: [ramadan],
      contextPersonId: ramadan.id,
      language: 'ar',
    });

    expect(result?.kind).toBe('answer');
    expect(result?.targetPersonId).toBe(ramadan.id);
    expect(result?.review?.sections.map((section) => section.id)).toEqual(['facts', 'notes', 'sources']);
    expect(result?.review?.sourceSummary).toEqual({
      recordedCount: 2,
      displayedCount: 2,
      hasBirthSource: true,
      hasDeathSource: false,
    });
    const serialized = JSON.stringify(result?.review);
    expect(serialized).toContain('رمضان القرجي');
    expect(serialized).toContain('خدم في مدرسة الحي');
    expect(serialized).toContain('سجل العائلة');
    expect(serialized).not.toContain('raw-person-id');
    expect(serialized).not.toContain('source-raw-id');
    expect(serialized).not.toContain('supabase.co');
    expect(serialized).not.toContain('private@example.test');
    expect(ramadan).toEqual(snapshot);
  });

  it('hides unsafe note and source text while preserving a truthful source count', () => {
    const target = person('p1', 'آمنة', {
      bio: 'ملاحظة آمنة\nbearer private-access-token',
      sources: [{
        id: 's1',
        title: 'private@example.test',
        url: 'blob:private-source',
      }],
    });

    const result = resolveKindiRecordReview({
      query: 'راجع ملاحظات ومصادر هذا الشخص',
      people: [target],
      contextPersonId: target.id,
      language: 'ar',
    });
    const serialized = JSON.stringify(result?.review);

    expect(serialized).toContain('ملاحظة آمنة');
    expect(serialized).toContain('مصدر مسجل بلا عنوان');
    expect(serialized).toContain('أُخفي محتوى');
    expect(result?.review?.sourceSummary.recordedCount).toBe(1);
    expect(serialized).not.toContain('private@example.test');
    expect(serialized).not.toContain('private-access-token');
    expect(serialized).not.toContain('blob:');
  });

  it('uses the interface language rather than the query language', () => {
    const target = person('p1', 'Ramadan', { birthDate: '1895', bio: 'Recorded family note.' });
    const result = resolveKindiRecordReview({
      query: 'راجع ملاحظات ومصادر هذا الشخص',
      people: [target],
      contextPersonId: target.id,
      language: 'en',
    });

    expect(result?.text).toContain('organized');
    expect(result?.review?.sections[0]?.title).toBe('Recorded facts');
    expect(result?.review?.isSaved).toBe(false);
  });

  it('lets an explicit full name override the current context', () => {
    const first = person('p1', 'رمضان');
    const second = person('p2', 'سامي');
    second.bio = 'ملاحظة سامي الموثقة';

    const result = resolveKindiRecordReview({
      query: 'نظم سجل سامي القرجي',
      people: [first, second],
      contextPersonId: first.id,
      language: 'ar',
    });

    expect(JSON.stringify(result?.review)).toContain('سامي القرجي');
    expect(JSON.stringify(result?.review)).not.toContain('رمضان القرجي');
  });

  it('requests a contextual choice when a full name matches duplicate records', () => {
    const first = person('p1', 'محمد', { parents: ['father-1'] });
    const second = person('p2', 'محمد', { parents: ['father-2'] });
    const result = resolveKindiRecordReview({
      query: 'راجع ملاحظات ومصادر محمد القرجي',
      people: [first, second, person('father-1', 'سعيد'), person('father-2', 'خالد')],
      language: 'ar',
    });

    expect(result?.kind).toBe('needs-context');
    expect(result?.people).toHaveLength(2);
    expect(result?.personContexts).toHaveLength(2);
    expect(result?.review).toBeUndefined();
  });

  it('requests a person when neither a mention nor context exists', () => {
    const result = resolveKindiRecordReview({
      query: 'organize notes and sources',
      people: [person('p1', 'Ramadan')],
      language: 'en',
    });

    expect(result).toMatchObject({ kind: 'needs-context', people: [] });
    expect(result?.text).toContain('Select a person');
  });

  it('reports missing notes and source links without inventing content', () => {
    const target = person('p1', 'رمضان', {
      birthDate: '1895',
      isDeceased: true,
      deathDate: '1983',
    });
    const result = resolveKindiRecordReview({
      query: 'نظم ملاحظات ومصادر هذا الشخص',
      people: [target],
      contextPersonId: target.id,
      language: 'ar',
    });

    expect(result?.review?.reviewNotes).toEqual(expect.arrayContaining([
      expect.stringContaining('ملاحظة سردية'),
      expect.stringContaining('لا توجد مصادر'),
      expect.stringContaining('بيانات الميلاد'),
      expect.stringContaining('بيانات الوفاة'),
    ]));
    expect(result?.review?.sections.some((section) => section.id === 'notes')).toBe(false);
    expect(result?.review?.sections.some((section) => section.id === 'sources')).toBe(false);
  });

  it('deduplicates source labels and keeps the concise review bounded', () => {
    const sources = Array.from({ length: 12 }, (_, index) => ({
      id: `source-${index}`,
      title: index < 2 ? 'سجل مكرر' : `سجل ${index}`,
      date: '1950',
      type: 'وثيقة',
    }));
    const target = person('p1', 'رمضان', { sources });
    const result = resolveKindiRecordReview({
      query: 'راجع مصادر هذا الشخص',
      people: [target],
      contextPersonId: target.id,
      language: 'ar',
    });
    const sourceSection = result?.review?.sections.find((section) => section.id === 'sources');

    expect(sourceSection?.items).toHaveLength(8);
    expect(sourceSection?.items.filter((item) => item.label === 'سجل مكرر')).toHaveLength(1);
    expect(result?.review?.reviewNotes.join(' ')).toContain('عناصر إضافية');
  });
});
