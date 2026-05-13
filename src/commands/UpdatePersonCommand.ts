import { TreeCommand, CommandContext } from './types';
import { MutationActionResult, Person } from '../types';
import { checkVitalDateConsistency, checkRelationshipContext, describeSmartCheckIssue } from '../domain/smartChecker';
import { showToast } from '../utils/showToast';

export class UpdatePersonCommand implements TreeCommand {
    constructor(
        private readonly id: string,
        private readonly updates: Partial<Person>,
        private readonly bypassSync: boolean = false,
        private readonly addToHistory: boolean = true
    ) {}

    public async execute(context: CommandContext): Promise<MutationActionResult> {
        const store = context.getState();
        const currentPeople = store.people;
        const currentPerson = currentPeople[this.id];
        const previousPerson = currentPerson;

        if (!currentPerson) {
            return { success: false, error: 'Person not found.' };
        }

        // 1. Validation
        const nextPerson = { ...currentPerson, ...this.updates };
        const blockingIssues = checkVitalDateConsistency(nextPerson);
        const language = store.language;

        if (blockingIssues.length > 0) {
            blockingIssues.forEach((issue) => {
                const message = describeSmartCheckIssue(issue, language, nextPerson.firstName);
                showToast.error(message, { id: `smart-check:${issue.code}:${this.id}` });
            });
            return {
                success: false,
                error: describeSmartCheckIssue(blockingIssues[0], language, nextPerson.firstName)
            };
        }

        // 2. Pure Mutation in Store
        store.updatePerson(this.id, this.updates, this.bypassSync, this.addToHistory);

        // Fetch fresh state after mutation
        const freshStore = context.getState();
        const latestPeople = freshStore.people;
        const updatedPerson = latestPeople[this.id];

        // 3. Sync and Side Effects
        if (!this.bypassSync && updatedPerson) {
            const treeId = freshStore.currentTreeId;
            if (treeId) {
                const queued = await context.syncService.debouncedPush(treeId, this.id, this.updates);
                if (queued === false) {
                    context.getState().updatePerson(this.id, previousPerson, true, false);
                    return { success: false, error: 'The change was applied locally, but could not be queued for sync.' };
                }
            } else {
                console.warn('DeltaSync: Skip pushOperation (UPDATE_PROP) - currentTreeId is missing');
            }
        }

        // 4. Post-mutation relationship validation
        if (updatedPerson) {
            const relationshipIssues = checkRelationshipContext(updatedPerson, latestPeople);
            relationshipIssues.forEach((issue) => {
                const message = describeSmartCheckIssue(issue, language, updatedPerson.firstName);
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
