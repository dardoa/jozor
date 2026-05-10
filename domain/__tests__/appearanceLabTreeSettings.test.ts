import { describe, expect, it } from 'vitest';
import { DEFAULT_APPEARANCE_STATE } from '../../store/useTreeAppearanceStore';
import { mapAppearanceLabStateToTreeSettings } from '../appearanceLabTreeSettings';

describe('mapAppearanceLabStateToTreeSettings', () => {
  it('maps Appearance Lab state into the canonical visual TreeSettings patch', () => {
    const settings = mapAppearanceLabStateToTreeSettings({
      ...DEFAULT_APPEARANCE_STATE,
      coreEngine: {
        treeMode: 'focus',
        orientation: 'horizontal',
      },
      layout: {
        zoom: 210,
        horizontalSpread: 160,
        verticalSpread: 280,
      },
      contentVisibility: {
        ...DEFAULT_APPEARANCE_STATE.contentVisibility,
        photos: false,
        names: {
          showBaseName: true,
          showMiddleName: true,
          showNickname: true,
          showSuffix: false,
        },
      },
      advanced: {
        ...DEFAULT_APPEARANCE_STATE.advanced,
        nodeDetails: {
          ...DEFAULT_APPEARANCE_STATE.advanced.nodeDetails,
          generationLimit: 7,
          lineStyle: 'step',
          lineThickness: 4,
        },
      },
    });

    expect(settings).toMatchObject({
      chartType: 'focus',
      layoutMode: 'horizontal',
      nodeWidth: 210,
      nodeSpacingX: 160,
      nodeSpacingY: 280,
      showPhotos: false,
      showFirstName: true,
      showLastName: true,
      showMiddleName: true,
      showNickname: true,
      showSuffix: false,
      showMaidenName: false,
      showPrefix: false,
      generationLimit: 7,
      lineStyle: 'step',
      lineThickness: 4,
    });
  });

  it('normalizes radial mode into radial layout semantics', () => {
    const settings = mapAppearanceLabStateToTreeSettings({
      ...DEFAULT_APPEARANCE_STATE,
      coreEngine: {
        treeMode: 'radial',
        orientation: 'horizontal',
      },
    });

    expect(settings.chartType).toBe('radial');
    expect(settings.layoutMode).toBe('radial');
  });
});
