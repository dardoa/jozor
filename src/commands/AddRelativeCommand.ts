import { TreeCommand, CommandContext } from './types';
import { MutationActionResult, Person } from '../types';
import { checkPersonSuggestions, describeSmartCheckIssue } from '../domain/smartChecker';
import { showToast } from '../utils/showToast';
import { validatePerson } from '../utils/familyLogic';
import { executeCommandSync } from '../utils/syncUtils';

export type RelativeType = 'parent' | 'spouse' | 'child';

export class AddRelativeCommand implements TreeCommand {
    constructor(
        private readonly type: RelativeType,
        private readonly gender: 'male' | 'female',
        private readonly relatedPersonId?: string,
        private readonly bypassSync: boolean = false,
        private readonly targetPersonId?: string,
        private readonly initialUpdates?: Partial<Person>
    ) {}

    public async execute(context: CommandContext): Promise<MutationActionResult> {
        const store = context.getState();
        const focusId = this.targetPersonId
            || (this.type === 'spouse' && this.relatedPersonId
            ? this.relatedPersonId
            : store.focusId);
        const previousPeople = store.people;
        const previousFocusId = store.focusId;

        const rollback = () => {
            const rollbackStore = context.getState();
            rollbackStore.setPeople(previousPeople, false);
            rollbackStore.setFocusId(previousFocusId);
        };

        // 1. Pure Mutation in Store
        let res;
        switch (this.type) {
            case 'parent':
                res = store.addParent(this.gender, this.bypassSync, this.relatedPersonId, focusId);
                break;
            case 'spouse':
                res = store.addSpouse(this.gender, this.bypassSync, this.relatedPersonId);
                break;
            case 'child':
                res = store.addChild(this.gender, this.bypassSync, this.relatedPersonId, focusId);
                break;
        }

        if (!res) {
            return { success: false, error: `Unable to add ${this.type}.` };
        }

        // Fetch fresh state after mutation
        const freshStore = context.getState();
        const { newId } = res;
        let newPerson = freshStore.people[newId];

        if (newPerson && this.initialUpdates && Object.keys(this.initialUpdates).length > 0) {
            newPerson = validatePerson({
                ...newPerson,
                ...this.initialUpdates,
            });
            freshStore.setPeople({
                ...freshStore.people,
                [newId]: newPerson,
            }, false);
        }

        // 2. Sync and Side Effects
        if (!this.bypassSync) {
            const treeId = freshStore.currentTreeId;
            const syncResult = await executeCommandSync({
                treeId,
                operationType: 'ADD_NODE',
                errorPrefix: `Failed to sync ${this.type} via DeltaSync:`,
                fallbackErrorMessage: `The ${this.type} was added locally, but sync failed.`,
                rollback,
                syncAction: async () => {
                    // PUSH: ADD_NODE
                    // The applier on other clients will add the node AND the relationship to focusId
                    const nodeQueued = await context.syncService.pushOperation(treeId!, 'ADD_NODE', { 
                        person: newPerson, 
                        relativeId: focusId, 
                        type: this.type 
                    });
                    if (nodeQueued === false) {
                        return { success: false, error: `The ${this.type} was added locally, but could not be queued for sync.` };
                    }

                    // Handle complex rules (like spouses/co-parents) that need extra relations
                    const { resolveSpouseForNewParent, resolveCoParentForNewChild } = await import('../domain/relationshipRules');
                    
                    if (this.type === 'parent') {
                        const spouseId = resolveSpouseForNewParent(newPerson, this.relatedPersonId);
                        if (spouseId) {
                            const relationQueued = await context.syncService.pushOperation(treeId!, 'ADD_RELATION', {
                                focusId: newId,
                                existingId: spouseId,
                                type: 'spouse'
                            });
                            if (relationQueued === false) {
                                return { success: false, error: 'The relationship was added locally, but could not be queued for sync.' };
                            }
                        }
                    } else if (this.type === 'child') {
                        const coParentId = resolveCoParentForNewChild(newPerson, focusId, this.relatedPersonId);
                        if (coParentId) {
                            const relationQueued = await context.syncService.pushOperation(treeId!, 'ADD_RELATION', {
                                focusId: coParentId,
                                existingId: newId,
                                type: 'child'
                            });
                            if (relationQueued === false) {
                                return { success: false, error: 'The relationship was added locally, but could not be queued for sync.' };
                            }
                        }
                    }

                    // Activity Logging (Local & Remote)
                    void context.activityService.logAction(treeId!, 'ADD_PERSON', {
                        personId: newPerson.id,
                        personName: `${newPerson.firstName} ${newPerson.lastName}`.trim(),
                        type: this.type,
                        relativeId: focusId,
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
