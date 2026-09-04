import { StateCreator } from 'zustand';
import { Person, RelationshipEdge, RelationshipEdgeType, syncRelationshipsWithPeople, Source, Citation, deriveSourcesAndCitationsFromPeople, mergeDerivedSourcesAndCitations } from '../../types';
import { DEFAULT_PERSON_TEMPLATE } from '../../constants';
import { createPerson } from '../../utils/familyLogic';
import { applyFamilyDomainAction, reduceFamilyDomain } from '../../domain/FamilyDomainReducer';
import { storageService } from '../../services/storageService';
import { clientInstanceId } from '../../services/sync/syncInstance';
import { logError } from '../../utils/errorLogger';
import { maskPeopleMap } from '../../utils/privacyUtils';
import { assertCanEditTreeContext } from '../../domain/treePermissionPolicy';

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
        relationships: {} as Record<string, RelationshipEdge>,
        sources: {} as Record<string, Source>,
        citations: {} as Record<string, Citation>,
        focusId: initialId,
    };
};
import { AppStore } from '../storeTypes';

export interface FamilySlice {
    // State
    people: Record<string, Person>;
    confirmedPeople: Record<string, Person>;
    relationships: Record<string, RelationshipEdge>;
    sources: Record<string, Source>;
    citations: Record<string, Citation>;
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
    setConfirmedPeople: (people: Record<string, Person>) => void;
    setRelationships: (relationships: Record<string, RelationshipEdge>) => void;
    updateRelationshipType: (id: string, type: RelationshipEdgeType) => void;
    setSources: (sources: Record<string, Source>) => void;
    setCitations: (citations: Record<string, Citation>) => void;
    addSource: (source: Source) => void;
    updateSource: (id: string, updates: Partial<Source>) => void;
    deleteSource: (id: string) => void;
    addCitation: (citation: Citation) => void;
    removeCitation: (id: string) => void;
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

const assertFamilyMutationAllowed = (
    get: () => AppStore
): void => {
    const state = get();
    assertCanEditTreeContext({
        currentTreeId: state.currentTreeId,
        role: state.currentUserRole,
    });
};

export const createFamilySlice: StateCreator<AppStore, [["zustand/devtools", never]], [], FamilySlice> = (originalSet, get) => {
    const set: typeof originalSet = (partial, replace) => {
        originalSet((state) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const nextState = typeof partial === 'function' ? (partial as any)(state) : partial;
            const updated = { ...nextState };
            
            const currentRole = updated.currentUserRole !== undefined ? updated.currentUserRole : state.currentUserRole;
            const isViewer = currentRole === 'viewer';
            
            if (isViewer) {
                if (updated.people) {
                    updated.people = maskPeopleMap(updated.people);
                } else if (state.people && updated.currentUserRole === 'viewer') {
                    updated.people = maskPeopleMap(state.people);
                }
                
                if (updated.confirmedPeople) {
                    updated.confirmedPeople = maskPeopleMap(updated.confirmedPeople);
                } else if (state.confirmedPeople && updated.currentUserRole === 'viewer') {
                    updated.confirmedPeople = maskPeopleMap(state.confirmedPeople);
                }
            }
            
            if (updated.people && updated.people !== state.people) {
                const treeId = updated.currentTreeId || state.currentTreeId || 'default-tree';
                const currentRels = updated.relationships || state.relationships || {};
                updated.relationships = syncRelationshipsWithPeople(currentRels, treeId, updated.people);

                const { sources: derivedSources, citations: derivedCitations } = deriveSourcesAndCitationsFromPeople(treeId, updated.people);
                const merged = mergeDerivedSourcesAndCitations(
                    updated.sources || state.sources || {},
                    updated.citations || state.citations || {},
                    derivedSources,
                    derivedCitations
                );
                updated.sources = merged.sources;
                updated.citations = merged.citations;
            }
            
            if (updated.confirmedPeople && updated.confirmedPeople !== state.confirmedPeople) {
                const treeId = updated.currentTreeId || state.currentTreeId || 'default-tree';
                const currentRels = updated.relationships || state.relationships || {};
                updated.relationships = syncRelationshipsWithPeople(currentRels, treeId, updated.confirmedPeople);

                const { sources: derivedSources, citations: derivedCitations } = deriveSourcesAndCitationsFromPeople(treeId, updated.confirmedPeople);
                const merged = mergeDerivedSourcesAndCitations(
                    updated.sources || state.sources || {},
                    updated.citations || state.citations || {},
                    derivedSources,
                    derivedCitations
                );
                updated.sources = merged.sources;
                updated.citations = merged.citations;
            }
            
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return updated as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }, replace as any);
    };

