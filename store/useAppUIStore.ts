import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface AppUIStore {
    isLowGraphicsMode: boolean;
    setIsLowGraphicsMode: (value: boolean) => void;
}

export const useAppUIStore = create<AppUIStore>()(
    persist(
        (set) => ({
            isLowGraphicsMode: false,
            setIsLowGraphicsMode: (value: boolean) => set({ isLowGraphicsMode: value }),
        }),
        {
            name: 'jozor-ui-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
