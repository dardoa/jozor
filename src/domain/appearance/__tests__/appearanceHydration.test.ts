import { describe, expect, it, beforeEach } from 'vitest';
import { hydrateAppearanceLabFromLegacy } from '../appearanceHydration';
import { DEFAULT_APPEARANCE_STATE } from '../appearanceEngine';
import { useAppStore } from '../../../store/useAppStore';
import { TreeSettings } from '../../../types';

describe('hydrateAppearanceLabFromLegacy', () => {
  beforeEach(() => {
    // Reset the appearanceSlice before each test
    useAppStore.setState((s) => ({ ...s, appearance: DEFAULT_APPEARANCE_STATE }));
  });

  it('safely performs partial hydration without turning off currently active settings', () => {
    // 1. Arrange: appearance slice has active features
    useAppStore.setState((s) => ({
      ...s,
      appearance: {
        ...DEFAULT_APPEARANCE_STATE,
        contentVisibility: {
          ...DEFAULT_APPEARANCE_STATE.contentVisibility,
          names: {
            showBaseName: true,
            showMiddleName: true,
            showNickname: true,
            showSuffix: true,
          },
          dates: {
            enabled: true,
            birth: true,
            death: true,
            marriage: true,
          },
          places: {
            enabled: true,
            birthPlace: true,
            marriagePlace: true,
            burialPlace: true,
          }
        }
      }
    }));

    // 2. Act: Hydrate with empty settings (partial)
    hydrateAppearanceLabFromLegacy({} as Partial<TreeSettings>);

    // 3. Assert: Existing true values must remain true
    const state = useAppStore.getState().appearance;
    expect(state.contentVisibility.names.showBaseName).toBe(true);
    expect(state.contentVisibility.names.showMiddleName).toBe(true);
    expect(state.contentVisibility.names.showNickname).toBe(true);
    expect(state.contentVisibility.names.showSuffix).toBe(true);

    expect(state.contentVisibility.dates.birth).toBe(true);
    expect(state.contentVisibility.dates.marriage).toBe(true);
    
    expect(state.contentVisibility.places.birthPlace).toBe(true);
    expect(state.contentVisibility.places.marriagePlace).toBe(true);
  });

  it('respects explicitly provided false values in partial payload', () => {
    useAppStore.setState((s) => ({
      ...s,
      appearance: {
        ...DEFAULT_APPEARANCE_STATE,
        contentVisibility: {
          ...DEFAULT_APPEARANCE_STATE.contentVisibility,
          names: { showBaseName: true, showMiddleName: true, showNickname: true, showSuffix: true },
        }
      }
    }));

    // We explicitly turn off showMiddleName, others should stay true
    hydrateAppearanceLabFromLegacy({ showMiddleName: false } as Partial<TreeSettings>);

    const state = useAppStore.getState().appearance;
    expect(state.contentVisibility.names.showBaseName).toBe(true);
    expect(state.contentVisibility.names.showMiddleName).toBe(false); // Overridden
    expect(state.contentVisibility.names.showNickname).toBe(true);
  });

  it('preserves the active orientation when layoutMode is missing in partial hydration payload', () => {
    useAppStore.setState((s) => ({
      ...s,
      appearance: {
        ...DEFAULT_APPEARANCE_STATE,
        coreEngine: {
          treeMode: 'focus',
          orientation: 'horizontal',
        }
      }
    }));

    // Hydrating with empty layoutMode should keep it horizontal
    hydrateAppearanceLabFromLegacy({} as Partial<TreeSettings>);

    const state = useAppStore.getState().appearance;
    expect(state.coreEngine.orientation).toBe('horizontal');
  });

  it('normalizes legacy straight line style to step', () => {
    hydrateAppearanceLabFromLegacy({ lineStyle: 'straight' } as unknown as Partial<TreeSettings>);

    const state = useAppStore.getState().appearance;
    expect(state.advanced.nodeDetails.lineStyle).toBe('step');
  });
});
