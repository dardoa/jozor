import { INITIAL_ROOT_ID, SAMPLE_FAMILY } from '../../constants';
import { validatePerson, createPerson } from '../../utils/familyLogic';
import { performAddChild, performAddParent, performAddSpouse, performDeletePerson, performLinkPerson, performRemoveRelationship, } from '../../utils/treeOperations';
// Google Drive backup will be called explicitly when opCount reaches 50
export const createFamilySlice = (set, get) => ({
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
    setSearchTarget: (id) => {
        if (id)
            get().triggerPulse(id);
        set({ searchTarget: id ? { id, timestamp: Date.now() } : null });
    },
    updatePerson: (id, updates, _bypassSync = false, addToHistory = true) => {
        const validated = validatePerson({ ...get().people[id], ...updates });
        set((state) => ({
            people: { ...state.people, [id]: validated },
            peopleVersion: state.peopleVersion + 1,
            history: addToHistory ? [...state.history, state.people] : state.history,
            future: addToHistory ? [] : state.future,
        }));
    },
    deletePerson: (id, _bypassSync = false, addToHistory = true) => {
        const { people, focusId } = get();
        const newPeople = performDeletePerson(people, id);
        if (newPeople === people)
            return;
        const nextFocusId = focusId === id ? Object.keys(newPeople)[0] || INITIAL_ROOT_ID : focusId;
        set((state) => ({
            people: newPeople,
            peopleVersion: state.peopleVersion + 1,
            focusId: nextFocusId,
            history: addToHistory ? [...state.history, people] : state.history,
            future: addToHistory ? [] : state.future,
        }));
    },
    addParent: (gender, _bypassSync = false, relatedPersonId) => {
        const { people, focusId } = get();
        const res = performAddParent(people, focusId, gender, relatedPersonId);
        if (!res)
            return null;
        set({
            people: res.updatedPeople,
            peopleVersion: get().peopleVersion + 1,
            focusId: res.newId,
            history: [...get().history, people],
            future: [],
        });
        return res;
    },
    addSpouse: (gender, _bypassSync = false) => {
        const { people, focusId } = get();
        const res = performAddSpouse(people, focusId, gender);
        if (!res)
            return null;
        set({
            people: res.updatedPeople,
            peopleVersion: get().peopleVersion + 1,
            focusId: res.newId,
            history: [...get().history, people],
            future: [],
        });
        return res;
    },
    addChild: (gender, _bypassSync = false, relatedPersonId) => {
        const { people, focusId } = get();
        const res = performAddChild(people, focusId, gender, relatedPersonId);
        if (!res)
            return null;
        set({
            people: res.updatedPeople,
            peopleVersion: get().peopleVersion + 1,
            focusId: res.newId,
            history: [...get().history, people],
            future: [],
        });
        return res;
    },
    removeRelationship: (targetId, relativeId, type, _bypassSync = false, addToHistory = true) => {
        const { people } = get();
        const updatedPeople = performRemoveRelationship(people, targetId, relativeId, type);
        set((state) => ({
            people: updatedPeople,
            peopleVersion: state.peopleVersion + 1,
            history: addToHistory ? [...state.history, people] : state.history,
            future: addToHistory ? [] : state.future,
        }));
    },
    linkPerson: (existingId, type, _bypassSync = false, addToHistory = true, relatedPersonId) => {
        if (!type)
            return; // Handle null type
        const { people, focusId } = get();
        const updatedPeople = performLinkPerson(people, focusId, existingId, type, relatedPersonId);
        set((state) => ({
            people: updatedPeople,
            peopleVersion: state.peopleVersion + 1,
            history: addToHistory ? [...state.history, people] : state.history,
            future: addToHistory ? [] : state.future,
        }));
    },
    undo: () => {
        const { history, people, peopleVersion } = get();
        if (history.length === 0)
            return;
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
        if (future.length === 0)
            return;
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
    addFirstPerson: (gender) => {
        const newPerson = {
            ...createPerson(gender),
            firstName: 'Me',
            lastName: '',
        };
        set((state) => ({
            people: { [newPerson.id]: newPerson },
            peopleVersion: state.peopleVersion + 1,
            focusId: newPerson.id,
            history: [...state.history, state.people],
            future: [],
        }));
    },
});
