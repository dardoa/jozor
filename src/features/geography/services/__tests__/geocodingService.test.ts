import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LocationData } from '../../../../types/tree';
import { localLocationCacheService } from '../localLocationCacheService';
import { normalizePlaceName } from '../../../../domain/placeUtils';

const getLocationMock = vi.hoisted(() => vi.fn<() => Promise<LocationData | null>>());
const saveLocationMock = vi.hoisted(() => vi.fn<() => Promise<void>>());

vi.mock('../locationCacheService', () => ({
  locationCacheService: {
    getLocation: getLocationMock,
    saveLocation: saveLocationMock,
  },
}));

describe('geocodingService', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    window.localStorage.clear();
    getLocationMock.mockResolvedValue(null);
    saveLocationMock.mockResolvedValue(undefined);
    vi.stubGlobal('fetch', vi.fn());
  });

  it('uses browser-local cache before Supabase or Nominatim for equivalent place spellings', async () => {
    const cachedLocation: LocationData = {
      status: 'resolved',
      lat: 35.613,
      lng: 36.56,
      resolvedName: 'Kafranbel, Syria',
      lastChecked: Date.now(),
    };

    localLocationCacheService.saveLocation(normalizePlaceName('كفرنبل - سوريا'), cachedLocation);
    const { geocodingService } = await import('../geocodingService');

    const result = await geocodingService.geocode('كفرنبل، سوريا');

    expect(result).toEqual(cachedLocation);
    expect(getLocationMock).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('hydrates browser-local cache from Supabase cache to avoid later Nominatim calls', async () => {
    const dbLocation: LocationData = {
      status: 'resolved',
      lat: 24.7136,
      lng: 46.6753,
      resolvedName: 'Riyadh, Saudi Arabia',
      lastChecked: Date.now(),
    };

    getLocationMock.mockResolvedValueOnce(dbLocation);
    const { geocodingService } = await import('../geocodingService');

    const firstResult = await geocodingService.geocode('Riyadh, Saudi Arabia');
    const secondResult = await geocodingService.geocode('Riyadh - Saudi Arabia');

    expect(firstResult).toEqual(dbLocation);
    expect(secondResult).toEqual(dbLocation);
    expect(getLocationMock).toHaveBeenCalledTimes(1);
    expect(fetch).not.toHaveBeenCalled();
  });
});
