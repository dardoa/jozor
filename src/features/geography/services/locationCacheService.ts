import { getSupabaseWithAuth } from '../../../services/supabaseClient';
import { LocationData, LocationStatus } from '../../../types';
import { logError } from '../../../utils/errorLogger';
import { authTokenService } from '../../../services/authTokenService';

/**
 * Service to manage the global geocoding cache in Supabase.
 */
export const locationCacheService = {
  
  /**
   * Fetch a location from the global Supabase cache.
   */
  async getLocation(placeName: string): Promise<LocationData | null> {
    try {
      const client = getSupabaseWithAuth('', '', authTokenService.getStoredSupabaseTokenOrUndefined());
      const { data, error } = await client
        .from('locations_cache')
        .select('*')
        .eq('place_name', placeName)
        .maybeSingle();

      if (error) {
        logError('locationCacheService.getLocation', error, { category: 'DATABASE' });
        return null;
      }

      if (data) {
        return {
          lat: data.lat !== null ? parseFloat(data.lat) : undefined,
          lng: data.lng !== null ? parseFloat(data.lng) : undefined,
          resolvedName: data.resolved_name || undefined,
          status: data.status as LocationStatus,
          lastChecked: data.last_checked ? new Date(data.last_checked).getTime() : Date.now(),
        };
      }

      return null;
    } catch (error) {
       logError('locationCacheService.getLocation', error, { category: 'DATABASE' });
       return null;
    }
  },

  /**
   * Save a newly geocoded location to the global Supabase cache.
   */
  async saveLocation(placeName: string, data: LocationData): Promise<void> {
    try {
      const client = getSupabaseWithAuth('', '', authTokenService.getStoredSupabaseTokenOrUndefined());
      const { error } = await client
        .from('locations_cache')
        .upsert({
          place_name: placeName,
          resolved_name: data.resolvedName || null,
          lat: data.lat ?? null,
          lng: data.lng ?? null,
          status: data.status,
          last_checked: data.lastChecked ? new Date(data.lastChecked).toISOString() : new Date().toISOString()
        }, { onConflict: 'place_name' });

      if (error) {
        logError('locationCacheService.saveLocation', error, { category: 'DATABASE' });
      }
    } catch (error) {
        logError('locationCacheService.saveLocation', error, { category: 'DATABASE' });
    }
  }
};
