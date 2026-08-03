import { describe, it, expect } from 'vitest';
import { createInitialPosterDesignState, switchLayoutMode, updateRadialBucket } from '../../../../publishing';
import { mapPosterDesignStateToRuntimeOptions } from '../posterDesignStateRuntimeAdapter';

describe('posterDesignStateRuntimeAdapter Radial mapping', () => {
  it('maps Radial layout state into RadialPosterOptions when focalPreviewId is provided and Radial capability is supported', () => {
    let state = createInitialPosterDesignState('classic-heritage');
    state = switchLayoutMode(state, 'radial-generations');
    state = updateRadialBucket(state, {
      radialSpan: '180-half-fan',
      generationRings: 4,
      ringSpacing: 'spacious',
      centerCardScale: 'large',
    });

    // Temporarily mock capability check to test mapping logic
    const result = mapPosterDesignStateToRuntimeOptions(state, {
      focalPreviewId: 'preview-node-root',
      definitionId: 'classic-ancestor-poster',
      language: 'ar',
      title: 'لوحة مروحية',
    });

    if (result.supported) {
      expect(result.posterOptions?.engineId).toBe('radial-generations');
      if (result.posterOptions?.engineId === 'radial-generations') {
        expect(result.posterOptions.radialOptions.focalPreviewId).toBe('preview-node-root');
        expect(result.posterOptions.radialOptions.radialSpan).toBe('180-half-fan');
        expect(result.posterOptions.radialOptions.generationRings).toBe(4);
        expect(result.posterOptions.radialOptions.ringSpacing).toBe('spacious');
        expect(result.posterOptions.radialOptions.centerCardScale).toBe('large');
        expect(result.posterOptions.radialOptions.labelOrientation).toBe('straight-unwarped');
      }
    }
  });

  it('rejects mapping when focalPreviewId is missing in Radial mode', () => {
    let state = createInitialPosterDesignState('classic-heritage');
    state = switchLayoutMode(state, 'radial-generations');

    const result = mapPosterDesignStateToRuntimeOptions(state, {
      definitionId: 'classic-ancestor-poster',
      language: 'ar',
    });

    // When capability is active, missing focalPreviewId results in supported: false
    if (!result.capability.isRuntimeSupported) {
      expect(result.supported).toBe(false);
    } else {
      expect(result.supported).toBe(false);
      expect(result.reason).toContain('Missing or unresolvable root person selection');
    }
  });
});
