import { describe, expect, it } from 'vitest';
import { StatsEngine } from '../StatsEngine';
import type { Person } from '../../types';

const makePerson = (id: string, birthPlace: string): Person => ({
  id,
  title: '',
  firstName: `Person ${id}`,
  middleName: '',
  lastName: 'Test',
  birthName: '',
  nickName: '',
  suffix: '',
  gender: 'male',
  birthDate: '',
  birthPlace,
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
});

describe('StatsEngine', () => {
  it('groups top places by normalized place names and unique city aliases', () => {
    const kafranbelSyria = '\u0643\u0641\u0631\u0646\u0628\u0644\u060C \u0633\u0648\u0631\u064A\u0627';
    const kafranbelSlashSyria = '\u0643\u0641\u0631\u0646\u0628\u0644 /\u0633\u0648\u0631\u064A\u0627';
    const kafranbelOnly = '\u0643\u0641\u0631\u0646\u0628\u0644';
    const algeria = '\u0627\u0644\u062C\u0632\u0627\u0626\u0631';

    const stats = StatsEngine.calculate({
      p1: makePerson('p1', kafranbelSyria),
      p2: makePerson('p2', kafranbelSlashSyria),
      p3: makePerson('p3', kafranbelOnly),
      p4: makePerson('p4', algeria),
    });

    expect(stats.topPlaces).toEqual([
      { name: kafranbelSyria, count: 3 },
      { name: algeria, count: 1 },
    ]);
  });

  it('does not merge a short place name when it could match multiple expanded places', () => {
    const cairoOnly = 'Cairo';
    const cairoEgypt = 'Cairo, Egypt';
    const cairoUsa = 'Cairo, USA';

    const stats = StatsEngine.calculate({
      p1: makePerson('p1', cairoOnly),
      p2: makePerson('p2', cairoEgypt),
      p3: makePerson('p3', cairoUsa),
    });

    expect(stats.topPlaces).toEqual([
      { name: cairoOnly, count: 1 },
      { name: cairoEgypt, count: 1 },
      { name: cairoUsa, count: 1 },
    ]);
  });
});
