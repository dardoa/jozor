import { TreeCommand, CommandContext } from './types';
import { MutationActionResult } from '../types';

export class RemoveRelationshipCommand implements TreeCommand {
    constructor(
        private readonly targetId: string,
        private readonly relativeId: string,
        private readonly type: 'parent' | 'spouse' | 'child',
        private readonly bypassSync: boolean = false,
        private readonly addToHistory: boolean = true
    ) {}

    public async execute(context: CommandContext): Promise<MutationActionResult> {
        const store = context.getState();
        const preDeletePeople = store.people;

        // 1. Pure Mutation in Store
        store.removeRelationship(this.targetId, this.relativeId, this.type, this.bypassSync, this.addToHistory);

        // Fetch fresh state after mutation
        const freshStore = context.getState();

        // 2. Sync and Side Effects
        if (!this.bypassSync) {
            const treeId = freshStore.currentTreeId;

            if (treeId) {
                try {
                    const queued = await context.syncService.pushOperation(treeId, 'DELETE_RELATION', {
                        targetId: this.targetId,
                        relativeId: this.relativeId,
                        type: this.type
                    });
                    if (queued === false) {
                        return { success: false, error: 'The relationship was removed locally, but could not be queued for sync.' };
                    }
                     
                    void context.activityService.logAction(treeId, 'DELETE_RELATION', {
                        targetId: this.targetId,
                        relativeId: this.relativeId,
                        type: this.type,
                        targetName: `${preDeletePeople[this.targetId]?.firstName} ${preDeletePeople[this.targetId]?.lastName}`.trim(),
                        relativeName: `${preDeletePeople[this.relativeId]?.firstName} ${preDeletePeople[this.relativeId]?.lastName}`.trim()
                    });
                } catch (error) {
                    console.error('Failed to sync DELETE_RELATION via DeltaSync:', error);
                    return {
                        success: false,
                        error: error instanceof Error ? error.message : 'The relationship was removed locally, but sync failed.',
                    };
                }
            } else {
                console.warn('DeltaSync: Skip pushOperation (DELETE_RELATION) - currentTreeId is missing');
            }
        }

        return { success: true };
    }
}
