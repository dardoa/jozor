import { describe, expect, it } from 'vitest';

import type { Person } from '../../../types';
import { resolveKindiLocalStructuredAnswer } from '../logic/kindiLocalAnswerOrchestrator';

const person = (id: string, firstName: string): Person => ({
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
});

const resolve = (
  query: string,
  people: readonly Person[],
  contextPersonId = people[0]?.id,
  language: 'ar' | 'en' = 'ar'
) => resolveKindiLocalStructuredAnswer({
  query,
  people,
  contextPersonId,
  language,
  interactionId: 'interaction-safe-1',
});

describe('resolveKindiLocalStructuredAnswer', () => {
  it('returns null when no structured local engine recognizes the query', () => {
    expect(resolve('ابحث عن اسم غير موجود', [])).toBeNull();
  });

  it('preserves biography priority when a query also contains record-review terms', () => {
    const root = person('private-root-id', 'رمضان');
    root.birthDate = '1895';
    root.birthPlace = 'المدينة المنورة';

    const result = resolve('أنشئ مسودة سيرة ونظّم ملاحظات ومصادر هذا الشخص', [root]);

    expect(result?.kind).toBe('biography');
    expect(result?.message.answerMeta).toEqual({
      source: 'local-tree',
      kind: 'biography',
      interactionId: 'interaction-safe-1',
      feedbackEnabled: true,
    });
    expect(result?.message.biographyDraft?.text).toContain('رمضان Alqarji');
    expect(result?.message.recordReview).toBeUndefined();
  });

  it('maps a record review without copying private fields into its structured artifact', () => {
    const root = person('private-record-id', 'رمضان');
    root.birthDate = '1895';
    root.email = 'private-record@example.test';
    root.bio = 'ملاحظة عائلية موثقة';
    root.sources = [{
      id: 'private-source-id',
      title: 'سجل الأسرة',
      url: 'https://private.supabase.co/private-source-id',
      date: '1950',
      type: 'دفتر',
    }];

    const result = resolve('نظّم ملاحظات ومصادر هذا الشخص', [root]);

    expect(result?.kind).toBe('record-review');
    expect(result?.message.recordReviewTargetPersonId).toBe(root.id);
    expect(result?.message.answerMeta?.kind).toBe('record-review');
    const serializedReview = JSON.stringify(result?.message.recordReview);
    expect(serializedReview).toContain('سجل الأسرة');
    expect(serializedReview).not.toContain(root.id);
    expect(serializedReview).not.toContain(root.email);
    expect(serializedReview).not.toContain('private-source-id');
    expect(serializedReview).not.toContain('supabase.co');
  });

  it('maps tree diagnostics to the compact message summary contract', () => {
    const root = person('private-root-id', 'سامي');

    const result = resolve('ما مشاكل الشجرة؟', [root]);

    expect(result?.kind).toBe('diagnostic');
    expect(result?.message.answerMeta?.kind).toBe('diagnostic');
    expect(result?.message.diagnosticSummary).toMatchObject({
      scope: 'tree',
      citationCoverage: null,
    });
    const diagnosticSummary = result?.message.diagnosticSummary;
    expect(
      (diagnosticSummary?.errorCount ?? 0)
      + (diagnosticSummary?.warningCount ?? 0)
      + (diagnosticSummary?.reviewNoteCount ?? 0)
    ).toBeGreaterThan(0);
    expect(result?.message.text).not.toContain(root.id);
  });

  it('maps a contextual relationship answer and keeps result density capped', () => {
    const root = person('root-id', 'ليان');
    const parents = Array.from({ length: 8 }, (_, index) => person(`parent-${index}`, `والد${index}`));
    root.parents = parents.map((parent) => parent.id);

    const result = resolve('من والدا هذا الشخص؟', [root, ...parents]);

    expect(result?.kind).toBe('relationship');
    expect(result?.message.answerMeta?.kind).toBe('relationship');
    expect(result?.message.people).toHaveLength(8);
    expect(result?.message.visiblePeopleCount).toBe(6);
  });
});
