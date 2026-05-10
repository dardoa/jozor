import { StateCreator } from 'zustand';
import { Person } from '../../types';
import { AppStore } from '../storeTypes';

export interface HistorySlice {
    // State
    past: Record<string, Person>[];
    future: Record<string, Person>[];
    
    // Actions
    pushToHistory: (people: Record<string, Person>) => void;
    undo: () => void;
    redo: () => void;
    clearHistory: () => void;
}

const MAX_HISTORY_STEPS = 50;

export const createHistorySlice: StateCreator<AppStore, [["zustand/devtools", never]], [], HistorySlice> = (set, get) => ({
    past: [],
    future: [],

    pushToHistory: (people) => {
        // Deep clone not needed as people objects are replaced on mutation in familySlice
        set((state) => {
            const nextPast = [...state.past, people];
            if (nextPast.length > MAX_HISTORY_STEPS) {
                nextPast.shift();
            }
            return {
                past: nextPast,
                future: [], // Clear redo stack on new action
            };
        });
    },

    undo: () => {
        const { past, people, peopleVersion } = get();
        if (past.length === 0) return;

        const previous = past[past.length - 1];
        const newPast = past.slice(0, -1);

        set({
            people: previous,
            peopleVersion: peopleVersion + 1,
            past: newPast,
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
            past: [...get().past, people],
            future: newFuture,
        });
    },

    clearHistory: () => set({ past: [], future: [] }),
});
