import { useShallow } from 'zustand/react/shallow';
import { useTreeAppearanceStore } from '../store/useTreeAppearanceStore';
import { TreeSettings } from '../types';
import { mapAppearanceLabStateToTreeSettings } from '../domain/appearanceLabTreeSettings';

/**
 * ADAPTER: useTreeAppearanceStore -> Partial<TreeSettings>
 * 
 * Extracts the stable subset of runtime display flags from Appearance Lab
 * so that FamilyTree and SmartPersonaDrawer can consume them without waiting
 * on the legacy treeSettings bridge.
 * 
 * Provides a read-only shape that exactly shadows legacy treeSettings keys.
 */
export const useTreeAppearanceAdapter = (): Partial<TreeSettings> => {
    return useTreeAppearanceStore(
        useShallow((state) => mapAppearanceLabStateToTreeSettings(state))
    );
};
