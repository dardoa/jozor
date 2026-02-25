import { useAppStore } from '../store/useAppStore';
import { storageService } from '../services/storageService';
import { deltaSyncService } from '../services/deltaSyncService';
import { activityService } from '../services/activityService';
import { searchService } from '../services/searchService';
import { Person } from '../types';
import { throttle } from '../utils/throttle';

// Throttled persister to avoid excessive IndexedDB writes when the tree changes frequently.
const throttledSaveLocal = throttle((people: Record<string, Person>) => {
    if (Object.keys(people).length === 0) return;
    void storageService.saveFullTree(people).catch((e) => console.error('Auto-save failed', e));
}, 3000);

export const useTreeActions = () => {
    const store = useAppStore();

    // Helper to extract state access
    const getPeople = () => useAppStore.getState().people;
    const getCurrentTreeId = () => useAppStore.getState().currentTreeId;

    const setPeople = (people: Record<string, Person>, addToHistory = true) => {
        store.setPeople(people, addToHistory);
        searchService.updateSearchIndex(Object.values(people));
        throttledSaveLocal(people);
    };

    const updatePerson = (id: string, updates: Partial<Person>, bypassSync = false, addToHistory = true) => {
        // Pure mutation in store
        store.updatePerson(id, updates, bypassSync, addToHistory);

        // Side effects
        throttledSaveLocal(getPeople());

        if (!bypassSync) {
            const treeId = getCurrentTreeId();
            if (treeId) {
                deltaSyncService.debouncedPush(treeId, id, updates);
            } else {
                console.warn('DeltaSync: Skip pushOperation (UPDATE_PROP) - currentTreeId is missing');
            }
        }
    };

    const deletePerson = (id: string, bypassSync = false, addToHistory = true) => {
        const preDeletePeople = getPeople();
        store.deletePerson(id, bypassSync, addToHistory);
        const postDeletePeople = getPeople();

        if (preDeletePeople === postDeletePeople) return; // No change

        throttledSaveLocal(postDeletePeople);

        if (!bypassSync) {
            const treeId = getCurrentTreeId();
            if (treeId) {
                deltaSyncService.pushOperation(treeId, 'DELETE_NODE', { id }).then(success => {
                    if (success) {
                        void activityService.logAction(treeId, 'DELETE_PERSON', {
                            personId: id,
                            personName: `${preDeletePeople[id]?.firstName} ${preDeletePeople[id]?.lastName}`.trim()
                        });
                    }
                });
            } else {
                console.warn('DeltaSync: Skip pushOperation (DELETE_NODE) - currentTreeId is missing');
            }
        }
    };

    const addParent = (gender: 'male' | 'female', bypassSync = false) => {
        const focusId = useAppStore.getState().focusId;
        const res = store.addParent(gender, bypassSync);
        if (!res) return null;

        const { updatedPeople, newId } = res;
        throttledSaveLocal(updatedPeople);

        if (!bypassSync) {
            const treeId = getCurrentTreeId();
            if (treeId) {
                const newPerson = updatedPeople[newId];
                deltaSyncService.pushOperation(treeId, 'ADD_NODE', { person: newPerson, relativeId: focusId, type: 'parent' }).then(success => {
                    if (success) {
                        void activityService.logAction(treeId, 'ADD_PERSON', {
                            personId: newId,
                            personName: `${newPerson.firstName} ${newPerson.lastName}`.trim(),
                            type: 'parent',
                            relativeId: focusId
                        });
                    }
                });
            } else {
                console.warn('DeltaSync: Skip pushOperation (ADD_NODE/parent) - currentTreeId is missing');
            }
        }
        return res;
    };

    const addSpouse = (gender: 'male' | 'female', bypassSync = false) => {
        const focusId = useAppStore.getState().focusId;
        const res = store.addSpouse(gender, bypassSync);
        if (!res) return null;

        const { updatedPeople, newId } = res;
        throttledSaveLocal(updatedPeople);

        if (!bypassSync) {
            const treeId = getCurrentTreeId();
            if (treeId) {
                const newPerson = updatedPeople[newId];
                deltaSyncService.pushOperation(treeId, 'ADD_NODE', { person: newPerson, relativeId: focusId, type: 'spouse' }).then(success => {
                    if (success) {
                        void activityService.logAction(treeId, 'ADD_PERSON', {
                            personId: newId,
                            personName: `${newPerson.firstName} ${newPerson.lastName}`.trim(),
                            type: 'spouse',
                            relativeId: focusId
                        });
                    }
                });
            } else {
                console.warn('DeltaSync: Skip pushOperation (ADD_NODE/spouse) - currentTreeId is missing');
            }
        }
        return res;
    };

    const addChild = (gender: 'male' | 'female', bypassSync = false) => {
        const focusId = useAppStore.getState().focusId;
        const res = store.addChild(gender, bypassSync);
        if (!res) return null;

        const { updatedPeople, newId } = res;
        throttledSaveLocal(updatedPeople);

        if (!bypassSync) {
            const treeId = getCurrentTreeId();
            if (treeId) {
                const newPerson = updatedPeople[newId];
                deltaSyncService.pushOperation(treeId, 'ADD_NODE', { person: newPerson, relativeId: focusId, type: 'child' }).then(success => {
                    if (success) {
                        void activityService.logAction(treeId, 'ADD_PERSON', {
                            personId: newId,
                            personName: `${newPerson.firstName} ${newPerson.lastName}`.trim(),
                            type: 'child',
                            relativeId: focusId
                        });
                    }
                });
            } else {
                console.warn('DeltaSync: Skip pushOperation (ADD_NODE/child) - currentTreeId is missing');
            }
        }
        return res;
    };

    const removeRelationship = (targetId: string, relativeId: string, type: 'parent' | 'spouse' | 'child', bypassSync = false, addToHistory = true) => {
        const preDeletePeople = getPeople();
        store.removeRelationship(targetId, relativeId, type, bypassSync, addToHistory);
        throttledSaveLocal(getPeople());

        if (!bypassSync) {
            const treeId = getCurrentTreeId();
            if (treeId) {
                deltaSyncService.pushOperation(treeId, 'DELETE_RELATION', { targetId, relativeId, type }).then(success => {
                    if (success) {
                        void activityService.logAction(treeId, 'DELETE_RELATION', {
                            targetId,
                            relativeId,
                            type,
                            targetName: `${preDeletePeople[targetId]?.firstName} ${preDeletePeople[targetId]?.lastName}`.trim(),
                            relativeName: `${preDeletePeople[relativeId]?.firstName} ${preDeletePeople[relativeId]?.lastName}`.trim()
                        });
                    }
                });
            } else {
                console.warn('DeltaSync: Skip pushOperation (DELETE_RELATION) - currentTreeId is missing');
            }
        }
    };

    const linkPerson = (existingId: string, type: 'parent' | 'spouse' | 'child' | null, bypassSync = false, addToHistory = true) => {
        if (!type) return;

        const focusId = useAppStore.getState().focusId;
        const preLinkPeople = getPeople();
        store.linkPerson(existingId, type, bypassSync, addToHistory);
        throttledSaveLocal(getPeople());

        if (!bypassSync) {
            const treeId = getCurrentTreeId();
            if (treeId) {
                deltaSyncService.pushOperation(treeId, 'ADD_RELATION', { focusId, existingId, type }).then(success => {
                    if (success) {
                        void activityService.logAction(treeId, 'ADD_RELATION', {
                            focusId,
                            existingId,
                            type,
                            focusName: `${preLinkPeople[focusId]?.firstName} ${preLinkPeople[focusId]?.lastName}`.trim(),
                            existingName: `${preLinkPeople[existingId]?.firstName} ${preLinkPeople[existingId]?.lastName}`.trim()
                        });
                    }
                });
            } else {
                console.warn('DeltaSync: Skip pushOperation (ADD_RELATION) - currentTreeId is missing');
            }
        }
    };

    return {
        setPeople,
        updatePerson,
        deletePerson,
        addParent,
        addSpouse,
        addChild,
        removeRelationship,
        linkPerson
    };
};
