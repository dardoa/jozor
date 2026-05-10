import type { LocationData, Person } from '../types';

export type GeographicEventKind =
  | 'birth'
  | 'death'
  | 'residence'
  | 'burial'
  | 'marriage'
  | 'event';

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
  source: MigrationNode;
  target: MigrationNode;
  color: string;
};

const hasResolvedCoordinates = (location?: LocationData) =>
  location?.status === 'resolved' &&
  typeof location.lat === 'number' &&
  typeof location.lng === 'number';

const getDisplayName = (person: Person) =>
  [person.firstName, person.middleName, person.lastName].filter(Boolean).join(' ').trim();

const getResolvedLocation = (
  placeName: string,
  locations: Record<string, LocationData>
) => {
  const trimmedPlace = placeName.trim();
  const location = locations[trimmedPlace];

  if (!hasResolvedCoordinates(location)) {
    return null;
  }

  return {
    id: trimmedPlace,
    name: location.resolvedName || trimmedPlace,
    latitude: location.lat!,
    longitude: location.lng!,
  };
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

    const resolvedLocation = getResolvedLocation(placeName, locations);
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
    addLocation(person.birthPlace, person, 'birth');
    addLocation(person.deathPlace, person, 'death');
    addLocation(person.residence, person, 'residence');
    addLocation(person.burialPlace, person, 'burial');

    if (person.marriagePlace?.trim()) {
      addLocation(person.marriagePlace, person, 'marriage');
    }

    person.events?.forEach(event => {
      if (event.place?.trim()) {
        addLocation(event.place, person, 'event');
      }
    });
  });

  return Array.from(eventLocations.values());
};

/**
 * Preserves the current migration-map semantics while moving the derivation
 * out of the modal component. Parent-to-child links remain the main narrative.
 */
export const buildMigrationJourney = (
  people: Record<string, Person>,
  locations: Record<string, LocationData>
): { nodes: MigrationNode[]; links: MigrationLink[] } => {
  const nodes: MigrationNode[] = [];
  const links: MigrationLink[] = [];

  Object.values(people).forEach(person => {
    const visitedPlaces = new Set<string>();

    const collectPlace = (placeName?: string) => {
      if (!placeName?.trim()) {
        return;
      }

      const resolvedLocation = getResolvedLocation(placeName, locations);
      if (!resolvedLocation || visitedPlaces.has(resolvedLocation.id)) {
        return;
      }

      visitedPlaces.add(resolvedLocation.id);
      nodes.push({
        personId: person.id,
        name: getDisplayName(person),
        locationName: resolvedLocation.name,
        lat: resolvedLocation.latitude,
        lng: resolvedLocation.longitude,
        year: person.birthDate ? Number.parseInt(person.birthDate.substring(0, 4), 10) || undefined : undefined,
      });
    };

    collectPlace(person.birthPlace);
    collectPlace(person.residence);
    collectPlace(person.deathPlace);
    collectPlace(person.burialPlace);
    person.events?.forEach(event => collectPlace(event.place));
    Object.values(person.partnerDetails || {}).forEach(partner => {
      collectPlace(partner.startPlace);
      collectPlace(partner.endPlace);
    });
  });

  Object.values(people).forEach(person => {
    person.parents.forEach(parentId => {
      const childNode = nodes.find(node => node.personId === person.id);
      const parentNode = nodes.find(node => node.personId === parentId);

      if (!childNode || !parentNode) {
        return;
      }

      if (childNode.lat === parentNode.lat && childNode.lng === parentNode.lng) {
        return;
      }

      links.push({
        source: parentNode,
        target: childNode,
        color: '#3b82f6',
      });
    });
  });

  return { nodes, links };
};
