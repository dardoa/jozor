import { Person } from '../types';

/**
 * Calculates a set of IDs representing a highlighted branch starting from a root node.
 * Includes all descendants and spouses of those descendants.
 */
export function calculateHighlightedPath(
    people: Record<string, Person>,
    rootId: string | undefined
): Set<string> | undefined {
    if (!rootId || !people[rootId]) return undefined;

    const branch = new Set<string>();
    const stack = [rootId];

    while (stack.length > 0) {
        const id = stack.pop()!;
        if (branch.has(id)) continue;
        branch.add(id);

        const p = people[id];
        if (p) {
            if (p.children) stack.push(...p.children);
            if (p.spouses) stack.push(...p.spouses);
        }
    }
    return branch;
}
