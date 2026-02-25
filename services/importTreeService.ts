import { createTree, bulkUpsertPeople, bulkInsertRelationships } from './supabaseTreeService';
import type { FullState, Person } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Validates the imported JSON structure.
 * @param data - The parsed JSON data.
 * @returns True if valid, throws error otherwise.
 */
const validateImportData = (data: any): boolean => {
    if (!data || typeof data !== 'object') {
        throw new Error('Invalid JSON format: Root must be an object.');
    }
    // Check if it's the wrapped format { people: ... } or the direct format { "id": Person ... }
    if (data.people && typeof data.people === 'object') {
        return true;
    }

    // Check if it looks like a dictionary of people (keys are IDs, values are objects)
    const keys = Object.keys(data);
    if (keys.length > 0) {
        const firstSample = data[keys[0]];
        if (firstSample && typeof firstSample === 'object' && 'id' in firstSample && 'firstName' in firstSample) {
            return true;
        }
    }

    // Empty object is valid technically but useless
    if (keys.length === 0) return true;

    throw new Error('Invalid JSON format: Missing "people" object or compatible structure.');
};

/**
 * Imports a family tree from a JSON object.
 * @param ownerId - The owner's User ID.
 * @param file - The JSON file to import.
 * @returns The new tree ID.
 */
export const importTreeFromJSONItem = async (
    ownerId: string,
    userEmail: string,
    jsonContent: string,
    token?: string
): Promise<string> => {
    let data: any;
    try {
        data = JSON.parse(jsonContent);
    } catch (e) {
        console.error('JSON Parse Error:', e);
        throw new Error('Invalid JSON file.');
    }

    console.log('Importing tree data structure verified...');

    // Determine structure
    let peopleMap: Record<string, Person>;

    if (data.people && typeof data.people === 'object') {
        peopleMap = data.people;
    } else if (validateImportData(data)) {
        // It IS the map
        peopleMap = data;
    } else {
        console.error('Validation failed for data:', data);
        throw new Error('Invalid tree data structure.');
    }

    const peopleArray = Object.values(peopleMap);

    if (peopleArray.length === 0) {
        throw new Error('The imported tree contains no people.');
    }

    // 1. Create the new tree
    const treeName = `Imported Tree ${new Date().toLocaleDateString()}`;
    const treeId = await createTree(ownerId, userEmail, treeName, token);

    // 2. Prepare people for bulk insert
    // ALWAYS generate new IDs when importing as a new tree to prevent ID collisions
    // with existing trees or "stealing" rows if IDs already exist.
    const idMap: Record<string, string> = {};

    // Create new UUIDs for every person
    peopleArray.forEach(p => {
        idMap[p.id] = uuidv4();
    });

    // Remap people and their relationships in memory
    console.log(`Remapping ${peopleArray.length} people...`);
    const finalPeople = peopleArray.map(p => ({
        ...p,
        id: idMap[p.id],
        firstName: p.firstName || 'Unknown',
        lastName: p.lastName || '',
        gender: p.gender || 'male',
        parents: (p.parents || []).map(id => idMap[id]).filter(Boolean),
        children: (p.children || []).map(id => idMap[id]).filter(Boolean),
        spouses: (p.spouses || []).map(id => idMap[id]).filter(Boolean),
    }));

    // 3. Bulk Insert People
    await bulkUpsertPeople(treeId, ownerId, finalPeople, userEmail, token);

    // 4. Extract and Deduplicate Relationships
    const relationships: {
        tree_id: string;
        person_id: string;
        relative_id: string;
        type: 'parent' | 'child' | 'spouse';
    }[] = [];

    const processedPairs = new Set<string>();

    const addRel = (id1: string, id2: string, type: 'parent' | 'child' | 'spouse', originalType: 'parent' | 'child' | 'spouse') => {
        if (!id1 || !id2) return;

        // Sort IDs to create a unique key for the pair
        const [p1, p2] = [id1, id2].sort();

        const key = type === 'spouse'
            ? `${p1}-${p2}-spouse`
            : `${p1}-${p2}-parent-child`;

        if (processedPairs.has(key)) return;

        relationships.push({
            tree_id: treeId,
            person_id: id1,
            relative_id: id2,
            type: originalType
        });
        processedPairs.add(key);
    };

    finalPeople.forEach((p) => {
        // Person P is the PARENT of childId -> relation type is 'child'
        (p.children || []).forEach((childId) => {
            addRel(p.id, childId, 'child', 'child');
        });

        // Person P is the CHILD of parentId -> relation type is 'parent'
        (p.parents || []).forEach((parentId) => {
            addRel(p.id, parentId, 'parent', 'parent');
        });

        (p.spouses || []).forEach((spouseId) => {
            addRel(p.id, spouseId, 'spouse', 'spouse');
        });
    });

    // 5. Bulk Insert Relationships
    console.log(`Inserting ${relationships.length} relationships...`);
    await bulkInsertRelationships(relationships, ownerId, userEmail, token);

    console.log('Import successful. Tree ID:', treeId);
    return treeId;
};
