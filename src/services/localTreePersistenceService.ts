import type { Person } from '../types';
import { throttle } from '../utils/throttle';
import { storageService } from './storageService';

const SAVE_FULL_TREE_THROTTLE_MS = 3000;

const throttledSaveFullTree = throttle((people: Record<string, Person>) => {
    if (Object.keys(people).length === 0) return;
    void storageService.saveFullTree(people).catch((error) => {
        console.error('Auto-save failed', error);
    });
}, SAVE_FULL_TREE_THROTTLE_MS);

export const localTreePersistenceService = {
    scheduleFullTreeSave(people: Record<string, Person>) {
        throttledSaveFullTree(people);
    },
};
