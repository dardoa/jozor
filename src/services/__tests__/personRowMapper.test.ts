
import { describe, expect, it } from 'vitest';
import type { Person } from '../../types';
import { mapDbPersonRowToPerson, mapPersonToDbRow } from '../personRowMapper';

const buildPerson = (): Person => ({
  id: 'person-1',
  title: 'Dr',
  firstName: 'Amina',
  middleName: 'Saleh',
  lastName: 'Alotaibi',
  birthName: 'Amina Saleh',
  nickName: 'Ami',
  suffix: 'PhD',
  gender: 'female',
  birthDate: '1988-02-10',
  birthPlace: 'Riyadh',
  birthSource: 'civil registry',
  marriageDate: '2010-01-01',
  marriagePlace: 'Jeddah',
  deathDate: '',
  deathPlace: '',
  deathSource: '',
  burialPlace: '',
  residence: 'Dammam',
  isDeceased: false,
  profession: 'Historian',
  company: 'Archive House',
  interests: 'Genealogy',
  bio: 'Researcher and family historian',
  photoUrl: 'https://example.com/photo.jpg',
  gallery: ['https://example.com/g1.jpg'],
  voiceNotes: ['note-1'],
  sources: [{ id: 's1', title: 'Civil record' }],
  events: [{ id: 'e1', title: 'Graduation', date: '2012-01-01' }],
  email: 'amina@example.com',
  website: 'https://amina.example.com',
  blog: 'https://blog.example.com',
  address: 'Riyadh',
  parents: ['parent-1', 'parent-2'],
  spouses: ['spouse-1'],
  children: ['child-1'],
  partnerDetails: {
    'spouse-1': {
      type: 'married',
      startDate: '2010-01-01',
      startPlace: 'Jeddah',
    },
  },
  isPrivate: true,
});

describe('personRowMapper', () => {
  it('maps Person to DB row with explicit custom_fields payload', () => {
    const person = buildPerson();

    const row = mapPersonToDbRow(person, 'tree-1');

    expect(row).toMatchObject({
      id: 'person-1',
      tree_id: 'tree-1',
      first_name: 'Amina',
      middle_name: 'Saleh',
      last_name: 'Alotaibi',
      profession: 'Historian',
      company: 'Archive House',
      bio: 'Researcher and family historian',
      custom_fields: expect.objectContaining({
        title: 'Dr',
        birthSource: 'civil registry',
        marriageDate: '2010-01-01',
        residence: 'Dammam',
        isPrivate: true,
      }),
      metadata: expect.objectContaining({
        firstName: 'Amina',
      }),
    });
  });

  it('maps DB row back to Person while preserving extended fields from custom_fields', () => {
    const person = buildPerson();
    const row = mapPersonToDbRow(person, 'tree-1');

    const restored = mapDbPersonRowToPerson({
      ...row,
      birth_date: '1988-02-10',
      death_date: null,
    });

    expect(restored).toMatchObject({
      id: 'person-1',
      title: 'Dr',
      firstName: 'Amina',
      middleName: 'Saleh',
      lastName: 'Alotaibi',
      birthSource: 'civil registry',
      marriageDate: '2010-01-01',
      residence: 'Dammam',
      profession: 'Historian',
      bio: 'Researcher and family historian',
      isPrivate: true,
    });
    expect(restored.parents).toEqual([]);
    expect(restored.spouses).toEqual([]);
    expect(restored.children).toEqual([]);
  });
});

