import { StateCreator } from 'zustand';

export interface UISlice {
    isAdvancedBarOpen: boolean;
    setAdvancedBarOpen: (open: boolean) => void;
    isSettingsDrawerOpen: boolean;
    setSettingsDrawerOpen: (open: boolean) => void;
}

export const createUISlice: StateCreator<UISlice> = (set) => ({
    isAdvancedBarOpen: false,
    setAdvancedBarOpen: (open) => set({ isAdvancedBarOpen: open }),
    isSettingsDrawerOpen: false,
    setSettingsDrawerOpen: (open) => set({ isSettingsDrawerOpen: open }),
});
