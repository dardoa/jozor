import { StateCreator } from 'zustand';
import { AppStore } from '../storeTypes';
import { evaluateDataIntegrity } from '../../domain/dataIntegrity';

export interface TreeHealthSlice {
    validationErrors: Record<string, string[]>;
    healthScore: number;
    
    setValidationErrors: (errors: Record<string, string[]>) => void;
}

export const createTreeHealthSlice: StateCreator<AppStore, [["zustand/devtools", never]], [], TreeHealthSlice> = (set, get) => ({
    validationErrors: {},
    healthScore: 100,

    setValidationErrors: (errors) => {
        const people = get().people;
        const total = Object.keys(people || {}).length;
        const invalidCount = Object.keys(errors).length;
        const healthScore = invalidCount > 0
            ? (total > 0 ? Math.max(0, Math.round(((total - invalidCount) / total) * 100)) : 100)
            : evaluateDataIntegrity(people || {}).healthScore;
        set({ validationErrors: errors, healthScore });
    },
});
