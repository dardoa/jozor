import { useEffect, useRef } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { geocodingService } from '../services/geocodingService';
import { Person } from '../../../types';
import { normalizePlaceName } from '../../../domain/placeUtils';

/**
 * Extracts all unique location strings from a Person object.
 */
function extractLocationsFromPerson(person: Person): string[] {
    const places = new Set<string>();

    if (person.birthPlace?.trim()) places.add(person.birthPlace.trim());
    if (person.deathPlace?.trim()) places.add(person.deathPlace.trim());
    if (person.burialPlace?.trim()) places.add(person.burialPlace.trim());
    if (person.residence?.trim()) places.add(person.residence.trim());
    if (person.marriagePlace?.trim()) places.add(person.marriagePlace.trim());

    if (person.events && Array.isArray(person.events)) {
        person.events.forEach(event => {
            if (event.place?.trim()) {
                places.add(event.place.trim());
            }
        });
    }

    if (person.partnerDetails) {
        Object.values(person.partnerDetails).forEach(partnerDetails => {
            if (partnerDetails.startPlace?.trim()) places.add(partnerDetails.startPlace.trim());
            if (partnerDetails.endPlace?.trim()) places.add(partnerDetails.endPlace.trim());
        });
    }

    return Array.from(places);
}

export function useGeocodingSync() {
    const people = useAppStore(state => state.people);
    const locations = useAppStore(state => state.locations);
    const addLocation = useAppStore(state => state.addLocation);

    // Keep track of what we've already queued in this session to avoid infinite loops 
    // or race conditions between state updates
    const queuedPlacesRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        if (!people) return;

        // Collect all places currently used in the tree
        const allUsedPlaces = new Map<string, string>();
        Object.values(people).forEach(person => {
            const places = extractLocationsFromPerson(person);
            places.forEach((place) => {
                const normalizedPlace = normalizePlaceName(place);
                if (normalizedPlace && !allUsedPlaces.has(normalizedPlace)) {
                    allUsedPlaces.set(normalizedPlace, place);
                }
            });
        });

        // Compare against what is already in our locations store
        allUsedPlaces.forEach((placeName, normalizedPlace) => {
            const existingLoc = locations?.[normalizedPlace] ?? locations?.[placeName];
            
            // If it's completely missing, or we never queued it in this session 
            // and it's not pending/resolved/failed
            if (!existingLoc && !queuedPlacesRef.current.has(normalizedPlace)) {
                
                // Mark as queued locally to avoid duplicate triggers while state is updating
                queuedPlacesRef.current.add(normalizedPlace);
                
                // Set to pending in store
                addLocation(normalizedPlace, { status: 'pending', lastChecked: Date.now() });

                // Dispatch to the service
                geocodingService.geocode(placeName).then((result) => {
                    addLocation(normalizedPlace, result);
                }).catch((err) => {
                    // Handled inside the service normally, but fallback just in case
                    console.error('Geocoding sync failed for', placeName, err);
                });
            }
        });

    }, [people, locations, addLocation]); 
    // We listen to `people` so any new additions trigger a check.
    // `locations` helps us know what we already have.
}
