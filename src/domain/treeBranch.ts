import { Person } from '../types';

const getFatherId = (
    people: Record<string, Person>,
    person: Person | undefined
): string | undefined => {
    const parentIds = person?.parents ?? [];
    return parentIds.find((parentId) => people[parentId]?.gender === 'male') ?? parentIds[0];
};

/**
 * Calculates a set of IDs representing a highlighted branch starting from a root node.
 * Includes all descendants and spouses of those descendants, plus the direct
 * paternal lineage above the root. The root's mother and father are included,
 * then traversal continues through the father's side only. Spouses are
 * highlighted but are not used as traversal roots, so their unrelated
 * ancestors/branches stay outside the set.
 */
export function calculateHighlightedPath(
    people: Record<string, Person>,
    rootId: string | undefined
): Set<string> | undefined {
    if (!rootId || !people[rootId]) return undefined;

    const branch = new Set<string>();
    const stack = [rootId];
    const rootPerson = people[rootId];
    let paternalCursorId: string | undefined = getFatherId(people, rootPerson);

    rootPerson.parents?.forEach((parentId) => {
        if (people[parentId]) branch.add(parentId);
    });

    while (paternalCursorId) {
        const father = people[paternalCursorId];
        if (!father) break;

        father.parents?.forEach((parentId) => {
            if (people[parentId]) branch.add(parentId);
        });
        paternalCursorId = getFatherId(people, father);
    }

    while (stack.length > 0) {
        const id = stack.pop()!;
        if (branch.has(id)) continue;
        branch.add(id);

        const p = people[id];
        if (p) {
            if (p.children) stack.push(...p.children);
            if (p.spouses) {
                p.spouses.forEach((spouseId) => {
                    if (people[spouseId]) branch.add(spouseId);
                });
            }
        }
    }
    return branch;
}
