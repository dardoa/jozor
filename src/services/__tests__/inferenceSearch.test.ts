import { describe, it, expect, beforeEach, vi } from 'vitest';
import { searchService } from '../searchService';
import type { Person } from '../../types';

const makePerson = (person: Partial<Person> & Pick<Person, 'id' | 'firstName' | 'lastName' | 'gender'>): Person => ({
  id: person.id,
  title: '',
  firstName: person.firstName,
  middleName: person.middleName ?? '',
  lastName: person.lastName,
  birthName: '',
  nickName: person.nickName ?? '',
  suffix: '',
  gender: person.gender,
  birthDate: person.birthDate ?? '',
  birthPlace: person.birthPlace ?? '',
  birthSource: '',
  deathDate: person.deathDate ?? '',
  deathPlace: person.deathPlace ?? '',
  deathSource: '',
  burialPlace: '',
  residence: '',
  isDeceased: person.isDeceased ?? false,
  profession: person.profession ?? '',
  company: '',
  interests: '',
  bio: person.bio ?? '',
  gallery: [],
  voiceNotes: [],
  sources: [],
  events: [],
  email: '',
  website: '',
  blog: '',
  address: '',
  parents: person.parents ?? [],
  spouses: person.spouses ?? [],
  children: person.children ?? [],
});

const mockPeople: Person[] = [
  makePerson({ id: 'p1', firstName: 'أحمد', lastName: 'العلي', gender: 'male', parents: [], children: ['p2', 'p3'], spouses: ['s1'] }),
  makePerson({ id: 'p2', firstName: 'خالد', lastName: 'أحمد', gender: 'male', parents: ['p1', 's1'], children: ['p4'], spouses: [] }),
  makePerson({ id: 'p3', firstName: 'سارة', lastName: 'أحمد', gender: 'female', parents: ['p1', 's1'], children: [], spouses: [] }),
  makePerson({ id: 'p4', firstName: 'فهد', lastName: 'خالد', gender: 'male', parents: ['p2'], children: [], spouses: [] }),
  makePerson({ id: 's1', firstName: 'نورة', lastName: 'العلي', gender: 'female', parents: [], children: ['p2', 'p3'], spouses: ['p1'] }),
  makePerson({ id: 'm1', firstName: 'محمد', lastName: 'المنصور', gender: 'male', parents: [], children: [], spouses: [], birthPlace: 'مكة', isDeceased: true }),
];

describe('Inference Search Service', () => {
  beforeEach(async () => {
    await searchService.updateSearchIndex(mockPeople);
  });

  it('finds children of a target person', async () => {
    const results = await searchService.search('أبناء أحمد');
    const names = results.map(result => result.person.firstName);

    expect(names).toContain('خالد');
    expect(names).toContain('سارة');
    expect(names).not.toContain('أحمد');
    expect(results.length).toBe(2);
  });

  it('finds grandchildren of a target person', async () => {
    const results = await searchService.search('أحفاد أحمد');
    const names = results.map(result => result.person.firstName);

    expect(names).toContain('فهد');
    expect(results.length).toBe(1);
  });

  it('filters by location', async () => {
    const results = await searchService.search('في مكة');
    expect(results.length).toBe(1);
    expect(results[0].person.firstName).toBe('محمد');
  });

  it('combines location and status', async () => {
    const results = await searchService.search('متوفين في مكة');
    expect(results.length).toBe(1);
    expect(results[0].person.firstName).toBe('محمد');
  });

  it('handles missing targets gracefully', async () => {
    const results = await searchService.search('أبناء زيكو');
    expect(results.length).toBe(0);
  });

  it('handles multiple relational intents targeting the same name', async () => {
    const queryParser = await import('../search/queryParser');
    const spy = vi.spyOn(queryParser, 'parseSearchQuery').mockReturnValueOnce({
      intents: [
        { id: 'rel_children', logicType: 'RELATIONAL', targetName: 'أحمد' },
        { id: 'rel_sons', logicType: 'RELATIONAL', targetName: 'أحمد' }
      ],
      remainingText: ''
    });

    const results = await searchService.search('أبناء ذكور وأطفال أحمد');
    const names = results.map(result => result.person.firstName);

    expect(names).toContain('خالد');
    expect(names).not.toContain('سارة');
    expect(names.length).toBe(1);

    spy.mockRestore();
  });

  it('handles multiple target names in the same query', async () => {
    const queryParser = await import('../search/queryParser');
    const spy = vi.spyOn(queryParser, 'parseSearchQuery').mockReturnValueOnce({
      intents: [
        { id: 'rel_sons', logicType: 'RELATIONAL', targetName: 'أحمد' },
        { id: 'rel_sons', logicType: 'RELATIONAL', targetName: 'نورة' }
      ],
      remainingText: ''
    });

    const results = await searchService.search('أبناء أحمد وأولاد نورة');
    const names = results.map(result => result.person.firstName);

    expect(names).toContain('خالد');
    expect(names.length).toBe(1);

    spy.mockRestore();
  });
});
