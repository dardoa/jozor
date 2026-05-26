import { StateCreator } from 'zustand';
import { Person } from '../../types';
import { DEFAULT_PERSON_TEMPLATE } from '../../constants';
import { createPerson } from '../../utils/familyLogic';
import { applyFamilyDomainAction, reduceFamilyDomain } from '../../domain/FamilyDomainReducer';
import { storageService } from '../../services/storageService';
import { logError } from '../../utils/errorLogger';

const getInitialFamilyState = () => {
    const initialId = crypto.randomUUID();
    const initialPerson: Person = {
        id: initialId,
        ...DEFAULT_PERSON_TEMPLATE,
        firstName: 'Me',
        lastName: '',
        gender: 'male',
    };
    return {
        people: { [initialId]: initialPerson },
        focusId: initialId,
    };
};
import { AppStore } from '../storeTypes';

export interface FamilySlice {
    // State
    people: Record<string, Person>;
    locations: Record<string, import('../../types').LocationData>;
    focusId: string;
    searchTarget: { id: string; timestamp: number } | null;
    treeName: string;
    peopleVersion: number;
    /**
     * Blacklist of person IDs deleted in this session.
     * Prevents the sync engine from re-adding deleted persons via stale ADD_NODE operations.
     */
    deletedPersonIds: Set<string>;

    // Actions
    setTreeName: (name: string) => void;
    setPeople: (people: Record<string, Person>, addToHistory?: boolean) => void;
    setDeletedPersonIds: (ids: Iterable<string>) => void;
    addDeletedPersonId: (id: string) => void;
    setFocusId: (id: string) => void;
    setSearchTarget: (id: string | null) => void;
    updatePerson: (id: string, updates: Partial<Person>, bypassSync?: boolean, addToHistory?: boolean) => void;
    deletePerson: (id: string, bypassSync?: boolean, addToHistory?: boolean) => void;
    addParent: (gender: 'male' | 'female', bypassSync?: boolean, relatedPersonId?: string, targetPersonId?: string) => { updatedPeople: Record<string, Person>; newId: string } | null;
    addSpouse: (gender: 'male' | 'female', bypassSync?: boolean, relatedPersonId?: string) => { updatedPeople: Record<string, Person>; newId: string } | null;
    addChild: (gender: 'male' | 'female', bypassSync?: boolean, relatedPersonId?: string, targetPersonId?: string) => { updatedPeople: Record<string, Person>; newId: string } | null;
    removeRelationship: (targetId: string, relativeId: string, type: 'parent' | 'spouse' | 'child', bypassSync?: boolean, addToHistory?: boolean) => void;
    linkPerson: (existingId: string, type: 'parent' | 'spouse' | 'child' | null, bypassSync?: boolean, addToHistory?: boolean, relatedPersonId?: string) => void;
    loadCloudData: (cloudPeople: Record<string, Person>) => void;
    startNewTree: () => void;
    handleImport: (importedPeople: Record<string, Person>) => void;
    addFirstPerson: (gender: 'male' | 'female') => void;
    
    // Locations
    addLocation: (placeName: string, data: import('../../types').LocationData) => void;
    updateLocationStatus: (placeName: string, status: import('../../types').LocationStatus) => void;
}

const resolveValidFocusId = (people: Record<string, Person>, preferredFocusId: string): string =>
    preferredFocusId && people[preferredFocusId]
        ? preferredFocusId
        : Object.keys(people)[0] || '';

const filterDeletedPeople = (
    people: Record<string, Person>,
    deletedIds: Set<string>
): Record<string, Person> => {
    if (deletedIds.size === 0) return people;

    return Object.fromEntries(
        Object.entries(people).filter(([id]) => !deletedIds.has(id))
    );
};

