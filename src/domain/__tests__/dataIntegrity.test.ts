import { describe, expect, it } from 'vitest';
import { evaluateDataIntegrity } from '../dataIntegrity';
import { DEFAULT_PERSON_TEMPLATE } from '../../constants';
import type { Person } from '../../types';

function person(id: string, patch: Partial<Person> = {}): Person {
  return {
    ...DEFAULT_PERSON_TEMPLATE,
    id,
    firstName: id,
    lastName: 'Family',
    gender: 'male',
    parents: [],
    children: [],
    spouses: [],
    ...patch,
  };
}

describe('evaluateDataIntegrity', () => {
  it('returns a clean report for a consistent small tree', () => {
    const people = {
      father: person('father', { children: ['child'], birthDate: '1970-01-01' }),
      mother: person('mother', { gender: 'female', children: ['child'], birthDate: '1972-01-01' }),
      child: person('child', { parents: ['father', 'mother'], birthDate: '2000-01-01' }),
    };

    const report = evaluateDataIntegrity(people);

    expect(report.issues.filter((issue) => issue.category === 'RELATIONSHIP')).toEqual([]);
    expect(report.issues.filter((issue) => issue.category === 'TIMELINE')).toEqual([]);
    expect(report.healthScore).toBe(100);
    expect(report.counts.ERROR).toBe(0);
    expect(report.counts.WARNING).toBe(0);
  });

  it('detects broken references, self links, asymmetry, and parent-child cycles', () => {
    const people = {
      a: person('a', { parents: ['b'], children: ['missing-child'], spouses: ['a'] }),
      b: person('b', { parents: ['a'] }),
      c: person('c', { parents: ['missing-parent'] }),
      d: person('d', { spouses: ['e'] }),
      e: person('e'),
    };

    const report = evaluateDataIntegrity(people);
    const codes = report.issues.map((issue) => issue.code);

    expect(codes).toContain('parent_child_cycle');
    expect(codes).toContain('broken_child_reference');
    expect(codes).toContain('broken_parent_reference');
    expect(codes).toContain('self_spouse');
    expect(codes).toContain('asymmetric_spouse');
    expect(report.counts.ERROR).toBeGreaterThan(0);
    expect(report.healthScore).toBeLessThan(100);

    const brokenParent = report.issues.find((issue) => issue.code === 'broken_parent_reference');
    expect(brokenParent).toMatchObject({
      id: 'broken_parent_reference:c:missing-parent:',
      severity: 'ERROR',
      category: 'RELATIONSHIP',
      personIds: ['c', 'missing-parent'],
    });
  });

  it('detects impossible dates and young mother warnings', () => {
    const people = {
      mother: person('mother', { gender: 'female', children: ['child'], birthDate: '2010-01-01' }),
      child: person('child', { parents: ['mother'], birthDate: '2020-01-01' }),
      reversed: person('reversed', {
        birthDate: '2000-01-01',
        deathDate: '1999-01-01',
        isDeceased: true,
      }),
      impossibleChild: person('impossibleChild', {
        parents: ['futureParent'],
        birthDate: '1980-01-01',
      }),
      futureParent: person('futureParent', {
        children: ['impossibleChild'],
        birthDate: '1990-01-01',
      }),
    };

    const report = evaluateDataIntegrity(people);
    const codes = report.issues.map((issue) => issue.code);

    expect(codes).toContain('death_before_birth');
    expect(codes).toContain('mother_under_13');
    expect(codes).toContain('child_before_parent_birth');
    expect(report.issues.find((issue) => issue.code === 'death_before_birth')?.category).toBe('TIMELINE');
  });

  it('detects duplicate relationship ids and possible duplicate people', () => {
    const people = {
      p1: person('p1', {
        firstName: 'Ali',
        lastName: 'Qarji',
        birthDate: '1950',
        parents: ['parent', 'parent'],
      }),
      p2: person('p2', {
        firstName: 'Ali',
        lastName: 'Qarji',
        birthDate: '1950',
      }),
      parent: person('parent', { children: ['p1'] }),
    };

    const report = evaluateDataIntegrity(people);
    const codes = report.issues.map((issue) => issue.code);

    expect(codes).toContain('duplicate_parent');
    expect(codes).toContain('possible_duplicate_person');
    expect(report.issues.find((issue) => issue.code === 'possible_duplicate_person')?.category).toBe('DUPLICATE');
  });

  it('reports completeness and citation quality metrics separately from structural health', () => {
    const people = {
      rich: person('rich', {
        birthDate: '1950',
        birthPlace: 'Kafranbel, Syria',
        birthSource: 'Civil registry',
        residence: 'Kafranbel, Syria',
        occupation: 'Teacher',
        parents: ['father'],
        sources: [{ id: 's1', title: 'Family book' }],
      }),
      father: person('father', {
        firstName: 'Rich',
        lastName: 'Ancestor',
        birthDate: '1920',
        children: ['rich'],
      }),
      sparse: person('sparse'),
      deceased: person('deceased', {
        isDeceased: true,
        birthDate: '1910',
        deathPlace: 'Aleppo, Syria',
      }),
    };

    const report = evaluateDataIntegrity(people);
    const codes = report.issues.map((issue) => issue.code);

    expect(codes).toContain('missing_birth_date');
    expect(codes).toContain('missing_death_date');
    expect(codes).toContain('missing_residence');
    expect(codes).toContain('missing_occupation');
    expect(codes).toContain('missing_parents');
    expect(codes).toContain('missing_birth_citation');
    expect(codes).toContain('missing_death_citation');
    expect(codes).toContain('missing_profile_source');
    expect(report.issues.find((issue) => issue.code === 'missing_birth_date')?.category).toBe('COMPLETENESS');
    expect(report.issues.find((issue) => issue.code === 'missing_birth_citation')?.category).toBe('CITATION');
    expect(report.healthScore).toBe(100);
    expect(report.completenessScore).toBeLessThan(100);
    expect(report.citationCoverage).toBeLessThan(100);
    expect(report.countsByCategory.COMPLETENESS).toBeGreaterThan(0);
    expect(report.countsByCategory.CITATION).toBeGreaterThan(0);
  });
});
