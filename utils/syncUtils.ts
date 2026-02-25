import { Person } from '../types';
import { DeltaOperation } from '../services/deltaSyncService';
import { validatePerson } from './familyLogic';

/**
 * Applies a single operation to a people map and returns the UPDATED map.
 * Pure function: Does not mutate the input map directly, returns a new shallow copy if changed.
 */
export const applyOperationToMap = (people: Record<string, Person>, op: DeltaOperation): Record<string, Person> | null => {
    try {
        const { type, payload } = op;
        const newPeople = { ...people };

        switch (type) {
            case 'UPDATE_PROP': {
                const { id, updates } = payload;
                if (newPeople[id]) {
                    newPeople[id] = validatePerson({ ...newPeople[id], ...updates });
                }
                break;
            }
            case 'ADD_NODE': {
                const { person, relativeId, type: addType } = payload;
                if (!person || !person.id) return null;

                newPeople[person.id] = person;

                if (relativeId && newPeople[relativeId]) {
                    const relative = { ...newPeople[relativeId] };
                    if (addType === 'parent') {
                        // New person is parent OF relative
                        if (!relative.parents) relative.parents = [];
                        if (!relative.parents.includes(person.id)) relative.parents.push(person.id);
                    } else if (addType === 'child') {
                        // New person is child OF relative
                        if (!relative.children) relative.children = [];
                        if (!relative.children.includes(person.id)) relative.children.push(person.id);
                    } else if (addType === 'spouse') {
                        // New person is spouse OF relative
                        if (!relative.spouses) relative.spouses = [];
                        if (!relative.spouses.includes(person.id)) relative.spouses.push(person.id);
                    }
                    newPeople[relativeId] = relative;
                }
                break;
            }
            case 'DELETE_NODE': {
                const { id } = payload;
                delete newPeople[id];
                // Clean up references in other nodes
                Object.keys(newPeople).forEach(pid => {
                    const p = { ...newPeople[pid] };
                    let changed = false;
                    if (p.parents?.includes(id)) { p.parents = p.parents.filter(x => x !== id); changed = true; }
                    if (p.children?.includes(id)) { p.children = p.children.filter(x => x !== id); changed = true; }
                    if (p.spouses?.includes(id)) { p.spouses = p.spouses.filter(x => x !== id); changed = true; }
                    if (changed) newPeople[pid] = p;
                });
                break;
            }
            case 'ADD_RELATION': {
                const { focusId, existingId, type: relType } = payload;
                if (newPeople[focusId] && newPeople[existingId]) {
                    const personA = { ...newPeople[focusId] };
                    const personB = { ...newPeople[existingId] };

                    if (relType === 'parent') {
                        if (!personA.parents) personA.parents = [];
                        if (!personA.parents.includes(existingId)) personA.parents.push(existingId);
                        if (!personB.children) personB.children = [];
                        if (!personB.children.includes(focusId)) personB.children.push(focusId);
                    } else if (relType === 'child') {
                        if (!personA.children) personA.children = [];
                        if (!personA.children.includes(existingId)) personA.children.push(existingId);
                        if (!personB.parents) personB.parents = [];
                        if (!personB.parents.includes(focusId)) personB.parents.push(focusId);
                    } else if (relType === 'spouse') {
                        if (!personA.spouses) personA.spouses = [];
                        if (!personA.spouses.includes(existingId)) personA.spouses.push(existingId);
                        if (!personB.spouses) personB.spouses = [];
                        if (!personB.spouses.includes(focusId)) personB.spouses.push(focusId);
                    }
                    newPeople[focusId] = personA;
                    newPeople[existingId] = personB;
                }
                break;
            }
            case 'DELETE_RELATION': {
                const { targetId, relativeId, type: relType } = payload;
                if (newPeople[targetId]) {
                    const p = { ...newPeople[targetId] };
                    if (relType === 'parent') p.parents = p.parents?.filter(x => x !== relativeId);
                    if (relType === 'child') p.children = p.children?.filter(x => x !== relativeId);
                    if (relType === 'spouse') p.spouses = p.spouses?.filter(x => x !== relativeId);
                    newPeople[targetId] = p;
                }
                if (newPeople[relativeId]) {
                    const p = { ...newPeople[relativeId] };
                    if (relType === 'parent') p.children = p.children?.filter(x => x !== targetId);
                    if (relType === 'child') p.parents = p.parents?.filter(x => x !== targetId);
                    if (relType === 'spouse') p.spouses = p.spouses?.filter(x => x !== targetId);
                    newPeople[relativeId] = p;
                }
                break;
            }
        }
        return newPeople;
    } catch (e) {
        console.error('[SyncUtils] Failed to apply operation:', e);
        return null;
    }
};
