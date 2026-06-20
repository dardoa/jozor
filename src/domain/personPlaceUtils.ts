import type { Person } from '../types';

export type PersonPlaceKind =
  | 'birth'
  | 'death'
  | 'residence'
  | 'burial'
  | 'marriage'
  | 'address'
  | 'event';

export interface PersonPlaceEntry {
  placeName: string;
  type: PersonPlaceKind;
  date?: string;
  order: number;
}

const pushPlace = (
  entries: PersonPlaceEntry[],
  placeName: string | undefined,
  type: PersonPlaceKind,
  order: number,
  date?: string
) => {
  const trimmedPlace = placeName?.trim();
  if (!trimmedPlace) return;

  entries.push({ placeName: trimmedPlace, type, date, order });
};

const comparePlaceEntries = (left: PersonPlaceEntry, right: PersonPlaceEntry) => {
  if (left.order !== right.order) {
    return left.order - right.order;
  }

  const leftDate = left.date?.trim() || '';
  const rightDate = right.date?.trim() || '';

  if (leftDate && rightDate && leftDate !== rightDate) {
    return leftDate.localeCompare(rightDate);
  }

  if (leftDate && !rightDate) return -1;
  if (!leftDate && rightDate) return 1;

  return 0;
};

export const collectPersonPlaceEntries = (person: Person): PersonPlaceEntry[] => {
  const entries: PersonPlaceEntry[] = [];

  pushPlace(entries, person.birthPlace, 'birth', 10, person.birthDate);
  pushPlace(entries, person.marriagePlace, 'marriage', 40, person.marriageDate);

  person.events?.forEach(event => {
    pushPlace(entries, event.place, 'event', 50, event.date);
  });

  Object.values(person.partnerDetails || {}).forEach(partner => {
    pushPlace(entries, partner.startPlace, 'marriage', 40, partner.startDate);
    pushPlace(entries, partner.endPlace, 'event', 60, partner.endDate);
  });

  pushPlace(entries, person.residence, 'residence', 70);
  pushPlace(entries, person.address, 'address', 75);
  pushPlace(entries, person.deathPlace, 'death', 90, person.deathDate);
  pushPlace(entries, person.burialPlace, 'burial', 95, person.deathDate);

  return entries.sort(comparePlaceEntries);
};

export const collectPersonPlaceNames = (person: Person): string[] => {
  const places = new Map<string, string>();

  collectPersonPlaceEntries(person).forEach(entry => {
    const key = entry.placeName.toLocaleLowerCase();
    if (!places.has(key)) {
      places.set(key, entry.placeName);
    }
  });

  return Array.from(places.values());
};
