import { useEffect, useRef, useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { DEFAULT_TREE_SETTINGS } from '../../constants';
import { updateTreeSettings } from '../../services/supabaseTreeMutationService';
import { logError } from '../../utils/errorLogger';
import { buildPersistedTreeSettings } from '../../domain/appearance/appearancePersistence';
import { hydrateAppearanceLabFromLegacy } from '../../domain/appearance/appearanceHydration';
import { useShallow } from 'zustand/react/shallow';

const SAFE_TO_PERSIST = [
  'nodeSpacingX', 'nodeSpacingY', 'nodeWidth', 'textSize',
  'themeColor', 'layoutMode', 'chartType', 'lineStyle',
  'lineThickness', 'boxColorLogic', 'showPhotos', 'showFirstName',
  'showLastName', 'showMiddleName', 'showBirthDate', 'showDeathDate',
  'showDates', 'showMarriageDate', 'showBirthPlace', 'showMarriagePlace',
  'showBurialPlace', 'showNickname', 'showSuffix', 'showPrefix',
  'showMaidenName', 'isCompact', 'privacyMode',
  'generationLimit', 'highlightBranch', 'highlightedBranchRootId',
] as const;

/**
 * Hook to manage tree visualization settings.
 * Persists settings to localStorage and sources from Zustand store.
 * 
 * This hook merges persisted AppStore settings with the live Appearance Lab
 * state to provide a single reactive view for the rendering engine.
 */
export const useTreeSettings = () => {
  const treeSettings = useAppStore((state) => state.treeSettings);
  const setTreeSettings = useAppStore((state) => state.setTreeSettings);
  const importSettings = useAppStore((state) => state.importSettings);
  const currentTreeId = useAppStore((state) => state.currentTreeId);
  const user = useAppStore((state) => state.user);

  const appearanceSettings = useAppStore(useShallow((state) => ({
    coreEngine: state.appearance.coreEngine,
    layout: state.appearance.layout,
    contentVisibility: state.appearance.contentVisibility,
    advanced: state.appearance.advanced,
  })));

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Computed Merged Settings (The "Live View")
  const mergedSettings = useMemo(() => {
      // Pass the full appearance state explicitly — no internal store reads
      return buildPersistedTreeSettings(treeSettings, appearanceSettings);
  }, [appearanceSettings, treeSettings]);

  // Initial load from localStorage on mount (for Guest Mode)
  useEffect(() => {
    if (typeof window !== 'undefined' && !currentTreeId) {
      try {
        const savedSettings = localStorage.getItem('treeSettings');
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          const merged = { ...DEFAULT_TREE_SETTINGS, ...parsed };
          importSettings({ treeSettings: merged });
          // Rehydrate the appearance slice from the loaded settings
          // so guest users recover their saved visual preferences.
          hydrateAppearanceLabFromLegacy(merged);
        }
      } catch (e) {
        logError('useTreeSettings loadLocalStorage', e, {
          category: 'VALIDATION',
          severity: 'LOW',
          metadata: { operationType: 'load_tree_settings' }
        });
      }
    }
  }, [importSettings, currentTreeId]);

  // Persist ONLY safe/cosmetic settings to localStorage.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const persistedSettings = buildPersistedTreeSettings(treeSettings, appearanceSettings);
      const toSave = Object.fromEntries(
        SAFE_TO_PERSIST.map(k => [k, persistedSettings[k as keyof typeof persistedSettings]])
      );
      localStorage.setItem('treeSettings', JSON.stringify(toSave));
    }
  }, [appearanceSettings, treeSettings]);

  // Sync settings to Supabase (Debounced)
  useEffect(() => {
    if (!currentTreeId || !user) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        const persistedSettings = buildPersistedTreeSettings(treeSettings, appearanceSettings);
        await updateTreeSettings(currentTreeId, user.uid, user.email, persistedSettings);
      } catch (e) {
        logError('useTreeSettings syncSupabase', e, {
          category: 'SYNC',
          severity: 'MEDIUM',
          metadata: { treeId: currentTreeId, operationType: 'sync_tree_settings' }
        });
      }
    }, 1000); // 1s debounce to prevent spamming

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [appearanceSettings, currentTreeId, treeSettings, user]);

  return { treeSettings: mergedSettings, setTreeSettings };
};
