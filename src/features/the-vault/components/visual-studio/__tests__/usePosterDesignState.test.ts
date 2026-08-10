import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePosterDesignState } from '../usePosterDesignState';

describe('Phase 1B: usePosterDesignState React Hook', () => {
  it('initializes with classic-heritage preset baseline', () => {
    const { result } = renderHook(() => usePosterDesignState('classic-heritage'));
    expect(result.current.state.activePresetId).toBe('classic-heritage');
    expect(result.current.state.shared.colorPalette).toBe('heritage-warm');
    expect(result.current.state.shared.fontFamily).toBe('amiri');
    expect(result.current.isModified).toBe(false);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('selects preset and updates activePresetId while clearing overrides', () => {
    const { result } = renderHook(() => usePosterDesignState('classic-heritage'));

    act(() => {
      result.current.updateContent({ photoShape: 'square' });
    });
    expect(result.current.isModified).toBe(true);

    act(() => {
      result.current.selectPreset('modern-gallery');
    });

    expect(result.current.state.activePresetId).toBe('modern-gallery');
    expect(result.current.state.shared.colorPalette).toBe('gallery-dark');
    expect(result.current.isModified).toBe(false);
  });

  it('handles section resets cleanly', () => {
    const { result } = renderHook(() => usePosterDesignState('classic-heritage'));

    act(() => {
      result.current.updateContent({ footerText: 'Custom Footer' });
      result.current.updateCards({ photoShape: 'square' });
    });

    act(() => {
      result.current.resetSection('content');
    });

    expect(result.current.state.shared.footerText).toBe('');
    expect(result.current.state.shared.photoShape).toBe('square'); // Cards section untouched
  });

  it('handles bounded undo and redo operations', () => {
    const { result } = renderHook(() => usePosterDesignState('classic-heritage'));

    act(() => {
      result.current.updatePrint({ size: 'A2' });
    });
    expect(result.current.state.shared.size).toBe('A2');
    expect(result.current.canUndo).toBe(true);

    act(() => {
      result.current.undo();
    });
    expect(result.current.state.shared.size).toBe('A3');
    expect(result.current.canRedo).toBe(true);

    act(() => {
      result.current.redo();
    });
    expect(result.current.state.shared.size).toBe('A2');
  });

  it('preserves inactive focus and radial buckets when updating tiered settings', () => {
    const { result } = renderHook(() => usePosterDesignState('classic-heritage'));

    const initialFocus = { ...result.current.state.focus };
    const initialRadial = { ...result.current.state.radial };

    act(() => {
      result.current.updateLayout({ generationDepth: 2 });
    });

    expect(result.current.state.tiered.generationDepth).toBe(2);
    expect(result.current.state.focus).toEqual(initialFocus);
    expect(result.current.state.radial).toEqual(initialRadial);
  });

  it('participates selectedPosterRootToken in updateContent, undo, redo, and resetContent', () => {
    const { result } = renderHook(() => usePosterDesignState('classic-heritage'));

    expect(result.current.state.shared.selectedPosterRootToken).toBe('preview-root-1');

    act(() => {
      result.current.updateContent({ selectedPosterRootToken: 'preview-root-2' });
    });
    expect(result.current.state.shared.selectedPosterRootToken).toBe('preview-root-2');
    expect(result.current.canUndo).toBe(true);

    act(() => {
      result.current.undo();
    });
    expect(result.current.state.shared.selectedPosterRootToken).toBe('preview-root-1');

    act(() => {
      result.current.redo();
    });
    expect(result.current.state.shared.selectedPosterRootToken).toBe('preview-root-2');

    act(() => {
      result.current.resetSection('content');
    });
    expect(result.current.state.shared.selectedPosterRootToken).toBe('preview-root-1');
  });

  it('updates productBucket settings cleanly via updatePrint in a compile-safe manner', () => {
    const { result } = renderHook(() => usePosterDesignState('classic-heritage'));

    act(() => {
      result.current.updatePrint({
        size: 'A2',
        tiledRows: 3,
        tiledColumns: 4,
        branchCollectionIndexTitle: 'My Family Index',
      });
    });

    expect(result.current.state.shared.size).toBe('A2');
    expect(result.current.state.productBucket.tiledRows).toBe(3);
    expect(result.current.state.productBucket.tiledColumns).toBe(4);
    expect(result.current.state.productBucket.branchCollectionIndexTitle).toBe('My Family Index');
  });

  it('normalizes Radial to Tiered when switching to a full-tree product or scope', () => {
    const { result } = renderHook(() => usePosterDesignState('classic-heritage'));

    act(() => {
      result.current.switchLayoutMode('radial-generations');
      result.current.switchScope('descendants');
    });

    expect(result.current.state.layoutMode).toBe('radial-generations');
    expect(result.current.state.scope).toBe('descendants');

    act(() => {
      result.current.switchProductMode('full-tree-overview');
    });

    expect(result.current.state.productMode).toBe('full-tree-overview');
    expect(result.current.state.layoutMode).toBe('tiered');
    expect(result.current.state.scope).toBe('full-tree');
    expect(result.current.state.radial.lastRadialScope).toBe('descendants');

    act(() => {
      result.current.switchProductMode('detailed-poster');
      result.current.switchLayoutMode('radial-generations');
    });

    expect(result.current.state.productMode).toBe('detailed-poster');
    expect(result.current.state.layoutMode).toBe('radial-generations');
    expect(result.current.state.scope).toBe('descendants');

    act(() => {
      result.current.switchScope('full-tree');
    });

    expect(result.current.state.productMode).toBe('full-tree-overview');
    expect(result.current.state.layoutMode).toBe('tiered');
    expect(result.current.state.scope).toBe('full-tree');
  });
});
