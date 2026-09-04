import { describe, expect, it } from 'vitest';

import { createPerson } from '../../../utils/familyLogic';
import { resolveKindiTreeDiagnosticsQuery } from '../logic/kindiTreeDiagnosticsEngine';

const person = (
  id: string,
  firstName: string,
  overrides: Partial<ReturnType<typeof createPerson>> = {}
) => ({
  ...createPerson(),
  id,
  firstName,
  lastName: 'العائلة',
  ...overrides,
});

const people = [
  person('raw-root-id', 'سامي', {
    birthDate: '1980',
    children: ['raw-child-id'],
  }),
  person('raw-child-id', 'ليلى', {
    birthDate: '1970',
    parents: ['raw-root-id'],
    email: 'private-sentinel@example.test',
  }),
];

describe('kindiTreeDiagnosticsEngine', () => {
  it('summarizes tree health locally in Arabic without exposing internal issue text or IDs', () => {
    const before = JSON.stringify(people);
    const result = resolveKindiTreeDiagnosticsQuery({
      query: 'ما مشاكل الشجرة وما جودة البيانات؟',
      people,
      language: 'ar',
    });

    expect(result?.kind).toBe('answer');
    expect(result?.scope).toBe('tree');
    expect(result?.text).toContain('اكتمل فحص بيانات الشجرة');
    expect(result?.metrics?.counts.ERROR).toBeGreaterThan(0);
    expect(Object.values(result?.metrics?.countsByCategory ?? {}).every(Number.isFinite)).toBe(true);
    expect(result?.people.length).toBeLessThanOrEqual(8);
    expect(result?.personContexts).toHaveLength(result?.people.length ?? 0);
    expect(result?.personContexts?.every((context) => /ملاحظ/.test(context.summary))).toBe(true);
    expect(result?.text).not.toContain('raw-root-id');
    expect(result?.text).not.toContain('raw-child-id');
    expect(result?.text).not.toContain('private-sentinel@example.test');
    expect(JSON.stringify(people)).toBe(before);
  });

  it('returns a localized person-level diagnosis for an explicit English name', () => {
    const result = resolveKindiTreeDiagnosticsQuery({
      query: 'What missing data is recorded for ليلى العائلة?',
      people,
      language: 'en',
    });

    expect(result?.kind).toBe('answer');
    expect(result?.scope).toBe('person');
    expect(result?.contextPerson?.id).toBe('raw-child-id');
    expect(result?.people.map((item) => item.id)).toEqual(['raw-child-id']);
    expect(result?.personContexts?.[0]).toMatchObject({ personId: 'raw-child-id' });
    expect(result?.personContexts?.[0]?.summary).toMatch(/notes/);
    expect(result?.suggestions).toContainEqual(expect.objectContaining({
      key: 'timeline',
      text: 'Review birth and death dates that conflict with relatives.',
      targetPersonId: 'raw-child-id',
      targetTab: 'about',
      targetSection: 'overview',
      targetField: 'vitalDates',
    }));
    expect(result?.suggestions?.every((suggestion) => !suggestion.text.includes('raw-child-id'))).toBe(true);
    expect(result?.text).toContain("I checked ليلى العائلة's record");
    expect(result?.text).toContain('improvement notes');
    expect(result?.text).not.toContain('raw-child-id');
  });

  it('uses the selected person only when the query explicitly asks for person scope', () => {
    const personResult = resolveKindiTreeDiagnosticsQuery({
      query: 'افحص هذا الشخص',
      people,
      contextPersonId: 'raw-root-id',
      language: 'ar',
    });
    const treeResult = resolveKindiTreeDiagnosticsQuery({
      query: 'افحص الشجرة',
      people,
      contextPersonId: 'raw-root-id',
      language: 'ar',
    });

    expect(personResult?.scope).toBe('person');
    expect(personResult?.contextPerson?.id).toBe('raw-root-id');
    expect(treeResult?.scope).toBe('tree');
    expect(treeResult?.contextPerson).toBeUndefined();
  });

  it('asks for a selection when an explicit name matches duplicate records', () => {
    const duplicate = person('another-private-id', 'ليلى');
    const result = resolveKindiTreeDiagnosticsQuery({
      query: 'افحص بيانات ليلى العائلة الناقصة',
      people: [...people, duplicate],
      language: 'ar',
    });

    expect(result?.kind).toBe('needs-context');
    expect(result?.scope).toBe('person');
    expect(result?.people).toHaveLength(2);
    expect(result?.text).not.toContain('raw-child-id');
    expect(result?.text).not.toContain('another-private-id');
  });

  it('requires a selected person for an unresolved contextual diagnosis', () => {
    const result = resolveKindiTreeDiagnosticsQuery({
      query: 'what is missing for this person?',
      people,
      language: 'en',
    });

    expect(result).toMatchObject({ kind: 'needs-context', scope: 'person', people: [] });
    expect(result?.text).toContain('Select a person');
  });

  it('bounds the affected-person result set for large trees', () => {
    const largePeople = Array.from({ length: 20 }, (_, index) =>
      person(`private-${index}`, `شخص ${index + 1}`)
    );
    const result = resolveKindiTreeDiagnosticsQuery({
      query: 'جودة البيانات',
      people: largePeople,
      language: 'ar',
    });

    expect(result?.kind).toBe('answer');
    expect(result?.people).toHaveLength(8);
  });

  it('handles an empty tree and ignores unrelated questions', () => {
    expect(resolveKindiTreeDiagnosticsQuery({
      query: 'check the tree',
      people: [],
      language: 'en',
    })).toMatchObject({ kind: 'answer', scope: 'tree', people: [] });

    expect(resolveKindiTreeDiagnosticsQuery({
      query: 'من هم الأبناء؟',
      people,
      language: 'ar',
    })).toBeNull();
  });

  it('marks source coverage as not applicable when the tree has no citable claims', () => {
    const result = resolveKindiTreeDiagnosticsQuery({
      query: 'افحص الشجرة',
      people: [person('empty-record-id', 'سجل')],
      language: 'ar',
    });

    expect(result?.metrics?.citationCoverage).toBeNull();
  });

  it('deduplicates and bounds person enrichment suggestions without inventing values', () => {
    const result = resolveKindiTreeDiagnosticsQuery({
      query: 'افحص هذا الشخص',
      people: [person('record-id', 'سجل')],
      contextPersonId: 'record-id',
      language: 'ar',
    });

    expect(result?.suggestions).toHaveLength(4);
    expect(new Set(result?.suggestions?.map((suggestion) => suggestion.key)).size)
      .toBe(result?.suggestions?.length);
    expect(result?.suggestions?.every((suggestion) => suggestion.targetPersonId === 'record-id')).toBe(true);
    expect(result?.suggestions?.map((suggestion) => suggestion.text).join(' ')).not.toContain('record-id');
    expect(result?.suggestions?.map((suggestion) => suggestion.text).join(' ')).not.toMatch(/\d{4}/);
    expect(result?.suggestions).toContainEqual(expect.objectContaining({
      key: 'parents',
      targetTab: 'links',
      targetSection: 'relationships',
      targetField: 'parents',
    }));
  });
});
