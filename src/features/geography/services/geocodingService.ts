import { LocationData } from '../../../types';
import { locationCacheService } from './locationCacheService';
import { localLocationCacheService } from './localLocationCacheService';
import { normalizePlaceName } from '../../../domain/placeUtils';

// Nominatim usage policy requires max 1 request per second
const DELAY_BETWEEN_REQUESTS_MS = 1100;

interface GeocodeQueueItem {
    placeName: string;
    resolve: (data: LocationData) => void;
    reject: (error: Error) => void;
}

export { normalizePlaceName };

/**
 * Shortens a full Nominatim display_name to "City, Country" format.
 * Example: "Kafranbel, Maarrat al-Numan District, Idlib Governorate, Syria"
 * becomes "Kafranbel, Syria".
 */
export function shortenDisplayName(displayName: string): string {
    if (!displayName) return displayName;
    const parts = displayName.split(',').map((part) => part.trim()).filter(Boolean);
    if (parts.length <= 2) return displayName;
    return `${parts[0]}, ${parts[parts.length - 1]}`;
}

class GeocodingService {
    private queue: GeocodeQueueItem[] = [];
    private isProcessing = false;

    /**
     * Geocode a place name with an optional country context.
     * Uses a queue to ensure Nominatim API rate limits are respected.
     */
    async geocode(placeName: string, countryContext?: string): Promise<LocationData> {
        return new Promise((resolve, reject) => {
            const query = countryContext ? `${placeName}, ${countryContext}` : placeName;

            this.queue.push({ placeName: query, resolve, reject });
            this.processQueue();
        });
    }

    private async processQueue() {
        if (this.isProcessing || this.queue.length === 0) return;

        this.isProcessing = true;

        while (this.queue.length > 0) {
            const item = this.queue.shift();
            if (!item) continue;

            const normalizedKey = normalizePlaceName(item.placeName);

            try {
                // Tier 1.5: Browser-local cache. This prevents repeated Nominatim
                // calls for the same normalized place across app reloads, including
                // guest sessions that cannot write to the Supabase cache.
                const localCache = localLocationCacheService.getLocation(normalizedKey);
                if (localCache) {
                    item.resolve(localCache);
                    continue;
                }

                // Tier 2: Check Supabase Global Cache using normalized key
                const dbCache = await locationCacheService.getLocation(normalizedKey);

                if (dbCache) {
                    localLocationCacheService.saveLocation(normalizedKey, dbCache);
                    item.resolve(dbCache);
                    continue;
                }

                // Tier 3: Fetch from Nominatim API
                const data = await this.fetchFromNominatim(item.placeName);

                // Save back to Supabase (Tier 2) immediately using normalizedKey
                await locationCacheService.saveLocation(normalizedKey, data);
                localLocationCacheService.saveLocation(normalizedKey, data);

                // Resolve to update Zustand (Tier 1)
                item.resolve(data);
            } catch {
                // We do not cache network failures permanently so retries can succeed later.
                item.resolve({ status: 'failed', lastChecked: Date.now() });
            }

            if (this.queue.length > 0) {
                await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_REQUESTS_MS));
            }
        }

        this.isProcessing = false;
    }

    private async fetchFromNominatim(query: string): Promise<LocationData> {
        try {
            const encodedQuery = encodeURIComponent(query);
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=jsonv2&limit=1`,
                {
                    headers: {
                        'Accept-Language': 'ar,en',
                        'User-Agent': 'Jozor Family Tree App / 1.1',
                    },
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data && data.length > 0) {
                const result = data[0];
                return {
                    lat: parseFloat(result.lat),
                    lng: parseFloat(result.lon),
                    resolvedName: shortenDisplayName(result.display_name),
                    status: 'resolved',
                    lastChecked: Date.now(),
                };
            }

            return {
                status: 'failed',
                lastChecked: Date.now(),
            };
        } catch (error) {
            console.error('[GeocodingService] Failed to fetch:', error);
            throw error;
        }
    }
}

export const geocodingService = new GeocodingService();
