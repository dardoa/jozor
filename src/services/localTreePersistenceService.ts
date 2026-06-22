import type { Person } from '../types';
import { throttle } from '../utils/throttle';
import { storageService } from './storageService';

const SAVE_FULL_TREE_THROTTLE_MS = 3000;

const throttledSaveFullTree = throttle((people: Record<string, Person>, treeId?: string) => {
    if (Object.keys(people).length === 0) return;
    void storageService.saveFullTree(people, treeId).catch((error) => {
        console.error('Auto-save failed', error);
    });
}, SAVE_FULL_TREE_THROTTLE_MS);

export const localTreePersistenceService = {
    saveChangedPeople(people: Person[]) {
        if (people.length === 0) return;
        void storageService.savePeople(people).catch((error) => {
            console.error('Incremental save failed', error);
        });
    },

    scheduleFullTreeSave(people: Record<string, Person>, treeId?: string) {
        throttledSaveFullTree(people, treeId);
    },
};
