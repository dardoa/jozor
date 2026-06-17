import { TreeCommand, CommandContext } from './types';
import { MutationActionResult } from '../types';
import { checkPersonSuggestions, describeSmartCheckIssue } from '../domain/smartChecker';
import { showToast } from '../utils/showToast';
import { executeCommandSync } from '../utils/syncUtils';

export class AddFirstPersonCommand implements TreeCommand {
    constructor(
        private readonly gender: 'male' | 'female',
        private readonly bypassSync: boolean = false
    ) {}

    public async execute(context: CommandContext): Promise<MutationActionResult> {
        const store = context.getState();

        // 1. Pure Mutation in Store
        store.addFirstPerson(this.gender);
        
        // Fetch fresh state after mutation
        const freshStore = context.getState();
        const postAddPeople = freshStore.people;
        const newId = freshStore.focusId;
        const newPerson = postAddPeople[newId];

        // 2. Sync and Side Effects
        if (!this.bypassSync && newPerson) {
            const treeId = freshStore.currentTreeId;
            const syncResult = await executeCommandSync({
                treeId,
                operationType: 'ADD_NODE',
                errorPrefix: 'Failed to sync first person via DeltaSync:',
                fallbackErrorMessage: 'The first person was added locally, but sync failed.',
                syncAction: async () => {
                    const queued = await context.syncService.pushOperations(treeId!, [
                        {
                            type: 'ADD_NODE',
                            payload: {
                                person: newPerson,
                                type: 'initial',
                            },
                        },
                        {
                            type: 'SET_TREE_METADATA',
                            payload: {
                                treeMetadata: {
                                    rootId: newPerson.id,
                                    focusId: newPerson.id,
                                },
                            },
                        },
                    ]);
                    if (queued === false) {
                        return { success: false, error: 'The first person was added locally, but could not be queued for sync.' };
                    }

                    void context.activityService.logAction(treeId!, 'ADD_PERSON', {
                        personId: newPerson.id,
                        personName: `${newPerson.firstName} ${newPerson.lastName}`.trim(),
                        type: 'initial',
                    });
                }
            });
            if (!syncResult.success) {
                return syncResult;
            }
        }

        // 3. Post-mutation validation suggestions
        if (newPerson) {
            const suggestions = checkPersonSuggestions(newPerson);
            suggestions.forEach((issue) => {
                const message = describeSmartCheckIssue(issue, freshStore.language, newPerson.firstName);
                const options = { id: `smart-check:${issue.code}:${newId}` };
                
                if (issue.severity === 'error') {
                    showToast.error(message, options);
                } else if (issue.severity === 'warning') {
                    showToast.warning(message, options);
                } else {
                    showToast.info(message, options);
                }
            });
        }

        return { success: true };
    }
}
