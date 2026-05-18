import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../store/useAppStore';
import { TreeSettings } from '../../types';
import { mapAppearanceLabStateToTreeSettings } from '../../domain/appearance/appearanceSettingsAdapter';

/**
 * ADAPTER: appearanceSlice (useAppStore.appearance) -> Partial<TreeSettings>
 * 
 * Extracts the stable subset of runtime display flags from Appearance Lab
 * so that FamilyTree and SmartPersonaDrawer can consume them directly.
 * 
 * READ: from the new appearanceSlice (parity migration complete for this hook)
 * WRITE: N/A — read-only adapter.
 */
export const useTreeAppearanceAdapter = (): Partial<TreeSettings> => {
    return useAppStore(
        useShallow((state) => mapAppearanceLabStateToTreeSettings(state.appearance))
    );
};
