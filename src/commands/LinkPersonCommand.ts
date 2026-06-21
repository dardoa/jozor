import { TreeCommand, CommandContext } from './types';
import { MutationActionResult } from '../types';
import { checkRelationshipAction, checkRelationshipContext, checkPersonSuggestions, describeSmartCheckIssue } from '../domain/smartChecker';
import { showToast } from '../utils/showToast';
import { executeCommandSync } from '../utils/syncUtils';

export class LinkPersonCommand implements TreeCommand {
    constructor(
        private readonly existingId: string,
        private readonly type: 'parent' | 'spouse' | 'child' | null,
        private readonly relatedPersonId?: string,
        private readonly bypassSync: boolean = false,
        private readonly addToHistory: boolean = true
    ) {}

    public async execute(context: CommandContext): Promise<MutationActionResult> {
        if (!this.type) {
            return { success: false, error: 'Relationship type is required.' };
        }

        const store = context.getState();
        const focusId = store.focusId;
        const preLinkPeople = store.people;
        const preLinkFocusId = store.focusId;
        const rollback = () => {
            const rollbackStore = context.getState();
            rollbackStore.setPeople(preLinkPeople, false);
            rollbackStore.setFocusId(preLinkFocusId);
        };

        // 1. Validation
        const blockingIssues = checkRelationshipAction({
            currentPersonId: focusId,
            existingId: this.existingId,
            relationType: this.type,
            people: preLinkPeople,
        });

        const language = store.language;

        if (blockingIssues.length > 0) {
            blockingIssues.forEach((issue) => {
                const message = describeSmartCheckIssue(issue, language);
                showToast.error(message, { id: `smart-check:${issue.code}:${this.existingId}` });
            });
            return { 
                success: false, 
                error: describeSmartCheckIssue(blockingIssues[0], language) 
            };
        }

        // 2. Pure Mutation in Store
        store.linkPerson(this.existingId, this.type, this.bypassSync, this.addToHistory, this.relatedPersonId);

        // Fetch fresh state after mutation
        const freshStore = context.getState();
        const latestPeople = freshStore.people;

        // 3. Sync and Side Effects
        if (!this.bypassSync) {
            const treeId = freshStore.currentTreeId;

            if (this.type) {
                const syncResult = await executeCommandSync({
                    treeId,
                    operationType: 'ADD_RELATION',
                    errorPrefix: 'Failed to sync ADD_RELATION via DeltaSync:',
                    fallbackErrorMessage: 'The relationship was added locally, but sync failed.',
                    rollback,
                    syncAction: async () => {
                        // PUSH: ADD_RELATION (Primary)
                        const primaryQueued = await context.syncService.pushOperation(treeId!, 'ADD_RELATION', {
                            focusId,
                            existingId: this.existingId,
                            type: this.type!
                        });
                        if (primaryQueued === false) {
                            return { success: false, error: 'The relationship was added locally, but could not be queued for sync.' };
                        }

                        // Handle complex rules (like co-parents)
                        const {
                            resolveOtherParentForLinkedParent,
                            resolveCoParentForLinkedChild
                        } = await import('../domain/relationshipRules');

                        if (this.type === 'parent') {
                            const otherParentId = resolveOtherParentForLinkedParent(preLinkPeople, focusId, this.relatedPersonId);
                            if (otherParentId && otherParentId !== this.existingId) {
                                const relationQueued = await context.syncService.pushOperation(treeId!, 'ADD_RELATION', {
                                    focusId: this.existingId,
                                    existingId: otherParentId,
                                    type: 'spouse'
                                });
                                if (relationQueued === false) {
                                    return { success: false, error: 'The relationship was added locally, but could not be queued for sync.' };
                                }
                            }
                        } else if (this.type === 'child') {
                            const coParentId = resolveCoParentForLinkedChild(preLinkPeople, focusId, this.existingId, this.relatedPersonId);
                            if (coParentId) {
                                const relationQueued = await context.syncService.pushOperation(treeId!, 'ADD_RELATION', {
                                    focusId: coParentId,
                                    existingId: this.existingId,
                                    type: 'child'
                                });
                                if (relationQueued === false) {
                                    return { success: false, error: 'The relationship was added locally, but could not be queued for sync.' };
                                }
                            }
                        }

                        void context.activityService.logAction(treeId!, 'ADD_RELATION', {
                            focusId,
                            existingId: this.existingId,
                            type: this.type!,
                            focusName: `${preLinkPeople[focusId]?.firstName} ${preLinkPeople[focusId]?.lastName}`.trim(),
                            existingName: `${preLinkPeople[this.existingId]?.firstName} ${preLinkPeople[this.existingId]?.lastName}`.trim(),
                        });
                    }
                });
                if (!syncResult.success) {
                    return syncResult;
                }
            }
        }

        // 4. Post-mutation validation suggestions
        const contextualPerson =
            this.type === 'child'
                ? latestPeople[this.existingId]
                : this.type === 'parent'
                    ? latestPeople[focusId]
                    : latestPeople[this.existingId];

        if (contextualPerson) {
            const linkedPerson = latestPeople[this.existingId];
            const issues = [
                ...checkRelationshipContext(contextualPerson, latestPeople),
                ...(linkedPerson ? checkPersonSuggestions(linkedPerson) : []),
            ];

            issues.forEach((issue) => {
                const message = describeSmartCheckIssue(issue, language, contextualPerson.firstName);
                const options = { id: `smart-check:${issue.code}:${issue.personId ?? 'global'}` };
                
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
