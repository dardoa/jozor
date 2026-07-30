import { useState, useCallback, useMemo } from 'react';
import {
  createInitialPosterDesignState,
  applyPreset,
  isPresetModified,
  updateSharedSetting,
  updateTieredBucket,
  updateProductBucket,
  resetSection as resetSectionState,
  resetPoster as resetPosterState,
  PosterHistoryManager,
  normalizePresetId,
} from '../../../publishing';
import type {
  PosterDesignState,
  PosterProductMode,
  PosterTreeScope,
  SharedPosterSettings,
  TieredSettingsBucket,
  ProductModeSettingsBucket,
} from '../../../publishing';

export interface UsePosterDesignStateReturn {
  readonly state: PosterDesignState;
  readonly isModified: boolean;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly selectPreset: (presetId: string) => void;
  readonly updateContent: (updates: Partial<SharedPosterSettings> & { scope?: PosterTreeScope }) => void;
  readonly updateLayout: (updates: Partial<SharedPosterSettings> & Partial<TieredSettingsBucket>) => void;
  readonly updateCards: (updates: Partial<SharedPosterSettings>) => void;
  readonly updateAppearance: (updates: Partial<SharedPosterSettings>) => void;
  readonly updatePrint: (updates: Partial<SharedPosterSettings> & Partial<ProductModeSettingsBucket>) => void;
  readonly switchProductMode: (mode: PosterProductMode) => void;
  readonly switchScope: (scope: PosterTreeScope) => void;
  readonly resetSection: (sectionId: 'content' | 'layout' | 'cards' | 'appearance' | 'print') => void;
  readonly resetPoster: (presetId?: string) => void;
  readonly undo: () => void;
  readonly redo: () => void;
}

