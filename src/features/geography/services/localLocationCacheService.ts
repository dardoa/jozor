import type { LocationData } from '../../../types/tree';
import { normalizePlaceName } from '../../../domain/placeUtils';

const STORAGE_PREFIX = 'jozor.locationCache.v1.';
const RESOLVED_TTL_MS = 180 * 24 * 60 * 60 * 1000;
const FAILED_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface CachedLocationEntry {
  cachedAt: number;
  data: LocationData;
}

const canUseLocalStorage = () =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const getStorageKey = (placeName: string) => `${STORAGE_PREFIX}${normalizePlaceName(placeName)}`;

const isLocationData = (value: unknown): value is LocationData => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<LocationData>;
  return candidate.status === 'resolved' || candidate.status === 'failed' || candidate.status === 'pending';
};

const parseEntry = (raw: string | null): CachedLocationEntry | null => {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<CachedLocationEntry>;
    if (typeof parsed.cachedAt !== 'number' || !isLocationData(parsed.data)) {
      return null;
    }
    return { cachedAt: parsed.cachedAt, data: parsed.data };
  } catch {
    return null;
  }
};

const isExpired = (entry: CachedLocationEntry, now = Date.now()) => {
  const ttl = entry.data.status === 'failed' ? FAILED_TTL_MS : RESOLVED_TTL_MS;
  return now - entry.cachedAt > ttl;
};

export const localLocationCacheService = {
  getLocation(placeName: string): LocationData | null {
    if (!canUseLocalStorage()) return null;

    const key = getStorageKey(placeName);
    const entry = parseEntry(window.localStorage.getItem(key));

    if (!entry || entry.data.status === 'pending') {
      window.localStorage.removeItem(key);
      return null;
    }

    if (isExpired(entry)) {
      window.localStorage.removeItem(key);
      return null;
    }

    return entry.data;
  },

  saveLocation(placeName: string, data: LocationData): void {
    if (!canUseLocalStorage() || data.status === 'pending') return;

    try {
      const entry: CachedLocationEntry = {
        cachedAt: Date.now(),
        data,
      };
      window.localStorage.setItem(getStorageKey(placeName), JSON.stringify(entry));
    } catch {
      // Local geocoding cache is an optimization only.
    }
  },
};
