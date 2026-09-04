import { describe, expect, it } from 'vitest';

import { createPerson } from '../../../utils/familyLogic';
import { resolveKindiLocalRelationshipQuery } from '../logic/kindiLocalQueryEngine';

const person = (
  id: string,
  firstName: string,
  relations: Partial<Pick<ReturnType<typeof createPerson>, 'parents' | 'children' | 'spouses'>> = {}
) => ({
  ...createPerson(),
  id,
  firstName,
  lastName: 'العائلة',
  ...relations,
});

const people = [
  person('root', 'سامي', { parents: ['father', 'mother'], spouses: ['spouse'] }),
  person('father', 'محمود', { children: ['root', 'sibling', 'half-sibling'] }),
  person('mother', 'ليلى', { children: ['root', 'sibling'] }),
  person('sibling', 'نورة', { parents: ['father', 'mother'] }),
  person('half-sibling', 'خالد', { parents: ['father'] }),
  person('spouse', 'مريم', { spouses: ['root'] }),
  person('child', 'علي', { parents: ['root'] }),
];

describe('kindiLocalQueryEngine', () => {
  it('answers contextual sibling questions and includes half siblings once', () => {
    const result = resolveKindiLocalRelationshipQuery({
      query: 'من هم إخوة هذا الشخص؟',
      people,
      contextPersonId: 'root',
      language: 'ar',
    });

    expect(result?.kind).toBe('answer');
    expect(result?.people.map((item) => item.id).sort()).toEqual(['half-sibling', 'sibling']);
    expect(result?.text).toContain('سامي العائلة');
  });

  it('repairs one-way relationship data when resolving children and spouses', () => {
    const children = resolveKindiLocalRelationshipQuery({
      query: 'من هم أبناؤه؟', people, contextPersonId: 'root', language: 'ar',
    });
    const spouses = resolveKindiLocalRelationshipQuery({
      query: 'who are their spouses?', people, contextPersonId: 'root', language: 'en',
    });

    expect(children?.people.map((item) => item.id)).toEqual(['child']);
    expect(spouses?.people.map((item) => item.id)).toEqual(['spouse']);
  });

  it('asks for context instead of guessing a person', () => {
    const result = resolveKindiLocalRelationshipQuery({
      query: 'من هم الوالدان؟', people, language: 'ar',
    });

    expect(result?.kind).toBe('needs-context');
    expect(result?.people).toEqual([]);
    expect(result?.text).toContain('حدد شخصًا');
  });

  it('answers an unambiguous relationship question containing a full person name', () => {
    const result = resolveKindiLocalRelationshipQuery({
      query: 'من هم أبناء سامي العائلة؟', people, contextPersonId: 'root', language: 'ar',
    });

    expect(result?.kind).toBe('answer');
    expect(result?.contextPerson?.id).toBe('root');
    expect(result?.people.map((item) => item.id)).toEqual(['child']);
  });

  it('does not guess when a full name identifies multiple people', () => {
    const duplicate = person('duplicate-root', 'سامي');
    const result = resolveKindiLocalRelationshipQuery({
      query: 'من هم أبناء سامي العائلة؟',
      people: [...people, duplicate],
      contextPersonId: 'root',
      language: 'ar',
    });

    expect(result?.kind).toBe('needs-context');
    expect(result?.people.map((item) => item.id).sort()).toEqual(['duplicate-root', 'root']);
    expect(result?.text).toContain('أكثر من شخص');
  });

  it('answers an Arabic two-person kinship question with the shortest recorded path', () => {
    const result = resolveKindiLocalRelationshipQuery({
      query: 'ما صلة القرابة بين سامي العائلة وعلي العائلة؟',
      people,
      contextPersonId: 'father',
      language: 'ar',
    });

    expect(result).toMatchObject({
      kind: 'answer',
      relationship: 'path',
      contextPerson: { id: 'root' },
      targetPerson: { id: 'child' },
    });
    expect(result?.people.map((item) => item.id)).toEqual(['root', 'child']);
    expect(result?.text).toContain('ابن/ابنة');
    expect(result?.text).toContain('أقصر مسار مسجل');
  });

  it('uses the selected person with one explicit English target', () => {
    const result = resolveKindiLocalRelationshipQuery({
      query: 'How is علي العائلة related to this person?',
      people,
      contextPersonId: 'root',
      language: 'en',
    });

    expect(result?.relationship).toBe('path');
    expect(result?.people.map((item) => item.id)).toEqual(['root', 'child']);
    expect(result?.text).toContain('is Child');
    expect(result?.text).toContain('Shortest recorded path');
  });

  it('requires disambiguation when either path endpoint matches duplicate names', () => {
    const duplicate = person('duplicate-child', 'علي');
    const result = resolveKindiLocalRelationshipQuery({
      query: 'ما صلة القرابة بين سامي العائلة و علي العائلة؟',
      people: [...people, duplicate],
      contextPersonId: 'root',
      language: 'ar',
    });

    expect(result?.kind).toBe('needs-context');
    expect(result?.relationship).toBe('path');
    expect(result?.people.map((item) => item.id).sort()).toEqual(['child', 'duplicate-child']);
    expect(result?.text).toContain('أكثر من سجل');
  });

  it('reports disconnected people without sending the question to cloud fallback', () => {
    const distant = person('distant', 'بعيد');
    const result = resolveKindiLocalRelationshipQuery({
      query: 'what is the relationship between سامي العائلة and بعيد العائلة?',
      people: [...people, distant],
      language: 'en',
    });

    expect(result?.kind).toBe('answer');
    expect(result?.relationship).toBe('path');
    expect(result?.people.map((item) => item.id)).toEqual(['root', 'distant']);
    expect(result?.text).toContain('No recorded family path');
  });
});
