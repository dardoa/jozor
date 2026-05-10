export const createUISlice = (set, get) => ({
    isAdvancedBarOpen: false,
    setAdvancedBarOpen: (open) => set({ isAdvancedBarOpen: open }),
    isSettingsDrawerOpen: false,
    setSettingsDrawerOpen: (open) => set({ isSettingsDrawerOpen: open }),
    settingsDrawerTab: 'layout',
    setSettingsDrawerTab: (tab) => set({ settingsDrawerTab: tab }),
    isToolsDrawerOpen: false,
    setToolsDrawerOpen: (open) => set({ isToolsDrawerOpen: open }),
    adminHubTab: 'access',
    setAdminHubTab: (tab) => set({ adminHubTab: tab }),
    personSidebarTab: 'info',
    setPersonSidebarTab: (tab) => set({ personSidebarTab: tab }),
    isPersonSidebarEditing: false,
    setPersonSidebarEditing: (editing) => set({ isPersonSidebarEditing: editing }),
    pulseTargetId: null,
    triggerPulse: (id) => {
        set({ pulseTargetId: id });
        setTimeout(() => {
            if (get().pulseTargetId === id) {
                set({ pulseTargetId: null });
            }
        }, 3000);
    },
});
