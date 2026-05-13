import { TreeCommand, CommandContext } from './types';
import { MutationActionResult } from '../types';

export class DeletePersonCommand implements TreeCommand {
    constructor(
        private readonly id: string,
        private readonly bypassSync: boolean = false,
        private readonly addToHistory: boolean = true
    ) {}

    public async execute(context: CommandContext): Promise<MutationActionResult> {
        const store = context.getState();
        const preDeletePeople = store.people;
        const preDeleteFocusId = store.focusId;
        const personToDelete = preDeletePeople[this.id];
        
        if (!personToDelete) {
            return { success: false, error: 'Person not found.' };
        }

        // 1. Pure Mutation in Store
        try {
            store.deletePerson(this.id, this.bypassSync, this.addToHistory);
        } catch (error) {
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Unable to delete person.' 
            };
        }

        // Fetch fresh state after mutation
        const freshStore = context.getState();
        const postDeletePeople = freshStore.people;
        
        if (preDeletePeople === postDeletePeople || postDeletePeople[this.id]) {
            return { success: false, error: 'Person was not removed from the tree.' };
        }

        const rollback = () => {
            const rollbackStore = context.getState();
            rollbackStore.deletedPersonIds?.delete(this.id);
            rollbackStore.setPeople(preDeletePeople, false);
            rollbackStore.setFocusId(preDeleteFocusId);
        };

        // 2. Storage clean-up
        try {
            await context.storageService.deletePerson(this.id);
        } catch (error) {
            rollback();
            return {
                success: false,
                error: error instanceof Error ? error.message : 'The person was deleted locally, but local storage cleanup failed.',
            };
        }

        // 3. Sync and Side Effects
        if (!this.bypassSync) {
            const treeId = freshStore.currentTreeId;

            if (treeId) {
                try {
                    const queued = await context.syncService.pushOperation(treeId, 'DELETE_NODE', { id: this.id });
                    if (queued === false) {
                        rollback();
                        return { success: false, error: 'The person was deleted locally, but could not be queued for sync.' };
                    }
                    
                    void context.activityService.logAction(treeId, 'DELETE_PERSON', {
                        personId: this.id,
                        personName: `${personToDelete.firstName} ${personToDelete.lastName}`.trim(),
                    });
                } catch (error) {
                    console.error('Failed to sync DELETE_NODE via DeltaSync:', error);
                    rollback();
                    return {
                        success: false,
                        error: error instanceof Error ? error.message : 'The person was deleted locally, but sync failed.',
                    };
                }
            } else {
                console.warn('DeltaSync: Skip pushOperation (DELETE_NODE) - currentTreeId is missing');
            }
        }

        return { success: true };
    }
}
