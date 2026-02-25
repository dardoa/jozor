import { useMemo } from 'react';
import { Person } from '../types';

export interface GeoLocation {
    id: string; // unique location key
    name: string;
    latitude: number;
    longitude: number;
    people: { id: string; name: string; type: 'birth' | 'death' | 'event'; photoUrl?: string }[];
}

// Robust mock geocoding for common regions/cities
const MOCK_GEO_INDEX: Record<string, [number, number]> = {
    'New York': [40.7128, -74.0060],
    'London': [51.5074, -0.1278],
    'Paris': [48.8566, 2.3522],
    'Berlin': [52.5200, 13.4050],
    'Cairo': [30.0444, 31.2357],
    'Riyadh': [24.7136, 46.6753],
    'Dubai': [25.2048, 55.2708],
    'Tokyo': [35.6762, 139.6503],
    'Sydney': [-33.8688, 151.2093],
    'Moscow': [55.7558, 37.6173],
    'Beijing': [39.9042, 116.4074],
    'Amman': [31.9454, 35.9284],
    'Beirut': [33.8938, 35.5018],
    'Damascus': [33.5138, 36.2765],
    'Baghdad': [33.3152, 44.3661],
    'Kuwait City': [29.3759, 47.9774],
    'Doha': [25.2854, 51.5310],
    'Muscat': [23.5859, 58.4059],
    'Jerusalem': [31.7683, 35.2137],
    'Haifa': [32.7940, 34.9896],
    'Nablus': [32.2211, 35.2544],
    'Gaza': [31.5017, 34.4667],
    'Alexandria': [31.2001, 29.9187],
    'Casablanca': [33.5731, -7.5898],
    'Tunis': [36.8065, 10.1815],
    'Algiers': [36.7538, 3.0588],
    'San Francisco': [37.7749, -122.4194],
    'Los Angeles': [34.0522, -118.2437],
    'Chicago': [41.8781, -87.6298],
    'Toronto': [43.6532, -79.3832],
    'Vancouver': [49.2827, -123.1207],
};

/**
 * useGeoData: Extracts unique locations from the people store and provides coordinates.
 */
export const useGeoData = (people: Record<string, Person>) => {
    return useMemo(() => {
        const locationMap = new Map<string, GeoLocation>();

        const addLocation = (place: string, person: Person, type: 'birth' | 'death' | 'event') => {
            if (!place || place.trim() === '') return;

            const normalizedPlace = place.trim();
            // Try to find coordinates
            let coords = MOCK_GEO_INDEX[normalizedPlace];

            // Smart fuzzy matching (last part of comma separated location)
            if (!coords && normalizedPlace.includes(',')) {
                const parts = normalizedPlace.split(',');
                const lastPart = parts[parts.length - 1].trim();
                coords = MOCK_GEO_INDEX[lastPart];
            }

            // If still no coords, use a stable hash-based scatter near a "safe" default (center of world or region)
            if (!coords) {
                // Deterministic pseudo-random coordinates based on string hash
                let hash = 0;
                for (let i = 0; i < normalizedPlace.length; i++) {
                    hash = normalizedPlace.charCodeAt(i) + ((hash << 5) - hash);
                }
                const lat = ((hash % 180) - 90) * 0.5; // Stay within -45 to 45 for better visibility
                const lon = (hash % 360) - 180;
                coords = [lat, lon];
            }

            const existing = locationMap.get(normalizedPlace);
            const personData = {
                id: person.id,
                name: `${person.firstName} ${person.lastName}`.trim(),
                type,
                photoUrl: person.photoUrl
            };

            if (existing) {
                // Avoid duplicates for same person at same place
                if (!existing.people.some(p => p.id === person.id && p.type === type)) {
                    existing.people.push(personData);
                }
            } else {
                locationMap.set(normalizedPlace, {
                    id: normalizedPlace,
                    name: normalizedPlace,
                    latitude: coords[0],
                    longitude: coords[1],
                    people: [personData]
                });
            }
        };

        Object.values(people).forEach(person => {
            if (person.isPrivate) return;

            addLocation(person.birthPlace, person, 'birth');
            addLocation(person.deathPlace, person, 'death');
            person.events?.forEach(event => {
                if (event.place) addLocation(event.place, person, 'event');
            });
        });

        return Array.from(locationMap.values());
    }, [people]);
};
