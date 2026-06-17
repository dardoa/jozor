import { TreeCommand, CommandContext } from './types';
import { MutationActionResult } from '../types';
import { executeCommandSync } from '../utils/syncUtils';

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

            const syncResult = await executeCommandSync({
                treeId,
                operationType: 'DELETE_RELATION',
                errorPrefix: 'Failed to sync DELETE_RELATION via DeltaSync:',
                fallbackErrorMessage: 'The relationship was removed locally, but sync failed.',
                syncAction: async () => {
                    const queued = await context.syncService.pushOperation(treeId!, 'DELETE_RELATION', {
                        targetId: this.targetId,
                        relativeId: this.relativeId,
                        type: this.type
                    });
                    if (queued === false) {
                        return { success: false, error: 'The relationship was removed locally, but could not be queued for sync.' };
                    }
                     
                    void context.activityService.logAction(treeId!, 'DELETE_RELATION', {
                        targetId: this.targetId,
                        relativeId: this.relativeId,
                        type: this.type,
                        targetName: `${preDeletePeople[this.targetId]?.firstName} ${preDeletePeople[this.targetId]?.lastName}`.trim(),
                        relativeName: `${preDeletePeople[this.relativeId]?.firstName} ${preDeletePeople[this.relativeId]?.lastName}`.trim()
                    });
                }
            });
            if (!syncResult.success) {
                return syncResult;
            }
        }

        return { success: true };
    }
}