export function usePosterDesignState(initialPresetId: string = 'classic-heritage'): UsePosterDesignStateReturn {
  const historyManager = useMemo(() => {
    const initialState = createInitialPosterDesignState(initialPresetId);
    return new PosterHistoryManager(initialState);
  }, [initialPresetId]);

  const [state, setState] = useState<PosterDesignState>(() => historyManager.getPresentState());

  const applyStateUpdate = useCallback(
    (updater: (current: PosterDesignState) => PosterDesignState) => {
      setState((prev) => {
        const next = updater(prev);
        if (next !== prev) {
          historyManager.pushState(next);
        }
        return historyManager.getPresentState();
      });
    },
    [historyManager]
  );

  const selectPreset = useCallback(
    (presetId: string) => {
      applyStateUpdate((current) => applyPreset(current, presetId));
    },
    [applyStateUpdate]
  );

  const updateContent = useCallback(
    (updates: Partial<SharedPosterSettings> & { scope?: PosterTreeScope }) => {
      applyStateUpdate((current) => {
        let next = { ...current };
        if (updates.scope && updates.scope !== current.scope) {
          next.scope = updates.scope;
        }
        const sharedKeys = Object.keys(updates).filter((k) => k !== 'scope') as Array<keyof SharedPosterSettings>;
        for (const key of sharedKeys) {
          if (updates[key] !== undefined) {
            next = updateSharedSetting(next, key, updates[key] as SharedPosterSettings[typeof key]);
          }
        }
        return next;
      });
    },
    [applyStateUpdate]
  );

  const updateLayout = useCallback(
    (updates: Partial<SharedPosterSettings> & Partial<TieredSettingsBucket>) => {
      applyStateUpdate((current) => {
        let next = { ...current };
        if (updates.generationDepth !== undefined) {
          next = updateTieredBucket(next, { generationDepth: updates.generationDepth });
        }
        if (updates.direction !== undefined) {
          next = updateSharedSetting(next, 'direction', updates.direction);
        }
        if (updates.spacing !== undefined) {
          next = updateSharedSetting(next, 'spacing', updates.spacing);
        }
        return next;
      });
    },
    [applyStateUpdate]
  );

  const updateCards = useCallback(
    (updates: Partial<SharedPosterSettings>) => {
      applyStateUpdate((current) => {
        let next = { ...current };
        for (const [key, val] of Object.entries(updates)) {
          if (val !== undefined) {
            next = updateSharedSetting(next, key as keyof SharedPosterSettings, val);
          }
        }
        return next;
      });
    },
    [applyStateUpdate]
  );

  const updateAppearance = useCallback(
    (updates: Partial<SharedPosterSettings>) => {
      applyStateUpdate((current) => {
        let next = { ...current };
        for (const [key, val] of Object.entries(updates)) {
          if (val !== undefined) {
            next = updateSharedSetting(next, key as keyof SharedPosterSettings, val);
          }
        }
        return next;
      });
    },
    [applyStateUpdate]
  );

  const updatePrint = useCallback(
    (updates: Partial<SharedPosterSettings> & Partial<ProductModeSettingsBucket>) => {
      applyStateUpdate((current) => {
        const {
          tiledRows,
          tiledColumns,
          tiledSheetSize,
          tiledOverlapMm,
          branchCollectionIndexTitle,
          ...sharedUpdates
        } = updates;

        let next = current;

        const productBucketUpdates: Partial<ProductModeSettingsBucket> = {
          ...(tiledRows !== undefined ? { tiledRows } : {}),
          ...(tiledColumns !== undefined ? { tiledColumns } : {}),
          ...(tiledSheetSize !== undefined ? { tiledSheetSize } : {}),
          ...(tiledOverlapMm !== undefined ? { tiledOverlapMm } : {}),
          ...(branchCollectionIndexTitle !== undefined ? { branchCollectionIndexTitle } : {}),
        };

        if (Object.keys(productBucketUpdates).length > 0) {
          next = updateProductBucket(next, productBucketUpdates);
        }

        for (const [key, val] of Object.entries(sharedUpdates)) {
          if (val !== undefined) {
            next = updateSharedSetting(
              next,
              key as keyof SharedPosterSettings,
              val as SharedPosterSettings[keyof SharedPosterSettings]
            );
          }
        }
        return next;
      });
    },
    [applyStateUpdate]
  );

  const switchProductMode = useCallback(
    (mode: PosterProductMode) => {
      applyStateUpdate((current) => {
        if (current.productMode === mode) return current;

        let nextScope = current.scope;
        if (mode === 'full-tree-overview' || mode === 'tiled-wall' || mode === 'branch-collection') {
          nextScope = 'full-tree';
        } else if (mode === 'detailed-poster' && nextScope === 'full-tree') {
          nextScope = 'ancestors';
        }

        return {
          ...current,
          productMode: mode,
          scope: nextScope,
        };
      });
    },
    [applyStateUpdate]
  );

  const switchScope = useCallback(
    (scope: PosterTreeScope) => {
      applyStateUpdate((current) => {
        if (current.scope === scope) return current;

        let nextProductMode = current.productMode;
        if (scope !== 'full-tree' && current.productMode !== 'detailed-poster') {
          nextProductMode = 'detailed-poster';
        } else if (scope === 'full-tree' && current.productMode === 'detailed-poster') {
          nextProductMode = 'full-tree-overview';
        }

        return {
          ...current,
          productMode: nextProductMode,
          scope,
        };
      });
    },
    [applyStateUpdate]
  );

  const resetSection = useCallback(
    (sectionId: 'content' | 'layout' | 'cards' | 'appearance' | 'print') => {
      applyStateUpdate((current) => resetSectionState(current, sectionId));
    },
    [applyStateUpdate]
  );

  const resetPoster = useCallback(
    (presetId?: string) => {
      applyStateUpdate((current) => resetPosterState(current, presetId ? normalizePresetId(presetId) : current.activePresetId));
    },
    [applyStateUpdate]
  );

  const undo = useCallback(() => {
    const prev = historyManager.undo();
    if (prev) {
      setState(prev);
    }
  }, [historyManager]);

  const redo = useCallback(() => {
    const next = historyManager.redo();
    if (next) {
      setState(next);
    }
  }, [historyManager]);

  const isModified = useMemo(() => isPresetModified(state), [state]);
  // canUndo/canRedo are derived directly from historyManager; they re-evaluate
  // on every render triggered by state changes (which always accompany history changes).
  const canUndo = historyManager.canUndo();
  const canRedo = historyManager.canRedo();

  return {
    state,
    isModified,
    canUndo,
    canRedo,
    selectPreset,
    updateContent,
    updateLayout,
    updateCards,
    updateAppearance,
    updatePrint,
    switchProductMode,
    switchScope,
    resetSection,
    resetPoster,
    undo,
    redo,
  };
}
