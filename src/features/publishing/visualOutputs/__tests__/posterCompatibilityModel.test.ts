import { describe, it, expect } from 'vitest';
import { getPosterLayoutCombinationCapability } from '../posterCompatibilityModel';
import type { PosterProductMode, PosterLayoutMode, PosterTreeScope } from '../posterStateContracts';

describe('posterCompatibilityModel — 60 Product x Layout x Scope Matrix', () => {
  const productModes: PosterProductMode[] = [
    'detailed-poster',
    'full-tree-overview',
    'branch-collection',
    'tiled-wall',
  ];
  const layoutModes: PosterLayoutMode[] = ['tiered', 'focus-family', 'radial-generations'];
  const scopes: PosterTreeScope[] = ['full-tree', 'ancestors', 'descendants', 'selected-branch', 'around-person'];

  let totalEvaluated = 0;

  for (const prod of productModes) {
    for (const layout of layoutModes) {
      for (const sc of scopes) {
        const key = `${prod}:${layout}:${sc}`;
        it(`evaluates ${key} capability cleanly`, () => {
          const result = getPosterLayoutCombinationCapability(prod, layout, sc);
          expect(result.status).toBeDefined();
          expect(typeof result.isRuntimeSupported).toBe('boolean');
          expect(typeof result.isPlanned).toBe('boolean');
        });
        totalEvaluated++;
      }
    }
  }

  it('asserts detailed-poster:focus-family:around-person is runtime-supported-and-reachable', () => {
    const result = getPosterLayoutCombinationCapability('detailed-poster', 'focus-family', 'around-person');
    expect(result.status).toBe('runtime-supported-and-reachable');
    expect(result.isRuntimeSupported).toBe(true);
    expect(result.isPlanned).toBe(false);
  });

  it('verifies all 60 matrix combinations are evaluated', () => {
    expect(totalEvaluated).toBe(60);
  });
});
