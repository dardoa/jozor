import { describe, expect, it } from 'vitest';
import type { LocationData, Person } from '../../types';
import { buildEventLocations, buildMigrationJourney } from '../mapJourneyUtils';
import { normalizePlaceName } from '../placeUtils';

const makeLocation = (location: LocationData): LocationData => location;

const makePerson = (person: Partial<Person> & Pick<Person, 'id' | 'firstName' | 'lastName'>): Person => {
  const { id, firstName, lastName, ...overrides } = person;

  return {
  id,
  title: '',
  firstName,
  middleName: '',
  lastName,
  birthName: '',
  nickName: '',
  suffix: '',
  gender: person.gender ?? 'male',
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
  };
};

const mockLocations: Record<string, LocationData> = {
  'Cairo': makeLocation({
    status: 'resolved',
    lat: 30.0444,
    lng: 31.2357,
    resolvedName: 'Cairo, Egypt',
  }),
  'Alexandria': makeLocation({
    status: 'resolved',
    lat: 31.2001,
    lng: 29.9187,
    resolvedName: 'Alexandria, Egypt',
  }),
  'Aswan': makeLocation({
    status: 'resolved',
    lat: 24.0889,
    lng: 32.8998,
    resolvedName: 'Aswan, Egypt',
  }),
  'Luxor': makeLocation({
    status: 'resolved',
    lat: 25.6872,
    lng: 32.6396,
    resolvedName: 'Luxor, Egypt',
  }),
  'Giza': makeLocation({
    status: 'resolved',
    lat: 30.0131,
    lng: 31.2089,
    resolvedName: 'Giza, Egypt',
  }),
  'Beirut': makeLocation({
    status: 'resolved',
    lat: 33.8938,
    lng: 35.5018,
    resolvedName: 'Beirut, Lebanon',
  }),
  'Riyadh': makeLocation({
    status: 'resolved',
    lat: 24.7136,
    lng: 46.6753,
    resolvedName: 'Riyadh, Saudi Arabia',
  }),
};

const mockPeople: Record<string, Person> = {
  'person-1': makePerson({
    id: 'person-1',
    firstName: 'Child',
    lastName: 'One',
    gender: 'male',
    birthPlace: 'Cairo',
    residence: 'Cairo',
    deathPlace: 'Cairo',
    birthDate: '1990-01-01',
    parents: ['person-2'],
  }),
  'person-2': makePerson({
    id: 'person-2',
    firstName: 'Parent',
    lastName: 'One',
    gender: 'female',
    birthPlace: 'Alexandria',
    residence: 'Cairo',
    birthDate: '1960-01-01',
    parents: [],
  }),
  'person-3': makePerson({
    id: 'person-3',
    firstName: 'Child',
    lastName: 'Aswan',
    gender: 'female',
    birthPlace: 'Aswan',
    birthDate: '1985-05-05',
    parents: ['person-4'],
  }),
  'person-4': makePerson({
    id: 'person-4',
    firstName: 'Parent',
    lastName: 'Aswan',
    gender: 'male',
    birthPlace: 'Aswan',
    birthDate: '1955-05-05',
    parents: [],
  }),
  'person-5': makePerson({
    id: 'person-5',
    firstName: 'Event',
    lastName: 'Person',
    gender: 'female',
    birthPlace: 'Luxor',
    birthDate: '2000-01-01',
    marriagePlace: 'Beirut',
    address: 'Riyadh',
    events: [
      { id: 'event-1', title: 'Move', place: 'Cairo', date: '2010-01-01' }
    ],
    partnerDetails: {
      'partner-1': {
        type: 'married',
        startDate: '2005-01-01',
        startPlace: 'Giza',
        endPlace: 'Cairo'
      }
    },
    parents: [],
  }),
};

