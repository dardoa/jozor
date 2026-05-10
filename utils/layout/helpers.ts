import { Person } from '../../types';
import { getDisplayDate } from '../familyLogic';

export const findRootAncestor = (people: Record<string, Person>, startId: string): string => {
    let currentId = startId;
    const visited = new Set<string>();
    let depth = 0;
    while (depth < 50) {
        if (visited.has(currentId)) break;
        visited.add(currentId);
        const person = people[currentId];
        if (!person || person.parents.length === 0) break;

        // Only traverse to a parent that exists in the current people map.
        // This prevents returning a missing ID (dangling parent reference), which would null out layout.
        const nextParentId = person.parents.find((pid) => !!people[pid]);
        if (!nextParentId) break;

        currentId = nextParentId;
        depth++;
    }
    return currentId;
};

export const getBirthYear = (p: Person): number => {
    if (!p.birthDate) return 9999;
    const y = parseInt(getDisplayDate(p.birthDate));
    return isNaN(y) ? 9999 : y;
};
