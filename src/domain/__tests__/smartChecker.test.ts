import { describe, expect, it } from 'vitest';
import { DEFAULT_PERSON_TEMPLATE } from '../../constants';
import type { Person } from '../../types';
import {
  checkPersonSuggestions,
  checkRelationshipAction,
  checkRelationshipContext,
  checkVitalDateConsistency,
  describeSmartCheckIssue,
} from '../smartChecker';

const buildPerson = (overrides: Partial<Person>): Person => ({
  id: overrides.id || crypto.randomUUID(),
  ...DEFAULT_PERSON_TEMPLATE,
  ...overrides,
});

describe('smartChecker', () => {
  it('flags death dates earlier than birth dates', () => {
    const person = buildPerson({
      id: 'p1',
      birthDate: '1990-01-01',
      deathDate: '1980-01-01',
    });

    expect(checkVitalDateConsistency(person)).toEqual([
      { code: 'death_before_birth', severity: 'error', personId: 'p1' },
    ]);
  });

  it('blocks self-parent links', () => {
    expect(
      checkRelationshipAction({
        currentPersonId: 'same',
        existingId: 'same',
        relationType: 'parent',
      })
    ).toEqual([{ code: 'self_parent', severity: 'error', personId: 'same' }]);
  });

  it('warns when the mother appears younger than 13 at childbirth', () => {
    const mother = buildPerson({ id: 'mother', gender: 'female', birthDate: '2000-01-01' });
    const child = buildPerson({ id: 'child', birthDate: '2012-06-01', parents: ['mother'] });

    expect(checkRelationshipContext(child, { mother, child })).toContainEqual({
      code: 'mother_under_13',
      severity: 'warning',
      personId: 'child',
    });
  });

  it('warns when childbirth is under five months after marriage', () => {
    const mother = buildPerson({
      id: 'mother',
      gender: 'female',
      birthDate: '1989-01-01',
      spouses: ['father'],
      partnerDetails: {
        father: {
          type: 'married',
          startDate: '2020-01-01',
        },
      },
    });
    const father = buildPerson({
      id: 'father',
      gender: 'male',
      birthDate: '1986-01-01',
      spouses: ['mother'],
      partnerDetails: {
        mother: {
          type: 'married',
          startDate: '2020-01-01',
        },
      },
    });
    const child = buildPerson({
      id: 'child',
      birthDate: '2020-04-15',
      parents: ['mother', 'father'],
    });

    expect(checkRelationshipContext(child, { mother, father, child })).toContainEqual({
      code: 'marriage_child_gap_under_5_months',
      severity: 'warning',
      personId: 'child',
    });
  });

  it('suggests missing birth dates and photos', () => {
    const person = buildPerson({ id: 'p2', birthDate: '', photoUrl: '' });

    expect(checkPersonSuggestions(person)).toEqual([
      { code: 'missing_birth_date', severity: 'info', personId: 'p2' },
      { code: 'missing_photo', severity: 'info', personId: 'p2' },
    ]);
  });

  it('describes issues in Arabic', () => {
    expect(
      describeSmartCheckIssue(
        { code: 'death_before_birth', severity: 'error', personId: 'p1' },
        'ar',
        'ليلى'
      )
    ).toContain('تاريخ');
  });
});
