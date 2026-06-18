import { describe, expect, it } from 'vitest';
import type { LocationData, Person } from '../../types';
import { buildEventLocations, buildMigrationJourney } from '../mapJourneyUtils';

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
      const cairoLoc = locations.find(l => l.id === 'Cairo');
      expect(cairoLoc).toBeDefined();
      expect(cairoLoc?.latitude).toBe(30.0444);
      expect(cairoLoc?.longitude).toBe(31.2357);

      // Cairo should contain person-1, person-2, and person-5
      const cairoPeopleIds = cairoLoc?.people.map(p => p.id);
      expect(cairoPeopleIds).toContain('person-1');
      expect(cairoPeopleIds).toContain('person-2');
      expect(cairoPeopleIds).toContain('person-5');
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
  });

  describe('buildMigrationJourney', () => {
    it('generates parent-to-child links', () => {
      const { nodes, links } = buildMigrationJourney(mockPeople, mockLocations);

      // Expect Egyptian city nodes
      expect(nodes.some(n => n.locationName === 'Alexandria, Egypt')).toBe(true);
      expect(nodes.some(n => n.locationName === 'Cairo, Egypt')).toBe(true);

      // Alexandria (parent person-2) should link to Cairo (child person-1)
      const link = links.find(l => l.source.personId === 'person-2' && l.target.personId === 'person-1');
      expect(link).toBeDefined();
      expect(link?.source.locationName).toBe('Alexandria, Egypt');
      expect(link?.target.locationName).toBe('Cairo, Egypt');
      expect(link?.color).toBe('#3b82f6');
    });

    it('skips parent-to-child link when coordinates are identical', () => {
      const { links } = buildMigrationJourney(mockPeople, mockLocations);

      // person-3 (Aswan) and parent person-4 (Aswan) should not have a link since coordinates are same
      const link = links.find(l => l.source.personId === 'person-4' && l.target.personId === 'person-3');
      expect(link).toBeUndefined();
    });

    it('preserves semantics by using the first node generated for a person when multiple exist', () => {
      const { links } = buildMigrationJourney(mockPeople, mockLocations);

      // person-2 (parent) has multiple nodes: 1st is Alexandria (birth), 2nd is Cairo (residence).
      // The parent-child link to person-1 must use the first node (Alexandria).
      const link = links.find(l => l.source.personId === 'person-2' && l.target.personId === 'person-1');
      expect(link).toBeDefined();
      expect(link?.source.locationName).toBe('Alexandria, Egypt'); // Alexandria, not Cairo
    });
  });
});
