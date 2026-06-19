import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { normalizePlaceName, shortenDisplayName } from '../services/geocodingService';
import { getSupabaseWithAuth } from '../../../services/supabaseClient';
import { authTokenService } from '../../../services/authTokenService';
import { LocationData } from '../../../types';

export interface PlaceSuggestion {
  displayName: string;
  source: 'local' | 'global';
}

const DEBOUNCE_MS = 300;
const MIN_CHARS = 2;

interface CacheRow {
  place_name: string;
  resolved_name: string | null;
  status: string;
}

/**
 * Hook that provides autocomplete suggestions for a place name.
 * Tier 1 (instant): Searches Zustand locations store in-memory.
 * Tier 2 (debounced): After 300ms queries Supabase locations_cache with ilike.
 */
export function usePlaceSuggestions(query: string) {
  const locations = useAppStore((state) => state.locations as Record<string, LocationData>);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isLoadingRemote, setIsLoadingRemote] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (query.length < MIN_CHARS) {
      setSuggestions([]);
      setIsLoadingRemote(false);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      return;
    }

    const normalizedQuery = normalizePlaceName(query);

    // Tier 1: Instant local match
    const localMatches: PlaceSuggestion[] = Object.entries(locations || {})
      .filter(([key, data]) => {
        if (data.status !== 'resolved') return false;
        return (
          normalizePlaceName(key).includes(normalizedQuery) ||
          normalizePlaceName(data.resolvedName || '').includes(normalizedQuery)
        );
      })
      .map(([key, data]) => ({
        displayName: shortenDisplayName(data.resolvedName || key),
        source: 'local' as const,
      }))
      .slice(0, 5);

    setSuggestions(localMatches);

    // Tier 2: Debounced Supabase query
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!isMountedRef.current || requestIdRef.current !== requestId) return;

      setIsLoadingRemote(true);
      try {
        const client = getSupabaseWithAuth('', '', authTokenService.getStoredSupabaseTokenOrUndefined());
        const { data, error } = await client
          .from('locations_cache')
          .select('place_name, resolved_name, status')
          .ilike('place_name', `%${normalizedQuery}%`)
          .eq('status', 'resolved')
          .limit(8);

        if (error || !data) return;
        if (!isMountedRef.current || requestIdRef.current !== requestId) return;

        const rows = data as CacheRow[];
        const localKeys = new Set(localMatches.map(m => normalizePlaceName(m.displayName)));

        const remoteMatches: PlaceSuggestion[] = rows
          .filter(row => !localKeys.has(normalizePlaceName(row.resolved_name || row.place_name)))
          .map(row => ({
            displayName: shortenDisplayName(row.resolved_name || row.place_name),
            source: 'global' as const,
          }));

        setSuggestions(prev => {
          const combined = [...prev.filter(p => p.source === 'local'), ...remoteMatches];
          const seen = new Set<string>();
          return combined.filter(s => {
            const key = normalizePlaceName(s.displayName);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        });
      } catch {
        // Autocomplete is a nice-to-have; silently ignore network errors
      } finally {
        if (isMountedRef.current && requestIdRef.current === requestId) {
          setIsLoadingRemote(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, locations]);

  return { suggestions, isLoadingRemote };
}
