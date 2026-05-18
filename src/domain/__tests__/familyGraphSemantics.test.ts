
import { describe, expect, it } from 'vitest';
import type { Person } from '../../types';
import { buildFamilyGraph } from '../familyGraph';
import { buildLayoutSemanticsSnapshot } from '../familyGraphSemantics';

const makePerson = (id: string, overrides: Partial<Person> = {}): Person => ({
  id,
  title: '',
  firstName: id,
  middleName: '',
  lastName: 'Person',
  birthName: '',
  nickName: '',
  suffix: '',
  gender: 'male',
  birthDate: '',
  birthPlace: '',
  birthSource: '',
  marriageDate: '',
  marriagePlace: '',
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

const simpleOneSpouseOneChild: Record<string, Person> = {
  alex: makePerson('alex', { spouses: ['sam'], children: ['casey'] }),
  sam: makePerson('sam', { gender: 'female', spouses: ['alex'], children: ['casey'] }),
  casey: makePerson('casey', { parents: ['alex', 'sam'] }),
};

const referenceCousinMarriageSharedDescendant: Record<string, Person> = {
  grandparent: makePerson('grandparent', { spouses: ['grandma'], children: ['aunt', 'parent'] }),
  grandma: makePerson('grandma', { gender: 'female', spouses: ['grandparent'], children: ['aunt', 'parent'] }),
  aunt: makePerson('aunt', { parents: ['grandparent', 'grandma'], children: ['cousin'] }),
  parent: makePerson('parent', { parents: ['grandparent', 'grandma'], children: ['child'] }),
  cousin: makePerson('cousin', { parents: ['aunt'], spouses: ['child'], children: ['shared'] }),
  child: makePerson('child', { parents: ['parent'], spouses: ['cousin'], children: ['shared'] }),
  shared: makePerson('shared', { parents: ['cousin', 'child'] }),
};

describe('buildLayoutSemanticsSnapshot', () => {
  it('marks only the root-owned spouse family canonical for a simple spouse fixture', () => {
    const graph = buildFamilyGraph(simpleOneSpouseOneChild);
    const snapshot = buildLayoutSemanticsSnapshot(graph, 'alex', simpleOneSpouseOneChild);

    expect(snapshot.familyDecisions['family:alex__sam'].renderMode).toBe('canonical');
    expect(snapshot.familyDecisions['family:alex__sam'].branchOwnerPersonId).toBe('alex');
    expect(snapshot.familyDecisions['family:alex__sam'].ownerReason).toBe('root-is-parent');
    expect(snapshot.familyDecisions['family:alex__sam'].parentDisplayOrder).toEqual(['alex', 'sam']);
    expect(snapshot.personRoles.alex.role).toBe('canonical');
    expect(snapshot.personRoles.sam.role).toBe('canonical');
    expect(snapshot.personRoles.casey.role).toBe('canonical');
  });

  it('keeps ancestor family reference-only when rooted inside a descendant branch', () => {
    const graph = buildFamilyGraph(referenceCousinMarriageSharedDescendant);
    const snapshot = buildLayoutSemanticsSnapshot(graph, 'aunt', referenceCousinMarriageSharedDescendant);

    expect(snapshot.familyDecisions['family:aunt'].renderMode).toBe('canonical');
    expect(snapshot.familyDecisions['family:aunt'].branchOwnerPersonId).toBe('aunt');
    expect(snapshot.familyDecisions['family:child__cousin'].renderMode).toBe('canonical');
    expect(snapshot.familyDecisions['family:child__cousin'].branchOwnerPersonId).toBe('cousin');
    expect(snapshot.familyDecisions['family:grandma__grandparent'].renderMode).toBe('reference-only');
  });

  it('keeps the cousin marriage family canonical when rooted at child', () => {
    const graph = buildFamilyGraph(referenceCousinMarriageSharedDescendant);
    const snapshot = buildLayoutSemanticsSnapshot(graph, 'child', referenceCousinMarriageSharedDescendant);

    expect(snapshot.familyDecisions['family:child__cousin'].renderMode).toBe('canonical');
    expect(snapshot.familyDecisions['family:child__cousin'].branchOwnerPersonId).toBe('child');
    expect(snapshot.familyDecisions['family:child__cousin'].ownerReason).toBe('root-is-parent');
    expect(snapshot.familyDecisions['family:child__cousin'].parentDisplayOrder).toEqual(['child', 'cousin']);
    expect(snapshot.personRoles.child.role).toBe('canonical');
    expect(snapshot.personRoles.cousin.role).toBe('canonical');
    expect(snapshot.personRoles.shared.role).toBe('canonical');
  });
});

