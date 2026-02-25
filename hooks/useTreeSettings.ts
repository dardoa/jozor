import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { DEFAULT_TREE_SETTINGS } from '../constants';
import { updateTreeSettings } from '../services/supabaseTreeService';

/**
 * Hook to manage tree visualization settings.
 * Persists settings to localStorage and sources from Zustand store.
 */
export const useTreeSettings = () => {
  const treeSettings = useAppStore((state) => state.treeSettings);
  const setTreeSettings = useAppStore((state) => state.setTreeSettings);
  const importSettings = useAppStore((state) => state.importSettings);
  const currentTreeId = useAppStore((state) => state.currentTreeId);
  const user = useAppStore((state) => state.user);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

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
        console.error('Failed to load tree settings from localStorage', e);
      }
    }
  }, [importSettings, currentTreeId]);

  // Persist ONLY safe/cosmetic settings to localStorage.
  // Critical flags like showDeceased are intentionally EXCLUDED to prevent
  // them from silently hiding the entire tree on next session load.
  const SAFE_TO_PERSIST: (keyof typeof treeSettings)[] = [
    'nodeSpacingX', 'nodeSpacingY', 'nodeWidth', 'textSize',
    'themeColor', 'layoutMode', 'chartType', 'lineStyle',
    'lineThickness', 'boxColorLogic', 'showPhotos', 'showFirstName',
    'showLastName', 'showMiddleName', 'showBirthDate', 'showDeathDate',
    'showMinimap', 'isCompact', 'enableTimeOffset',
  ];
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const toSave = Object.fromEntries(
        SAFE_TO_PERSIST.map(k => [k, treeSettings[k as keyof typeof treeSettings]])
      );
      localStorage.setItem('treeSettings', JSON.stringify(toSave));
    }
  }, [treeSettings]);

  // Sync settings to Supabase (Debounced)
  useEffect(() => {
    if (!currentTreeId || !user) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        await updateTreeSettings(currentTreeId, user.uid, user.email, treeSettings);
      } catch (e) {
        console.error('Failed to sync tree settings to Supabase', e);
      }
    }, 1000); // 1s debounce to prevent spamming

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [treeSettings, currentTreeId, user]);

  return { treeSettings, setTreeSettings };
};