export const createFamilySlice: StateCreator<AppStore, [["zustand/devtools", never]], [], FamilySlice> = (set, get) => {
    const initial = getInitialFamilyState();
    return {
        // Initial State
        people: initial.people,
        locations: {},
        focusId: initial.focusId,
    searchTarget: null,
    treeName: 'Family Lineage',
    peopleVersion: 0,
    deletedPersonIds: new Set<string>(),

    // Actions
    setTreeName: (name) => set({ treeName: name }),

    setPeople: (people, addToHistory = true) => {
        const current = get().people;
        const deletedIds = get().deletedPersonIds;
        const filteredPeople = filterDeletedPeople(people, deletedIds);

        if (addToHistory) get().pushToHistory(current);

        set((state) => ({
            people: filteredPeople,
            peopleVersion: state.peopleVersion + 1,
            focusId: resolveValidFocusId(filteredPeople, state.focusId),
        }));
    },

    setDeletedPersonIds: (ids) => {
        const deletedPersonIds = new Set(ids);
        const filteredPeople = filterDeletedPeople(get().people, deletedPersonIds);

        set((state) => ({
            deletedPersonIds,
            people: filteredPeople,
            peopleVersion: filteredPeople === state.people ? state.peopleVersion : state.peopleVersion + 1,
            focusId: resolveValidFocusId(filteredPeople, state.focusId),
        }));
    },

    addDeletedPersonId: (id) => {
        const deletedPersonIds = new Set(get().deletedPersonIds);
        deletedPersonIds.add(id);
        set({ deletedPersonIds });
    },

    setFocusId: (id) => set({ focusId: id }),

    setSearchTarget: (id) => {
        if (id) {
            (get() as any).triggerPulse?.(id);
        }
        set({ searchTarget: id ? { id, timestamp: Date.now() } : null });
    },

    updatePerson: (id: string, updates: Partial<Person>, _bypassSync = false, addToHistory = true) => {
        if (get().currentUserRole === 'viewer') throw new Error('Unauthorized: Viewers cannot edit.');
        const currentPeople = get().people;
        const updatedPeople = reduceFamilyDomain(currentPeople, { type: 'updatePerson', id, updates });
        if (!updatedPeople || updatedPeople === currentPeople) return;
        
        if (addToHistory) get().pushToHistory(currentPeople);

        set((state) => ({
            people: updatedPeople,
            peopleVersion: state.peopleVersion + 1,
        }));
    },

    deletePerson: (id: string, _bypassSync = false, addToHistory = true) => {
        if (get().currentUserRole === 'viewer') throw new Error('Unauthorized: Viewers cannot delete.');
        const currentPeople = get().people;
        const { focusId } = get();
        const newPeople = reduceFamilyDomain(currentPeople, { type: 'deletePerson', id });
        if (newPeople === currentPeople) return;
        if (!newPeople) return;

        const nextFocusId =
            focusId === id ? Object.keys(newPeople)[0] || '' : focusId;

        const newDeletedPersonIds = new Set(get().deletedPersonIds);
        newDeletedPersonIds.add(id);
        void storageService.recordDeletedPersonId(get().currentTreeId, id).catch((error) => {
            logError('familySlice deletePerson recordDeletedPersonId', error, {
                category: 'DATABASE',
                severity: 'MEDIUM',
                metadata: { personId: id, treeId: get().currentTreeId, operationType: 'record_deleted_person_id' },
            });
        });

        if (addToHistory) get().pushToHistory(currentPeople);

        set((state) => ({
            people: newPeople,
            peopleVersion: state.peopleVersion + 1,
            focusId: nextFocusId,
            deletedPersonIds: newDeletedPersonIds,
        }));
    },

    addParent: (gender, _bypassSync = false, relatedPersonId, targetPersonId) => {
        if (get().currentUserRole === 'viewer') throw new Error('Unauthorized: Viewers cannot add parents.');
        const currentPeople = get().people;
        const { focusId } = get();
        const targetId = targetPersonId || focusId;
        const res = applyFamilyDomainAction(currentPeople, {
            type: 'addParent',
            targetId,
            gender,
            relatedPersonId,
        });
        if (!res) return null;
        const newId = res.newId;
        if (!newId) return null;

        get().pushToHistory(currentPeople);

        set({
            people: res.people,
            peopleVersion: get().peopleVersion + 1,
            focusId: newId,
        });

        return { updatedPeople: res.people, newId };
    },

    addSpouse: (gender, _bypassSync = false, relatedPersonId) => {
        if (get().currentUserRole === 'viewer') throw new Error('Unauthorized: Viewers cannot add spouses.');
        const currentPeople = get().people;
        const { focusId } = get();
        const targetId = relatedPersonId || focusId;
        const res = applyFamilyDomainAction(currentPeople, {
            type: 'addSpouse',
            targetId,
            gender,
        });
        if (!res) return null;
        const newId = res.newId;
        if (!newId) return null;

        get().pushToHistory(currentPeople);

        set({
            people: res.people,
            peopleVersion: get().peopleVersion + 1,
            focusId: newId,
        });

        return { updatedPeople: res.people, newId };
    },

    addChild: (gender, _bypassSync = false, relatedPersonId, targetPersonId) => {
        if (get().currentUserRole === 'viewer') throw new Error('Unauthorized: Viewers cannot add children.');
        const currentPeople = get().people;
        const { focusId } = get();
        const targetId = targetPersonId || focusId;
        const res = applyFamilyDomainAction(currentPeople, {
            type: 'addChild',
            targetId,
            gender,
            relatedPersonId,
        });
        if (!res) return null;
        const newId = res.newId;
        if (!newId) return null;

        get().pushToHistory(currentPeople);

        set({
            people: res.people,
            peopleVersion: get().peopleVersion + 1,
            focusId: newId,
        });

        return { updatedPeople: res.people, newId };
    },

    removeRelationship: (targetId, relativeId, type, _bypassSync = false, addToHistory = true) => {
        if (get().currentUserRole === 'viewer') throw new Error('Unauthorized: Viewers cannot remove relationships.');
        const currentPeople = get().people;
        const updatedPeople = reduceFamilyDomain(currentPeople, {
            type: 'removeRelationship',
            targetId,
            relativeId,
            relationshipType: type,
        });
        if (!updatedPeople) return;

        if (addToHistory) get().pushToHistory(currentPeople);

        set((state) => ({
            people: updatedPeople,
            peopleVersion: state.peopleVersion + 1,
        }));
    },

    linkPerson: (existingId, type, _bypassSync = false, addToHistory = true, relatedPersonId) => {
        if (get().currentUserRole === 'viewer') throw new Error('Unauthorized: Viewers cannot link persons.');
        if (!type) return;

        const currentPeople = get().people;
        const { focusId } = get();
        const updatedPeople = reduceFamilyDomain(currentPeople, {
            type: 'linkPerson',
            focusId,
            existingId,
            relationshipType: type,
            relatedPersonId,
        });
        if (!updatedPeople) return;

        if (addToHistory) get().pushToHistory(currentPeople);

        set((state) => ({
            people: updatedPeople,
            peopleVersion: state.peopleVersion + 1,
        }));
    },

    loadCloudData: (cloudPeople) => {
        const deletedIds = get().deletedPersonIds;
        const filteredPeople = filterDeletedPeople(cloudPeople, deletedIds);

        set((state) => ({
            people: filteredPeople,
            peopleVersion: state.peopleVersion + 1,
            focusId: resolveValidFocusId(filteredPeople, state.focusId),
        }));
        
        get().clearHistory();
    },

    startNewTree: () => {
        const initial = getInitialFamilyState();
        set((state) => ({
            people: initial.people,
            peopleVersion: state.peopleVersion + 1,
            focusId: initial.focusId,
            deletedPersonIds: new Set<string>(),
        }));
        get().clearHistory();
    },

    handleImport: (importedPeople) => {
        const deletedIds = get().deletedPersonIds;
        const filteredPeople = filterDeletedPeople(importedPeople, deletedIds);

        set((state) => ({
            people: filteredPeople,
            peopleVersion: state.peopleVersion + 1,
            focusId: resolveValidFocusId(filteredPeople, state.focusId),
        }));
        get().clearHistory();
    },

    addFirstPerson: (gender) => {
        if (get().currentUserRole === 'viewer') throw new Error('Unauthorized: Viewers cannot add people.');
        const currentPeople = get().people;
        const newPerson = {
            ...createPerson(gender),
            firstName: 'Me',
            lastName: '',
        };

        get().pushToHistory(currentPeople);

        set((state) => ({
            people: { [newPerson.id]: newPerson },
            peopleVersion: state.peopleVersion + 1,
            focusId: newPerson.id,
        }));
    },

    addLocation: (placeName, data) => set((state) => ({
        locations: { ...state.locations, [placeName]: data }
    })),

    updateLocationStatus: (placeName, status) => set((state) => {
        const loc = state.locations[placeName];
        if (!loc) return state;
        return {
            locations: {
                ...state.locations,
                [placeName]: { ...loc, status }
            }
        };
    }),
};
};
