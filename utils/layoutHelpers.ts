import { Person } from '../types';
import { getDisplayDate } from './familyLogic';

/**
 * Optimizes finding the root ancestor by traversing up the parent chain.
 * Prevents infinite loops with a depth limit.
 */
export const findRootAncestor = (people: Record<string, Person>, startId: string): string => {
    let currentId = startId;
    const visited = new Set<string>();
    let depth = 0;
    while (depth < 50) { // Limit depth to prevent infinite loops in case of bad data
        if (visited.has(currentId)) break;
        visited.add(currentId);
        const person = people[currentId];
        if (!person || person.parents.length === 0) break;
        currentId = person.parents[0];
        depth++;
    }
    return currentId;
};

/**
 * Extracts the birth year from a person's birthDate string.
 * Returns 9999 if the date is invalid or missing.
 */
export const getBirthYear = (p: Person): number => {
    if (!p.birthDate) return 9999;
    const y = parseInt(getDisplayDate(p.birthDate));
    return isNaN(y) ? 9999 : y;
};