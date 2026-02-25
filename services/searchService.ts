import Fuse from 'fuse.js';
import { Person } from '../types';

let fuse: Fuse<Person> | null = null;

const FUSE_OPTIONS = {
    threshold: 0.35,
    distance: 100,
    ignoreLocation: true,
    keys: [
        { name: 'firstName', weight: 0.4 },
        { name: 'lastName', weight: 0.3 },
        { name: 'birthPlace', weight: 0.2 },
        { name: 'notes', weight: 0.1 }
    ]
};

export const searchService = {
    /**
     * Re-indexes the people dictionary for fuzzy search.
     */
    updateSearchIndex(people: Person[]) {
        console.log(`[SearchService] 🔍 Re-indexing ${people.length} nodes...`);
        fuse = new Fuse(people, FUSE_OPTIONS);
    },

    /**
     * Performs a fuzzy search query.
     */
    search(query: string, limit = 10): Person[] {
        if (!fuse || !query.trim()) return [];

        const results = fuse.search(query);
        return results.slice(0, limit).map(r => r.item);
    }
};
