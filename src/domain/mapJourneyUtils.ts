import type { LocationData, Person } from '../types';
import { resolvePlace } from './placeUtils';
import { collectPersonPlaceEntries, type PersonPlaceKind } from './personPlaceUtils';

export type GeographicEventKind = PersonPlaceKind;

export type GeographicEventLocation = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  people: Array<{
    id: string;
    name: string;
    type: GeographicEventKind;
    gender: Person['gender'];
    birthDate: string;
    photoUrl?: string;
  }>;
};

export type MigrationNode = {
  personId: string;
  name: string;
  locationName: string;
  lat: number;
  lng: number;
  year?: number;
};

export type MigrationLink = {
  id: string;
  source: MigrationNode;
  target: MigrationNode;
  color: string;
  count: number;
  people: Array<{
    id: string;
    name: string;
    year?: number;
  }>;
};

const getDisplayName = (person: Person) =>
  [person.firstName, person.middleName, person.lastName].filter(Boolean).join(' ').trim();

const getYearFromDate = (date?: string) => {
  if (!date) return undefined;
  const year = Number.parseInt(date.substring(0, 4), 10);
  return Number.isFinite(year) ? year : undefined;
};

/**
 * Builds event-map points from already-resolved location rows only.
 *
 * The geographic journey must never issue fresh geocoding requests. It only
 * renders coordinates that were previously resolved and stored in the app state.
 */
export const buildEventLocations = (
  people: Record<string, Person>,
  locations: Record<string, LocationData>
): GeographicEventLocation[] => {
  const eventLocations = new Map<string, GeographicEventLocation>();

  const addLocation = (placeName: string, person: Person, type: GeographicEventKind) => {
    if (!placeName?.trim() || person.isPrivate) {
      return;
    }

    const resolvedLocation = resolvePlace(placeName, locations);
    if (!resolvedLocation) {
      return;
    }

    const entry = {
      id: person.id,
      name: getDisplayName(person),
      type,
      gender: person.gender,
      birthDate: person.birthDate,
      photoUrl: person.photoUrl,
    };

    const existing = eventLocations.get(resolvedLocation.id);
    if (existing) {
      if (!existing.people.some(candidate => candidate.id === person.id && candidate.type === type)) {
        existing.people.push(entry);
      }
      return;
    }

    eventLocations.set(resolvedLocation.id, {
      ...resolvedLocation,
      people: [entry],
    });
  };

  Object.values(people).forEach(person => {
    collectPersonPlaceEntries(person).forEach(entry => {
      addLocation(entry.placeName, person, entry.type);
    });
  });

  return Array.from(eventLocations.values());
};

export const buildMigrationJourney = (
  people: Record<string, Person>,
  locations: Record<string, LocationData>
): { nodes: MigrationNode[]; links: MigrationLink[] } => {
  const nodes: MigrationNode[] = [];
  const linksByRoute = new Map<string, MigrationLink>();

  Object.values(people).forEach(person => {
    if (person.isPrivate) {
      return;
    }

    const personName = getDisplayName(person);
    const visitedPlaces = new Set<string>();
    const itinerary: MigrationNode[] = [];

    const collectPlace = (placeName?: string, date?: string) => {
      const trimmedPlace = placeName?.trim();
      if (!trimmedPlace) {
        return;
      }

      const resolvedLocation = resolvePlace(trimmedPlace, locations);
      if (!resolvedLocation) {
        return;
      }

      const year = getYearFromDate(date) ?? getYearFromDate(person.birthDate);
      const node = {
        personId: person.id,
        name: personName,
        locationName: resolvedLocation.name,
        lat: resolvedLocation.latitude,
        lng: resolvedLocation.longitude,
        year,
      };

      if (!visitedPlaces.has(resolvedLocation.id)) {
        visitedPlaces.add(resolvedLocation.id);
        nodes.push(node);
      }

      if (itinerary[itinerary.length - 1]?.locationName !== resolvedLocation.name) {
        itinerary.push(node);
      }
    };

    collectPersonPlaceEntries(person).forEach(entry => {
      collectPlace(entry.placeName, entry.date);
    });

    for (let index = 1; index < itinerary.length; index += 1) {
      const source = itinerary[index - 1];
      const target = itinerary[index];

      if (source.lat === target.lat && source.lng === target.lng) {
        continue;
      }

      const routeKey = `${source.locationName}=>${target.locationName}`;
      const existing = linksByRoute.get(routeKey);
      const personEntry = {
        id: person.id,
        name: personName,
        year: target.year,
      };

      if (existing) {
        if (!existing.people.some(candidate => candidate.id === person.id)) {
          existing.people.push(personEntry);
          existing.count = existing.people.length;
        }
        continue;
      }

      linksByRoute.set(routeKey, {
        id: routeKey,
        source,
        target,
        color: '#8B6914',
        count: 1,
        people: [personEntry],
      });
    }
  });

  return { nodes, links: Array.from(linksByRoute.values()) };
};
