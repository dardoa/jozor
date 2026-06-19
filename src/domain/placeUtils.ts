import type { LocationData } from '../types';

export interface ResolvedPlace {
  id: string;
  rawName: string;
  name: string;
  latitude: number;
  longitude: number;
}

const buildCoordinatePlaceId = (latitude: number, longitude: number) =>
  `coord:${latitude.toFixed(5)},${longitude.toFixed(5)}`;

export function normalizePlaceName(value: string): string {
  if (!value) return '';
  let normalized = value.toLowerCase().normalize('NFD');

  normalized = normalized.replace(/[\u064B-\u065F\u0670]/g, '');
  normalized = normalized.replace(/[\u0623\u0625\u0622]/g, '\u0627');
  normalized = normalized.replace(/\u0629/g, '\u0647');
  normalized = normalized.replace(/\u0649/g, '\u064A');
  normalized = normalized.replace(/\u0640/g, '');
  normalized = normalized.replace(/[\u060C\u061B,\/\\_.|()[\]{}-]/g, ' ');
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
}

export const hasResolvedCoordinates = (location?: LocationData) =>
  location?.status === 'resolved' &&
  typeof location.lat === 'number' &&
  typeof location.lng === 'number';

export function getLocationDataForPlace(
  placeName: string,
  locations: Record<string, LocationData>
): LocationData | undefined {
  const trimmedPlace = placeName.trim();
  if (!trimmedPlace) return undefined;

  const directMatch = locations[trimmedPlace];
  if (directMatch) return directMatch;

  const normalizedPlace = normalizePlaceName(trimmedPlace);
  const normalizedMatch = locations[normalizedPlace];
  if (normalizedMatch) return normalizedMatch;

  return Object.entries(locations).find(([key, location]) => {
    if (normalizePlaceName(key) === normalizedPlace) return true;
    if (location.resolvedName && normalizePlaceName(location.resolvedName) === normalizedPlace) return true;
    return false;
  })?.[1];
}

export function resolvePlace(
  placeName: string,
  locations: Record<string, LocationData>
): ResolvedPlace | null {
  const trimmedPlace = placeName.trim();
  const location = getLocationDataForPlace(trimmedPlace, locations);

  if (!hasResolvedCoordinates(location)) {
    return null;
  }

  const resolvedLocation = location as LocationData & { lat: number; lng: number };
  const displayName = resolvedLocation.resolvedName || trimmedPlace;

  return {
    id: buildCoordinatePlaceId(resolvedLocation.lat, resolvedLocation.lng),
    rawName: trimmedPlace,
    name: displayName,
    latitude: resolvedLocation.lat,
    longitude: resolvedLocation.lng,
  };
}
