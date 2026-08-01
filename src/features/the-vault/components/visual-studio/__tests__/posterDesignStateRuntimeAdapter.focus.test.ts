import { describe, it, expect } from 'vitest';
import { mapPosterDesignStateToRuntimeOptions } from '../posterDesignStateRuntimeAdapter';
import { createInitialPosterDesignState, switchLayoutMode } from '../../../../publishing/visualOutputs/posterDesignState';

describe('posterDesignStateRuntimeAdapter — Focus Family Integration', () => {
  it('returns supported: false when context.focalPreviewId is missing for Focus layout', () => {
    let state = createInitialPosterDesignState('classic-heritage');
    state = switchLayoutMode(state, 'focus-family');

    const result = mapPosterDesignStateToRuntimeOptions(state);
    expect(result.supported).toBe(false);
    expect(result.reason).toBeDefined();
    expect(result.posterOptions).toBeUndefined();
  });

  it('never falls back to Tiered options when Focus context is missing', () => {
    let state = createInitialPosterDesignState('classic-heritage');
    state = switchLayoutMode(state, 'focus-family');

    const result = mapPosterDesignStateToRuntimeOptions(state, {});
    expect(result.supported).toBe(false);
    expect(result.posterOptions?.engineId).not.toBe('ancestor-tiered');
  });
});