    const initial = getInitialFamilyState();
    return {
        // Initial State
        people: initial.people,
        confirmedPeople: initial.people,
        relationships: initial.relationships,
        sources: initial.sources,
        citations: initial.citations,
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
                confirmedPeople: filteredPeople,
                people: filteredPeople,
                peopleVersion: state.peopleVersion + 1,
                focusId: resolveValidFocusId(filteredPeople, state.focusId),
            }));
        },

        setConfirmedPeople: (people) => set({ confirmedPeople: people }),

        setRelationships: (relationships) => set({ relationships }),

        updateRelationshipType: (id, type) => {
            const edge = get().relationships[id];
            if (!edge) return;
            const updatedEdge = { ...edge, type, updatedAt: new Date().toISOString() };
            set((state) => ({
                relationships: { ...state.relationships, [id]: updatedEdge },
            }));
        },

        setSources: (sources) => set({ sources }),
        setCitations: (citations) => set({ citations }),

        addSource: (source) => set((state) => ({
            sources: { ...state.sources, [source.id]: source }
        })),

        updateSource: (id, updates) => {
            const current = get().sources[id];
            if (!current) return;
            const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };
            set((state) => ({
                sources: { ...state.sources, [id]: updated }
            }));
        },

        deleteSource: (id) => set((state) => {
            const nextSources = { ...state.sources };
            delete nextSources[id];
            
            const nextCitations = { ...state.citations };
            Object.keys(nextCitations).forEach((cid) => {
                if (nextCitations[cid].sourceId === id) {
                    delete nextCitations[cid];
                }
            });

            return { sources: nextSources, citations: nextCitations };
        }),

        addCitation: (citation) => set((state) => ({
            citations: { ...state.citations, [citation.id]: citation }
        })),

        removeCitation: (id) => set((state) => {
            const nextCitations = { ...state.citations };
            delete nextCitations[id];
            return { citations: nextCitations };
        }),

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
            get().triggerPulse?.(id);
        }
        set({ searchTarget: id ? { id, timestamp: Date.now() } : null });
    },

    updatePerson: (id: string, updates: Partial<Person>, _bypassSync = false, addToHistory = true) => {
        assertFamilyMutationAllowed(get);
        const currentPeople = get().people;
        const nextClientVersion = get().localClientVersion + 1;
        const updatedPeople = reduceFamilyDomain(currentPeople, {
            type: 'updatePerson',
            id,
            updates,
            updatedAt: new Date().toISOString(),
            clientId: clientInstanceId,
            clientVersion: nextClientVersion
        });
        if (!updatedPeople || updatedPeople === currentPeople) return;
        
        if (addToHistory) get().pushToHistory(currentPeople);

        set((state) => ({
            people: updatedPeople,
            peopleVersion: state.peopleVersion + 1,
        }));
    },

    deletePerson: (id: string, _bypassSync = false, addToHistory = true) => {
        assertFamilyMutationAllowed(get);
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
        assertFamilyMutationAllowed(get);
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
        assertFamilyMutationAllowed(get);
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
        assertFamilyMutationAllowed(get);
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
        assertFamilyMutationAllowed(get);
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
        assertFamilyMutationAllowed(get);
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
            confirmedPeople: filteredPeople,
            people: filteredPeople,
            peopleVersion: state.peopleVersion + 1,
            focusId: resolveValidFocusId(filteredPeople, state.focusId),
        }));
        
        get().clearHistory();
    },

    startNewTree: () => {
        const initial = getInitialFamilyState();
        set((state) => ({
            confirmedPeople: initial.people,
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
            confirmedPeople: filteredPeople,
            people: filteredPeople,
            peopleVersion: state.peopleVersion + 1,
            focusId: resolveValidFocusId(filteredPeople, state.focusId),
        }));
        get().clearHistory();
    },

    addFirstPerson: (gender) => {
        assertFamilyMutationAllowed(get);
        const currentPeople = get().people;
        const newPerson = {
            ...createPerson(gender),
            firstName: 'Me',
            lastName: '',
        };

        get().pushToHistory(currentPeople);

        set((state) => ({
            confirmedPeople: { [newPerson.id]: newPerson },
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
