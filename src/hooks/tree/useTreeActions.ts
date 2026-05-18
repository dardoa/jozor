import { useAppStore } from '../../store/useAppStore';
import { storageService } from '../../services/storageService';
import { searchService } from '../../services/searchService';
import { MutationActionResult, Person } from '../../types';
import { throttle } from '../../utils/throttle';
import { CommandExecutor } from '../../commands/CommandExecutor';
import { UpdatePersonCommand } from '../../commands/UpdatePersonCommand';
import { DeletePersonCommand } from '../../commands/DeletePersonCommand';
import { AddRelativeCommand } from '../../commands/AddRelativeCommand';
import { LinkPersonCommand } from '../../commands/LinkPersonCommand';
import { AddFirstPersonCommand } from '../../commands/AddFirstPersonCommand';
import { RemoveRelationshipCommand } from '../../commands/RemoveRelationshipCommand';

// Throttled persister to avoid excessive IndexedDB writes when the tree changes frequently.
const throttledSaveLocal = throttle((people: Record<string, Person>) => {
    if (Object.keys(people).length === 0) return;
    void storageService.saveFullTree(people).catch((e) => console.error('Auto-save failed', e));
}, 3000);

export const useTreeActions = () => {
    const store = useAppStore();

    const setPeople = (people: Record<string, Person>, addToHistory = true) => {
        store.setPeople(people, addToHistory);
        void searchService.updateSearchIndex(Object.values(people));
        throttledSaveLocal(people);
    };

    const updatePerson = async (
        id: string,
        updates: Partial<Person>,
        bypassSync = false,
        addToHistory = true
    ): Promise<MutationActionResult> => {
        const command = new UpdatePersonCommand(id, updates, bypassSync, addToHistory);
        return await CommandExecutor.execute(command);
    };

    const deletePerson = async (
        id: string,
        bypassSync = false,
        addToHistory = true
    ): Promise<MutationActionResult> => {
        const command = new DeletePersonCommand(id, bypassSync, addToHistory);
        return await CommandExecutor.execute(command);
    };

    const addParent = async (
        gender: 'male' | 'female',
        relatedPersonId?: string,
        bypassSync = false,
        targetPersonId?: string
    ): Promise<MutationActionResult> => {
        const command = new AddRelativeCommand('parent', gender, relatedPersonId, bypassSync, targetPersonId);
        return await CommandExecutor.execute(command);
    };

    const addFirstPerson = async (
        gender: 'male' | 'female',
        bypassSync = false
    ): Promise<MutationActionResult> => {
        const command = new AddFirstPersonCommand(gender, bypassSync);
        return await CommandExecutor.execute(command);
    };

    const addSpouse = async (
        gender: 'male' | 'female',
        relatedPersonId?: string,
        bypassSync = false
    ): Promise<MutationActionResult> => {
        const command = new AddRelativeCommand('spouse', gender, relatedPersonId, bypassSync);
        return await CommandExecutor.execute(command);
    };

    const addChild = async (
        gender: 'male' | 'female',
        relatedPersonId?: string,
        bypassSync = false,
        targetPersonId?: string
    ): Promise<MutationActionResult> => {
        const command = new AddRelativeCommand('child', gender, relatedPersonId, bypassSync, targetPersonId);
        return await CommandExecutor.execute(command);
    };

    const removeRelationship = async (
        targetId: string,
        relativeId: string,
        type: 'parent' | 'spouse' | 'child',
        bypassSync = false,
        addToHistory = true
    ): Promise<MutationActionResult> => {
        const command = new RemoveRelationshipCommand(targetId, relativeId, type, bypassSync, addToHistory);
        return await CommandExecutor.execute(command);
    };

    const linkPerson = async (
        existingId: string,
        type: 'parent' | 'spouse' | 'child' | null,
        relatedPersonId?: string,
        bypassSync = false,
        addToHistory = true
    ): Promise<MutationActionResult> => {
        const command = new LinkPersonCommand(existingId, type, relatedPersonId, bypassSync, addToHistory);
        return await CommandExecutor.execute(command);
    };

    return {
        setPeople,
        updatePerson,
        deletePerson,
        addParent,
        addSpouse,
        addChild,
        removeRelationship,
        linkPerson,
        addFirstPerson,
    };
};
