import { useAppStore } from '../../store/useAppStore';
import { toast } from 'sonner';
import { searchService } from '../../services/searchService';
import { localTreePersistenceService } from '../../services/localTreePersistenceService';
import { MutationActionResult, Person } from '../../types';
import { CommandExecutor } from '../../commands/CommandExecutor';
import { UpdatePersonCommand } from '../../commands/UpdatePersonCommand';
import { DeletePersonCommand } from '../../commands/DeletePersonCommand';
import { AddRelativeCommand } from '../../commands/AddRelativeCommand';
import { LinkPersonCommand } from '../../commands/LinkPersonCommand';
import { AddFirstPersonCommand } from '../../commands/AddFirstPersonCommand';
import { RemoveRelationshipCommand } from '../../commands/RemoveRelationshipCommand';

export const useTreeActions = () => {
    const store = useAppStore();

    const setPeople = (people: Record<string, Person>, addToHistory = true) => {
        store.setPeople(people, addToHistory);
        void searchService.updateSearchIndex(Object.values(people));
        localTreePersistenceService.scheduleFullTreeSave(people, store.currentTreeId ?? undefined);
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

    const checkPeopleLimit = (): boolean => {
        const tier = store.subscriptionTier;
        const totalPeople = Object.keys(store.people).length;
        if (tier === 'free' && totalPeople >= 100) {
            toast.error(
                store.language === 'ar'
                    ? 'لقد وصلت إلى الحد الأقصى للباقة المجانية (100 شخص). يرجى الترقية لإضافة المزيد.'
                    : 'You have reached the limit of 100 people for the Free tier. Please upgrade to add more.'
            );
            window.dispatchEvent(new CustomEvent('open-paywall'));
            return false;
        }
        return true;
    };

    const addParent = async (
        gender: 'male' | 'female',
        relatedPersonId?: string,
        bypassSync = false,
        targetPersonId?: string,
        initialUpdates?: Partial<Person>
    ): Promise<MutationActionResult> => {
        if (!checkPeopleLimit()) return { success: false, error: 'Free tier limit reached.' };
        const command = new AddRelativeCommand('parent', gender, relatedPersonId, bypassSync, targetPersonId, initialUpdates);
        return await CommandExecutor.execute(command);
    };

    const addFirstPerson = async (
        gender: 'male' | 'female',
        bypassSync = false
    ): Promise<MutationActionResult> => {
        if (!checkPeopleLimit()) return { success: false, error: 'Free tier limit reached.' };
        const command = new AddFirstPersonCommand(gender, bypassSync);
        return await CommandExecutor.execute(command);
    };

    const addSpouse = async (
        gender: 'male' | 'female',
        relatedPersonId?: string,
        bypassSync = false,
        initialUpdates?: Partial<Person>
    ): Promise<MutationActionResult> => {
        if (!checkPeopleLimit()) return { success: false, error: 'Free tier limit reached.' };
        const command = new AddRelativeCommand('spouse', gender, relatedPersonId, bypassSync, undefined, initialUpdates);
        return await CommandExecutor.execute(command);
    };

    const addChild = async (
        gender: 'male' | 'female',
        relatedPersonId?: string,
        bypassSync = false,
        targetPersonId?: string,
        initialUpdates?: Partial<Person>
    ): Promise<MutationActionResult> => {
        if (!checkPeopleLimit()) return { success: false, error: 'Free tier limit reached.' };
        const command = new AddRelativeCommand('child', gender, relatedPersonId, bypassSync, targetPersonId, initialUpdates);
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