describe('mapJourneyUtils', () => {
  describe('buildEventLocations', () => {
    it('aggregates geographic locations from multiple event sources', () => {
      const locations = buildEventLocations(mockPeople, mockLocations);

      // Cairo location should contain multiple people and events
      const cairoLoc = locations.find(l => l.name === 'Cairo, Egypt');
      expect(cairoLoc).toBeDefined();
      expect(cairoLoc?.latitude).toBe(30.0444);
      expect(cairoLoc?.longitude).toBe(31.2357);

      // Cairo should contain person-1, person-2, and person-5
      const cairoPeopleIds = cairoLoc?.people.map(p => p.id);
      expect(cairoPeopleIds).toContain('person-1');
      expect(cairoPeopleIds).toContain('person-2');
      expect(cairoPeopleIds).toContain('person-5');

      const gizaLoc = locations.find(l => l.name === 'Giza, Egypt');
      expect(gizaLoc).toBeDefined();
      expect(gizaLoc?.people).toContainEqual(expect.objectContaining({
        id: 'person-5',
        type: 'marriage',
      }));

      const beirutLoc = locations.find(l => l.name === 'Beirut, Lebanon');
      expect(beirutLoc?.people).toContainEqual(expect.objectContaining({
        id: 'person-5',
        type: 'marriage',
      }));

      const riyadhLoc = locations.find(l => l.name === 'Riyadh, Saudi Arabia');
      expect(riyadhLoc?.people).toContainEqual(expect.objectContaining({
        id: 'person-5',
        type: 'address',
      }));
    });

    it('skips unresolved location coordinates', () => {
      const customPeople = {
        'person-x': makePerson({
          id: 'person-x',
          firstName: 'No',
          lastName: 'Coords',
          birthPlace: 'NonExistentPlace',
          parents: [],
        }),
      };

      const locations = buildEventLocations(customPeople, mockLocations);
      expect(locations).toHaveLength(0);
    });

    it('aggregates equivalent raw place spellings under one resolved place', () => {
      const people = {
        'person-a': makePerson({
          id: 'person-a',
          firstName: 'Arabic',
          lastName: 'Comma',
          birthPlace: 'كفرنبل، سوريا',
          parents: [],
        }),
        'person-b': makePerson({
          id: 'person-b',
          firstName: 'Arabic',
          lastName: 'Dash',
          birthPlace: 'كفرنبل - سوريا',
          parents: [],
        }),
        'person-c': makePerson({
          id: 'person-c',
          firstName: 'English',
          lastName: 'Name',
          birthPlace: 'Kafranbel, Syria',
          parents: [],
        }),
      };

      const locationData = makeLocation({
        status: 'resolved',
        lat: 35.613,
        lng: 36.56,
        resolvedName: 'Kafranbel, Syria',
      });

      const locations = buildEventLocations(people, {
        [normalizePlaceName('كفرنبل سوريا')]: locationData,
        [normalizePlaceName('Kafranbel, Syria')]: locationData,
      });

      expect(locations).toHaveLength(1);
      expect(locations[0].name).toBe('Kafranbel, Syria');
      expect(locations[0].people.map(person => person.id)).toEqual([
        'person-a',
        'person-b',
        'person-c',
      ]);
    });
  });

  describe('buildMigrationJourney', () => {
    it('generates person journey links between consecutive places', () => {
      const { nodes, links } = buildMigrationJourney(mockPeople, mockLocations);

      // Expect Egyptian city nodes
      expect(nodes.some(n => n.locationName === 'Alexandria, Egypt')).toBe(true);
      expect(nodes.some(n => n.locationName === 'Cairo, Egypt')).toBe(true);
      expect(nodes.some(n => n.locationName === 'Beirut, Lebanon')).toBe(true);
      expect(nodes.some(n => n.locationName === 'Riyadh, Saudi Arabia')).toBe(true);

      const link = links.find(l => l.source.personId === 'person-2' && l.target.personId === 'person-2');
      expect(link).toBeDefined();
      expect(link?.source.locationName).toBe('Alexandria, Egypt');
      expect(link?.target.locationName).toBe('Cairo, Egypt');
      expect(link?.color).toBe('#8B6914');
      expect(link?.count).toBe(1);
      expect(link?.people).toContainEqual(expect.objectContaining({ id: 'person-2' }));
    });

    it('skips links when consecutive coordinates are identical', () => {
      const { links } = buildMigrationJourney(mockPeople, mockLocations);

      const link = links.find(l => l.source.personId === 'person-3' || l.source.personId === 'person-4');
      expect(link).toBeUndefined();
    });

    it('skips private people in migration nodes', () => {
      const { nodes, links } = buildMigrationJourney({
        'private-person': makePerson({
          id: 'private-person',
          firstName: 'Hidden',
          lastName: 'Address',
          address: 'Riyadh',
          birthPlace: 'Cairo',
          isPrivate: true,
          parents: [],
        }),
      }, mockLocations);

      expect(nodes).toHaveLength(0);
      expect(links).toHaveLength(0);
    });

    it('aggregates repeated routes across people', () => {
      const people = {
        'person-a': makePerson({
          id: 'person-a',
          firstName: 'First',
          lastName: 'Mover',
          birthPlace: 'Alexandria',
          residence: 'Cairo',
          parents: [],
        }),
        'person-b': makePerson({
          id: 'person-b',
          firstName: 'Second',
          lastName: 'Mover',
          birthPlace: 'Alexandria',
          residence: 'Cairo',
          parents: [],
        }),
      };

      const { links } = buildMigrationJourney(people, mockLocations);
      const link = links.find(route => route.source.locationName === 'Alexandria, Egypt' && route.target.locationName === 'Cairo, Egypt');

      expect(link?.count).toBe(2);
      expect(link?.people.map(person => person.id)).toEqual(['person-a', 'person-b']);
    });

    it('preserves event sequence when a person has multiple resolved places', () => {
      const { links } = buildMigrationJourney(mockPeople, mockLocations);

      expect(links.some(link => link.source.locationName === 'Luxor, Egypt' && link.target.locationName === 'Giza, Egypt')).toBe(true);
      expect(links.some(link => link.source.locationName === 'Cairo, Egypt' && link.target.locationName === 'Riyadh, Saudi Arabia')).toBe(true);
    });
  });
});
