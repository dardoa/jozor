import { describe, it, expect } from 'vitest';
import { createInitialPosterDesignState, applyPreset, switchLayoutMode } from '../../../../publishing';
import { mapPosterDesignStateToRuntimeOptions } from '../posterDesignStateRuntimeAdapter';

describe('Phase 1B: posterDesignStateRuntimeAdapter', () => {
  it('maps valid Tiered detailed poster state to VisualStudioPosterOptions with complete field parity', () => {
    const state = createInitialPosterDesignState('classic-heritage');
    const result = mapPosterDesignStateToRuntimeOptions(state);

    expect(result.supported).toBe(true);
    expect(result.posterOptions).toBeDefined();

    const opts = result.posterOptions!;
    expect(opts.scope).toBe('ancestors');
    expect(opts.generationDepth).toBe(4);
    expect(opts.size).toBe('A3');
    expect(opts.orientation).toBe('landscape');
    expect(opts.marginPreset).toBe('balanced');
    expect(opts.direction).toBe('horizontal');
    expect(opts.privacyMode).toBe('masked');
    expect(opts.includePhotos).toBe(true);
    expect(opts.hideLivingPhotos).toBe(true);
    expect(opts.photoShape).toBe('circle');
    expect(opts.showYears).toBe(true);
    expect(opts.showRelationship).toBe(false);
    expect(opts.showBirthPlace).toBe(false);
    expect(opts.showOccupation).toBe(false);
    expect(opts.showDescription).toBe(false);
    expect(opts.connectorStyle).toBe('classic');
    expect(opts.connectorPath).toBe('style-default');
    expect(opts.spacing).toBe('balanced');
    expect(opts.colorPalette).toBe('heritage-warm');
    expect(opts.decoration).toBe('lineage-grid');
    expect(opts.ornament).toBe('corner-branches');
    expect(opts.typography).toBe('prominent');
    expect(opts.fontFamily).toBe('amiri');
    expect(opts.cardScale).toBe('standard');
    expect(opts.cardEffect).toBe('soft');
    expect(opts.cardFrame).toBe('classic');
    expect(opts.cardCorner).toBe('soft');
    expect(opts.cardLayout).toBe('style-default');
    expect(opts.pageFrame).toBe('heritage');
    expect(opts.header).toBe('ceremonial');
    expect(opts.footerText).toBe('');
    expect(opts.showJozorAttribution).toBe(true);
    expect(opts.productMode).toBe('detailed-poster');
  });

  it('maps Modern Gallery preset with complete field parity', () => {
    const state = applyPreset(createInitialPosterDesignState('classic-heritage'), 'modern-gallery');
    const result = mapPosterDesignStateToRuntimeOptions(state);

    expect(result.supported).toBe(true);
    expect(result.posterOptions).toBeDefined();
    const opts = result.posterOptions!;
    expect(opts.colorPalette).toBe('gallery-dark');
    expect(opts.fontFamily).toBe('noto-sans-arabic');
    expect(opts.cardCorner).toBe('rounded');
  });

  it('rejects Focus Family mapping when the resolved focal preview ID is missing', () => {
    let state = createInitialPosterDesignState('classic-heritage');
    state = switchLayoutMode(state, 'focus-family');

    const result = mapPosterDesignStateToRuntimeOptions(state);
    expect(result.supported).toBe(false);
    expect(result.posterOptions).toBeUndefined();
    expect(result.reason).toBe('Missing or unresolvable focal person selection.');
  });

  it('rejects Radial Generations layout mode as unsupported in current runtime', () => {
    let state = createInitialPosterDesignState('classic-heritage');
    state = switchLayoutMode(state, 'radial-generations');

    const result = mapPosterDesignStateToRuntimeOptions(state);
    expect(result.supported).toBe(false);
    expect(result.posterOptions).toBeUndefined();
    expect(result.reason).toBeDefined();
  });
});
