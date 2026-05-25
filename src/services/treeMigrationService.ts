import { bulkInsertRelationships, bulkUpsertPeople, createTree } from './supabaseTreeMutationService';
import { showToast } from '../utils/showToast';
import { logError } from '../utils/errorLogger';
import type { Person, TreeSettings } from '../types';

const buildRelationshipsFromPeople = (treeId: string, people: Person[]) => {
    const relationships: {
        tree_id: string;
        person_id: string;
        relative_id: string;
        type: 'parent' | 'child' | 'spouse';
    }[] = [];
    const processedPairs = new Set<string>();

    const addRelationship = (
        personId: string,
        relativeId: string,
        type: 'parent' | 'child' | 'spouse',
        pairKind: 'parent-child' | 'spouse'
    ) => {
        if (!personId || !relativeId || personId === relativeId) return;

        const [first, second] = [personId, relativeId].sort();
        const key = `${first}:${second}:${pairKind}`;
        if (processedPairs.has(key)) return;

        relationships.push({
            tree_id: treeId,
            person_id: personId,
            relative_id: relativeId,
            type,
        });
        processedPairs.add(key);
    };

    people.forEach((person) => {
        (person.parents || []).forEach((parentId) => addRelationship(person.id, parentId, 'parent', 'parent-child'));
        (person.children || []).forEach((childId) => addRelationship(person.id, childId, 'child', 'parent-child'));
        (person.spouses || []).forEach((spouseId) => addRelationship(person.id, spouseId, 'spouse', 'spouse'));
    });

    return relationships;
};

export const treeMigrationService = {
    /**
     * Migrates a local (invalid ID) tree to a proper Supabase cloud tree.
     * Creates the tree and uploads all local people.
     */
    async migrateLocalTreeToCloud(
        uid: string, 
        email: string, 
        token: string | undefined, 
        oldTreeId: string, 
        people: Record<string, Person>,
        onSuccess: (newTreeId: string) => void,
        options?: {
            treeName?: string;
            settings?: Partial<TreeSettings>;
        }
    ): Promise<void> {
        console.warn(`[treeMigrationService] Migrating invalid Tree ID "${oldTreeId}" to cloud.`);
        
        const baseName = email.split('@')[0] || 'My';
        const treeName = options?.treeName?.trim() || `${baseName}'s Family Tree`;

        try {
            // 1. Create the tree in Supabase
            const createdId = await createTree(uid, email, treeName, token, options?.settings);
            console.warn(`[treeMigrationService] Migrated tree created. Old: ${oldTreeId}, New: ${createdId}`);
            
            // 2. Force push all people and relationships to the new tree
            const peopleList = Object.values(people);
            if (peopleList.length > 0) {
                try {
                    await bulkUpsertPeople(createdId, uid, peopleList, email, token);
                    await bulkInsertRelationships(buildRelationshipsFromPeople(createdId, peopleList), uid, email, token);
                    console.warn('[treeMigrationService] Migration data sync complete.');
                    showToast.success('Your local tree has been migrated to the cloud.', { duration: 5000 });
                } catch (err) {
                    logError('SYNC_MIGRATION_BULK_UPSERT_FAILED', err, { 
                        showToast: true, 
                        toastMessage: 'Migration failed. Please verify your connection.' 
                    });
                    return;
                }
            }

            // 3. Update local state only after the cloud copy is complete
            onSuccess(createdId);
        } catch (err) {
            logError('SYNC_MIGRATION_CREATE_TREE_ERROR', err, { showToast: false });
        }
    }
};
