import { Person } from '../types';

/**
 * Iterative DFS to detect circular references in the family tree.
 * A person cannot be their own ancestor.
 */
function findCircularReferences(people: Record<string, Person>): Record<string, string[]> {
    const errors: Record<string, string[]> = {};
    const visited = new Set<string>();

    for (const personId of Object.keys(people)) {
        if (visited.has(personId)) continue;

        // Iterative DFS stack: [currentId, pathSet]
        const stack: Array<{ id: string; path: Set<string> }> = [{ id: personId, path: new Set() }];

        while (stack.length > 0) {
            const { id, path } = stack.pop()!;

            if (path.has(id)) {
                // Cycle detected
                if (!errors[id]) errors[id] = [];
                errors[id].push('Circular reference detected (ancestor of self)');
                continue;
            }

            if (visited.has(id)) continue;
            visited.add(id);

            const person = people[id];
            if (!person) continue;

            const nextPath = new Set(path);
            nextPath.add(id);

            // Add parents to stack (to check ancestors)
            if (person.parents) {
                for (const parentId of person.parents) {
                    stack.push({ id: parentId, path: nextPath });
                }
            }
        }
    }
    return errors;
}

/**
 * Validates temporal and biological logic.
 */
function validateLogic(people: Record<string, Person>, errors: Record<string, string[]>) {
    for (const [id, person] of Object.entries(people)) {
        const personErrors: string[] = errors[id] || [];

        // 1. Temporal Logic: Death before Birth
        if (person.birthDate && person.deathDate) {
            const birth = new Date(person.birthDate);
            const death = new Date(person.deathDate);
            if (death < birth) {
                personErrors.push('Death date cannot be before birth date');
            }
        }

        // 2. Biological Logic: Parent age at birth
        if (person.parents && person.birthDate) {
            for (const parentId of person.parents) {
                const parent = people[parentId];
                if (parent && parent.birthDate) {
                    const pBirth = new Date(parent.birthDate).getFullYear();
                    const cBirth = new Date(person.birthDate).getFullYear();
                    const ageAtBirth = cBirth - pBirth;

                    if (ageAtBirth < 14) {
                        personErrors.push(`Parent (ID: ${parentId}) was too young at node's birth (${ageAtBirth} years)`);
                    } else if (ageAtBirth > 100) {
                        personErrors.push(`Parent (ID: ${parentId}) was too old at node's birth (${ageAtBirth} years)`);
                    }
                }
            }
        }

        if (personErrors.length > 0) {
            errors[id] = personErrors;
        }
    }
}

self.onmessage = (e: MessageEvent) => {
    const { people } = e.data;
    if (!people) return;

    try {
        // Run validations
        const errors = findCircularReferences(people);
        validateLogic(people, errors);

        self.postMessage({ type: 'success', errors });
    } catch (error) {
        self.postMessage({ type: 'error', error: String(error) });
    }
};
