import { describe, it, expect } from 'vitest';
import { createInitialPosterDesignState, switchLayoutMode, updateRadialBucket } from '../posterDesignState';

describe('posterDesignState Radial atomic scope switching', () => {
  it('switches from Tiered to Radial, preserving Tiered scope and restoring Radial scope', () => {
    let state = createInitialPosterDesignState('classic-heritage'); // scope='ancestors', tiered.lastTieredScope='ancestors'
    
    // User switches Tiered to descendants
    state = { ...state, scope: 'descendants', tiered: { ...state.tiered, lastTieredScope: 'descendants' } };

    // Switch to Radial
    state = switchLayoutMode(state, 'radial-generations');
    expect(state.layoutMode).toBe('radial-generations');
    expect(state.scope).toBe('ancestors'); // restored from default radial.lastRadialScope ('ancestors')
    expect(state.tiered.lastTieredScope).toBe('descendants'); // preserved

    // Change radial scope to descendants
    state = { ...state, scope: 'descendants', radial: { ...state.radial, lastRadialScope: 'descendants' } };

    // Switch back to Tiered
    state = switchLayoutMode(state, 'tiered');
    expect(state.layoutMode).toBe('tiered');
    expect(state.scope).toBe('descendants'); // restored from tiered.lastTieredScope
    expect(state.radial.lastRadialScope).toBe('descendants'); // preserved
  });

  it('switches from Focus to Radial, restoring Radial scope and preserving Focus scope around-person', () => {
    let state = createInitialPosterDesignState('classic-heritage');
    state = switchLayoutMode(state, 'focus-family');
    expect(state.layoutMode).toBe('focus-family');
    expect(state.scope).toBe('around-person');

    // Switch Focus to Radial
    state = switchLayoutMode(state, 'radial-generations');
    expect(state.layoutMode).toBe('radial-generations');
    expect(state.scope).toBe('ancestors'); // restored radial scope

    // Switch Radial back to Focus
    state = switchLayoutMode(state, 'focus-family');
    expect(state.layoutMode).toBe('focus-family');
    expect(state.scope).toBe('around-person');
  });

  it('updates Radial bucket settings correctly', () => {
    let state = createInitialPosterDesignState('classic-heritage');
    state = updateRadialBucket(state, {
      radialSpan: '180-half-fan',
      generationRings: 4,
      ringSpacing: 'spacious',
      centerCardScale: 'large',
    });

    expect(state.radial.radialSpan).toBe('180-half-fan');
    expect(state.radial.generationRings).toBe(4);
    expect(state.radial.ringSpacing).toBe('spacious');
    expect(state.radial.centerCardScale).toBe('large');
    expect(state.radial.labelOrientation).toBe('straight-unwarped');
  });

  it('handles all directed mode transitions in a table-driven test', () => {
    type TestMatrixEntry = {
      fromMode: 'tiered' | 'focus-family' | 'radial-generations';
      toMode: 'tiered' | 'focus-family' | 'radial-generations';
      initialScope: 'ancestors' | 'descendants' | 'full-tree' | 'around-person';
      initialTieredLastScope: 'ancestors' | 'descendants' | 'full-tree';
      initialRadialLastScope: 'ancestors' | 'descendants';
      expectedTargetScope: 'ancestors' | 'descendants' | 'full-tree' | 'around-person';
      expectedTieredLastScope: 'ancestors' | 'descendants' | 'full-tree';
      expectedRadialLastScope: 'ancestors' | 'descendants';
    };

    const transitionCases: TestMatrixEntry[] = [
      {
        fromMode: 'tiered',
        toMode: 'focus-family',
        initialScope: 'descendants',
        initialTieredLastScope: 'ancestors',
        initialRadialLastScope: 'ancestors',
        expectedTargetScope: 'around-person',
        expectedTieredLastScope: 'descendants',
        expectedRadialLastScope: 'ancestors',
      },
      {
        fromMode: 'focus-family',
        toMode: 'tiered',
        initialScope: 'around-person',
        initialTieredLastScope: 'full-tree',
        initialRadialLastScope: 'ancestors',
        expectedTargetScope: 'full-tree',
        expectedTieredLastScope: 'full-tree',
        expectedRadialLastScope: 'ancestors',
      },
      {
        fromMode: 'tiered',
        toMode: 'radial-generations',
        initialScope: 'descendants',
        initialTieredLastScope: 'ancestors',
        initialRadialLastScope: 'ancestors',
        expectedTargetScope: 'ancestors',
        expectedTieredLastScope: 'descendants',
        expectedRadialLastScope: 'ancestors',
      },
      {
        fromMode: 'radial-generations',
        toMode: 'tiered',
        initialScope: 'descendants',
        initialTieredLastScope: 'full-tree',
        initialRadialLastScope: 'ancestors',
        expectedTargetScope: 'full-tree',
        expectedTieredLastScope: 'full-tree',
        expectedRadialLastScope: 'descendants',
      },
      {
        fromMode: 'radial-generations',
        toMode: 'focus-family',
        initialScope: 'descendants',
        initialTieredLastScope: 'full-tree',
        initialRadialLastScope: 'ancestors',
        expectedTargetScope: 'around-person',
        expectedTieredLastScope: 'full-tree', // PROVES Tiered scope is preserved!
        expectedRadialLastScope: 'descendants',
      },
      {
        fromMode: 'focus-family',
        toMode: 'radial-generations',
        initialScope: 'around-person',
        initialTieredLastScope: 'full-tree',
        initialRadialLastScope: 'descendants',
        expectedTargetScope: 'descendants',
        expectedTieredLastScope: 'full-tree', // PROVES Tiered scope is preserved!
        expectedRadialLastScope: 'descendants',
      },
    ];

    for (const testCase of transitionCases) {
      let state = createInitialPosterDesignState('classic-heritage');
      state = {
        ...state,
        layoutMode: testCase.fromMode,
        scope: testCase.initialScope,
        tiered: { ...state.tiered, lastTieredScope: testCase.initialTieredLastScope },
        radial: { ...state.radial, lastRadialScope: testCase.initialRadialLastScope },
      };

      const result = switchLayoutMode(state, testCase.toMode);

      expect(result.layoutMode).toBe(testCase.toMode);
      expect(result.scope).toBe(testCase.expectedTargetScope);
      expect(result.tiered.lastTieredScope).toBe(testCase.expectedTieredLastScope);
      expect(result.radial.lastRadialScope).toBe(testCase.expectedRadialLastScope);
    }
  });
});
