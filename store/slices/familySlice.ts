import { StateCreator } from 'zustand';
import { Person } from '../../types';
import { INITIAL_ROOT_ID, SAMPLE_FAMILY, DEFAULT_PERSON_TEMPLATE } from '../../constants';
import { validatePerson } from '../../utils/familyLogic';
import {
    performAddChild,
    performAddParent,
    performAddSpouse,
    performDeletePerson,
    performLinkPerson,
    performRemoveRelationship,
} from '../../utils/treeOperations';
import { AppStore } from '../storeTypes';

export interface FamilySlice {
    // State
    people: Record<string, Person>;
    focusId: string;
    history: Record<string, Person>[];
    future: Record<string, Person>[];
    lastSyncedVersion: number;
    opCount: number;
    searchTarget: { id: string; timestamp: number } | null;
    validationErrors: Record<string, string[]>;
    healthScore: number;
    treeName: string;
    peopleVersion: number;
    localClientVersion: number;
    syncingNodes: Set<string>;

    // Actions
    setTreeName: (name: string) => void;
    setPeople: (people: Record<string, Person>, addToHistory?: boolean) => void;
    setFocusId: (id: string) => void;
    setSearchTarget: (id: string | null) => void;
    setValidationErrors: (errors: Record<string, string[]>) => void;
    updatePerson: (id: string, updates: Partial<Person>, bypassSync?: boolean, addToHistory?: boolean) => void;
    deletePerson: (id: string, bypassSync?: boolean, addToHistory?: boolean) => void;
    addParent: (gender: 'male' | 'female', bypassSync?: boolean) => { updatedPeople: Record<string, Person>; newId: string } | null;
    addSpouse: (gender: 'male' | 'female', bypassSync?: boolean) => { updatedPeople: Record<string, Person>; newId: string } | null;
    addChild: (gender: 'male' | 'female', bypassSync?: boolean) => { updatedPeople: Record<string, Person>; newId: string } | null;
    removeRelationship: (targetId: string, relativeId: string, type: 'parent' | 'spouse' | 'child', bypassSync?: boolean, addToHistory?: boolean) => void;
    linkPerson: (existingId: string, type: 'parent' | 'spouse' | 'child' | null, bypassSync?: boolean, addToHistory?: boolean) => void;
    undo: () => void;
    redo: () => void;
    clearHistory: () => void;
    setLastSyncedVersion: (version: number) => void;
    loadCloudData: (cloudPeople: Record<string, Person>) => void;
    startNewTree: () => void;
    handleImport: (importedPeople: Record<string, Person>) => void;
    incrementOpCount: (count?: number) => void;
    incrementLocalClientVersion: () => void;
    addSyncingNode: (id: string) => void;
    removeSyncingNode: (id: string) => void;
}

// Google Drive backup will be called explicitly when opCount reaches 50

