import { StateCreator } from 'zustand';
import { Person } from '../../types';
import { AppStore } from '../storeTypes';

export interface HistorySlice {
    // State
    past: Record<string, Person>[];
    future: Record<string, Person>[];
    historyStepLimit: number;
    historyEstimatedBytes: number;
    isHistoryStale: boolean;
    
    // Actions
    pushToHistory: (people: Record<string, Person>) => void;
    undo: () => { success: boolean; blockedReason?: 'stale_history' };
    redo: () => { success: boolean; blockedReason?: 'stale_history' };
    clearHistory: () => void;
    markHistoryStale: () => void;
}

export const MAX_HISTORY_STEPS = 50;
export const MIN_HISTORY_STEPS = 5;
export const HISTORY_REFERENCE_BUDGET_BYTES = 3 * 1024 * 1024;
export const ESTIMATED_REFERENCE_BYTES_PER_PERSON = 96;

export const getHistoryStepLimit = (peopleCount: number): number => {
    if (peopleCount <= 0) return MAX_HISTORY_STEPS;

    const budgetedSteps = Math.floor(
        HISTORY_REFERENCE_BUDGET_BYTES / (peopleCount * ESTIMATED_REFERENCE_BYTES_PER_PERSON),
    );

    return Math.max(MIN_HISTORY_STEPS, Math.min(MAX_HISTORY_STEPS, budgetedSteps));
};

export const estimateHistoryReferenceBytes = (
    entryCount: number,
    peopleCount: number,
): number => Math.max(0, entryCount) * Math.max(0, peopleCount) * ESTIMATED_REFERENCE_BYTES_PER_PERSON;

const trimHistoryStacks = (
    past: Record<string, Person>[],
    future: Record<string, Person>[],
    limit: number,
) => {
    const nextPast = [...past];
    const nextFuture = [...future];

    while (nextPast.length + nextFuture.length > limit) {
        if (nextPast.length > 0) {
            nextPast.shift();
        } else {
            nextFuture.pop();
        }
    }

    return { past: nextPast, future: nextFuture };
};

const getHistoryMetrics = (
    past: Record<string, Person>[],
    future: Record<string, Person>[],
    peopleCount: number,
) => ({
    historyStepLimit: getHistoryStepLimit(peopleCount),
    historyEstimatedBytes: estimateHistoryReferenceBytes(
        past.length + future.length,
        peopleCount,
    ),
});

export const createHistorySlice: StateCreator<AppStore, [["zustand/devtools", never]], [], HistorySlice> = (set, get) => ({
    past: [],
    future: [],
    historyStepLimit: MAX_HISTORY_STEPS,
    historyEstimatedBytes: 0,
    isHistoryStale: false,

    pushToHistory: (people) => {
        // Deep clone not needed as people objects are replaced on mutation in familySlice
        set((state) => {
            const peopleCount = Object.keys(people).length;
            const limit = getHistoryStepLimit(peopleCount);
            const trimmed = trimHistoryStacks([...state.past, people], [], limit);

            return {
                ...trimmed,
                isHistoryStale: false,
                ...getHistoryMetrics(trimmed.past, trimmed.future, peopleCount),
            };
        });
    },

    undo: () => {
        const { past, people, peopleVersion, isHistoryStale } = get();
        if (isHistoryStale) {
            return { success: false, blockedReason: 'stale_history' };
        }
        if (past.length === 0) return { success: false };

        const previous = past[past.length - 1];
        const newPast = past.slice(0, -1);
        const peopleCount = Object.keys(previous).length;
        const limit = getHistoryStepLimit(peopleCount);
        const trimmed = trimHistoryStacks(newPast, [people, ...get().future], limit);

        set({
            people: previous,
            peopleVersion: peopleVersion + 1,
            ...trimmed,
            ...getHistoryMetrics(trimmed.past, trimmed.future, peopleCount),
        });
        return { success: true };
    },

    redo: () => {
        const { future, people, peopleVersion, isHistoryStale } = get();
        if (isHistoryStale) {
            return { success: false, blockedReason: 'stale_history' };
        }
        if (future.length === 0) return { success: false };

        const next = future[0];
        const newFuture = future.slice(1);
        const peopleCount = Object.keys(next).length;
        const limit = getHistoryStepLimit(peopleCount);
        const trimmed = trimHistoryStacks([...get().past, people], newFuture, limit);

        set({
            people: next,
            peopleVersion: peopleVersion + 1,
            ...trimmed,
            ...getHistoryMetrics(trimmed.past, trimmed.future, peopleCount),
        });
        return { success: true };
    },

    clearHistory: () => {
        const peopleCount = Object.keys(get().people).length;
        set({
            past: [],
            future: [],
            isHistoryStale: false,
            historyStepLimit: getHistoryStepLimit(peopleCount),
            historyEstimatedBytes: 0,
        });
    },

    markHistoryStale: () => {
        set({ isHistoryStale: true });
    },
});
