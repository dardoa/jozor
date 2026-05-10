import { bulkUpsertPeople, createTree } from './supabaseTreeMutationService';
import { showToast } from '../utils/showToast';
import { logError } from '../utils/errorLogger';
import { Person } from '../types';

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
        onSuccess: (newTreeId: string) => void
    ): Promise<void> {
        console.warn(`[treeMigrationService] Migrating invalid Tree ID "${oldTreeId}" to cloud.`);
        
        const baseName = email.split('@')[0] || 'My';
        const treeName = `${baseName}'s Family Tree`;

        try {
            // 1. Create the tree in Supabase
            const createdId = await createTree(uid, email, treeName, token);
            console.warn(`[treeMigrationService] Migrated tree created. Old: ${oldTreeId}, New: ${createdId}`);
            
            // 2. Callback to update local state immediately
            onSuccess(createdId);

            // 3. Force push all people to the new tree
            const peopleList = Object.values(people);
            if (peopleList.length > 0) {
                try {
                    await bulkUpsertPeople(createdId, uid, peopleList, email, token);
                    console.warn('[treeMigrationService] Migration data sync complete.');
                    showToast.error('Your local tree has been migrated to the cloud.', { duration: 5000 });
                } catch (err) {
                    logError('SYNC_MIGRATION_BULK_UPSERT_FAILED', err, { 
                        showToast: true, 
                        toastMessage: 'Migration failed. Please verify your connection.' 
                    });
                }
            }
        } catch (err) {
            logError('SYNC_MIGRATION_CREATE_TREE_ERROR', err, { showToast: false });
        }
    }
};