export const createFamilySlice: StateCreator<AppStore, [["zustand/devtools", never]], [], FamilySlice> = (set, get) => ({
    // Initial State
    people: SAMPLE_FAMILY,
    focusId: INITIAL_ROOT_ID,
    history: [],
    future: [],
    lastSyncedVersion: 0,
    opCount: 0,
    searchTarget: null,
    validationErrors: {},
    healthScore: 100,
    treeName: 'Family Lineage',
    peopleVersion: 0,
    localClientVersion: 0,
    syncingNodes: new Set(),

    // Actions
    setTreeName: (name) => set({ treeName: name }),
    setValidationErrors: (errors) => {
        const people = get().people;
        const total = Object.keys(people).length;
        const invalidCount = Object.keys(errors).length;
        const healthScore = total > 0 ? Math.max(0, Math.round(((total - invalidCount) / total) * 100)) : 100;
        set({ validationErrors: errors, healthScore });
    },
    setPeople: (people, addToHistory = true) => {
        const current = get().people;
        set((state) => ({
            people,
            peopleVersion: state.peopleVersion + 1,
            history: addToHistory ? [...state.history, current] : state.history,
            future: addToHistory ? [] : state.future,
        }));
    },

    setFocusId: (id) => set({ focusId: id }),

    incrementLocalClientVersion: () => set((state) => ({ localClientVersion: state.localClientVersion + 1 })),
    addSyncingNode: (id) => set((state) => {
        const next = new Set(state.syncingNodes);
        next.add(id);
        return { syncingNodes: next };
    }),
    removeSyncingNode: (id) => set((state) => {
        const next = new Set(state.syncingNodes);
        next.delete(id);
        return { syncingNodes: next };
    }),

    setSearchTarget: (id) => set({ searchTarget: id ? { id, timestamp: Date.now() } : null }),

    updatePerson: (id: string, updates: Partial<Person>, bypassSync = false, addToHistory = true) => {
        const validated = validatePerson({ ...get().people[id], ...updates });
        set((state) => ({
            people: { ...state.people, [id]: validated },
            peopleVersion: state.peopleVersion + 1,
            history: addToHistory ? [...state.history, state.people] : state.history,
            future: addToHistory ? [] : state.future,
        }));
    },

    deletePerson: (id: string, bypassSync = false, addToHistory = true) => {
        const { people, focusId } = get();
        const newPeople = performDeletePerson(people, id);
        if (newPeople === people) return;

        const nextFocusId =
            focusId === id ? Object.keys(newPeople)[0] || INITIAL_ROOT_ID : focusId;

        set((state) => ({
            people: newPeople,
            peopleVersion: state.peopleVersion + 1,
            focusId: nextFocusId,
            history: addToHistory ? [...state.history, people] : state.history,
            future: addToHistory ? [] : state.future,
        }));
    },

    addParent: (gender, bypassSync = false) => {
        const { people, focusId } = get();
        const res = performAddParent(people, focusId, gender);
        if (!res) return null;

        set({
            people: res.updatedPeople,
            peopleVersion: get().peopleVersion + 1,
            focusId: res.newId,
            history: [...get().history, people],
            future: [],
        });

        return res;
    },

    addSpouse: (gender, bypassSync = false) => {
        const { people, focusId } = get();
        const res = performAddSpouse(people, focusId, gender);
        if (!res) return null;

        set({
            people: res.updatedPeople,
            peopleVersion: get().peopleVersion + 1,
            focusId: res.newId,
            history: [...get().history, people],
            future: [],
        });

        return res;
    },

    addChild: (gender, bypassSync = false) => {
        const { people, focusId } = get();
        const res = performAddChild(people, focusId, gender);
        if (!res) return null;

        set({
            people: res.updatedPeople,
            peopleVersion: get().peopleVersion + 1,
            focusId: res.newId,
            history: [...get().history, people],
            future: [],
        });

        return res;
    },

    removeRelationship: (targetId, relativeId, type, bypassSync = false, addToHistory = true) => {
        const { people } = get();
        const updatedPeople = performRemoveRelationship(people, targetId, relativeId, type);

        set((state) => ({
            people: updatedPeople,
            peopleVersion: state.peopleVersion + 1,
            history: addToHistory ? [...state.history, people] : state.history,
            future: addToHistory ? [] : state.future,
        }));
    },

    linkPerson: (existingId, type, bypassSync = false, addToHistory = true) => {
        if (!type) return; // Handle null type

        const { people, focusId } = get();
        const updatedPeople = performLinkPerson(people, focusId, existingId, type);

        set((state) => ({
            people: updatedPeople,
            peopleVersion: state.peopleVersion + 1,
            history: addToHistory ? [...state.history, people] : state.history,
            future: addToHistory ? [] : state.future,
        }));
    },

    undo: () => {
        const { history, people, peopleVersion } = get();
        if (history.length === 0) return;

        const previous = history[history.length - 1];
        const newHistory = history.slice(0, -1);

        set({
            people: previous,
            peopleVersion: peopleVersion + 1,
            history: newHistory,
            future: [people, ...get().future],
        });
    },

    redo: () => {
        const { future, people, peopleVersion } = get();
        if (future.length === 0) return;

        const next = future[0];
        const newFuture = future.slice(1);

        set({
            people: next,
            peopleVersion: peopleVersion + 1,
            history: [...get().history, people],
            future: newFuture,
        });
    },

    clearHistory: () => set({ history: [], future: [] }),
    setLastSyncedVersion: (version) => set({ lastSyncedVersion: version }),


    loadCloudData: (cloudPeople) => {
        set((state) => ({
            people: cloudPeople,
            peopleVersion: state.peopleVersion + 1,
            history: [],
            future: [],
            focusId: Object.keys(cloudPeople)[0] || INITIAL_ROOT_ID,
        }));
    },

    startNewTree: () => {
        set((state) => ({
            people: SAMPLE_FAMILY,
            peopleVersion: state.peopleVersion + 1,
            focusId: INITIAL_ROOT_ID,
            history: [],
            future: [],
            lastSyncedVersion: 0,
        }));
    },

    handleImport: (importedPeople) => {
        set((state) => ({
            people: importedPeople,
            peopleVersion: state.peopleVersion + 1,
            history: [],
            future: [],
            focusId: Object.keys(importedPeople)[0] || INITIAL_ROOT_ID,
        }));
    },

    incrementOpCount: (count = 1) => {
        const newCount = get().opCount + count;
        set({ opCount: newCount });

        if (newCount >= 50) {
            set({ opCount: 0 });
            window.dispatchEvent(new CustomEvent('jozor-backup-requested'));
        }
    },
});
