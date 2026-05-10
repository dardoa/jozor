import { useEffect, useRef, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { DEFAULT_TREE_SETTINGS } from '../constants';
import { updateTreeSettings } from '../services/supabaseTreeMutationService';
import { logError } from '../utils/errorLogger';
import { buildPersistedTreeSettings } from '../domain/appearanceLabPersistence';
import { useTreeAppearanceStore } from '../store/useTreeAppearanceStore';
import { useShallow } from 'zustand/react/shallow';

const SAFE_TO_PERSIST = [
  'nodeSpacingX', 'nodeSpacingY', 'nodeWidth', 'textSize',
  'themeColor', 'layoutMode', 'chartType', 'lineStyle',
  'lineThickness', 'boxColorLogic', 'showPhotos', 'showFirstName',
  'showLastName', 'showMiddleName', 'showBirthDate', 'showDeathDate',
  'showDates', 'showMarriageDate', 'showBirthPlace', 'showMarriagePlace',
  'showBurialPlace', 'showNickname', 'showSuffix', 'showPrefix',
  'showMaidenName', 'showMinimap', 'isCompact', 'privacyMode',
  'generationLimit', 'highlightBranch', 'highlightedBranchRootId',
] as const;

/**
 * Hook to manage tree visualization settings.
 * Persists settings to localStorage and sources from Zustand store.
 * 
 * V2 ARCHITECTURE: This hook acts as a BRIDGE. It merges the legacy
 * AppStore settings with the live Appearance Lab state to provide
 * a single, reactive "View" of the settings to the rendering engine.
 */
export const useTreeSettings = () => {
  const treeSettings = useAppStore((state) => state.treeSettings);
  const setTreeSettings = useAppStore((state) => state.setTreeSettings);
  const importSettings = useAppStore((state) => state.importSettings);
  const currentTreeId = useAppStore((state) => state.currentTreeId);
  const user = useAppStore((state) => state.user);

  // Subscribe to core visual slices for live UI updates
  const appearanceTrigger = useTreeAppearanceStore(useShallow(state => ({
    coreEngine: state.coreEngine,
    layout: state.layout,
    contentVisibility: state.contentVisibility,
    advanced: state.advanced,
  })));

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Computed Merged Settings (The "Live View")
  const mergedSettings = useMemo(() => {
      // buildPersistedTreeSettings internally uses useTreeAppearanceStore.getState()
      // but since we depend on appearanceTrigger, this memo will re-run on every lab change.
      return buildPersistedTreeSettings(treeSettings);
  }, [treeSettings, appearanceTrigger]);

  // Initial load from localStorage on mount (for Guest Mode)
  useEffect(() => {
    if (typeof window !== 'undefined' && !currentTreeId) {
      try {
        const savedSettings = localStorage.getItem('treeSettings');
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          importSettings({ treeSettings: { ...DEFAULT_TREE_SETTINGS, ...parsed } });
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
      const persistedSettings = buildPersistedTreeSettings(treeSettings);
      const toSave = Object.fromEntries(
        SAFE_TO_PERSIST.map(k => [k, persistedSettings[k as keyof typeof persistedSettings]])
      );
      localStorage.setItem('treeSettings', JSON.stringify(toSave));
    }
  }, [treeSettings, appearanceTrigger]);

  // Sync settings to Supabase (Debounced)
  useEffect(() => {
    if (!currentTreeId || !user) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        const persistedSettings = buildPersistedTreeSettings(treeSettings);
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
  }, [treeSettings, currentTreeId, user, appearanceTrigger]);

  return { treeSettings: mergedSettings, setTreeSettings };
};
