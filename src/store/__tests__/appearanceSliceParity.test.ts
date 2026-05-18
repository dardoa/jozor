import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from '../useAppStore';
import {
  DEFAULT_APPEARANCE_STATE,
  type AppearanceState,
} from '../../domain/appearance/appearanceEngine';

/**
 * appearanceSlice — integration tests
 *
 * Phase 5: useAppStore.appearance is the sole SSOT.
 * These tests verify that every action on the appearance slice
 * produces the correct state without any dual-store comparison.
 */

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const getAppearance = (): AppearanceState =>
  clone(useAppStore.getState().appearance);

describe('appearanceSlice parity', () => {
  beforeEach(() => {
    localStorage.clear();
    act(() => {
      useAppStore.getState().resetAppearanceToDefault();
    });
  });

  it('starts with the default appearance state', () => {
    expect(getAppearance()).toEqual(DEFAULT_APPEARANCE_STATE);
  });

  it('setAppearancePalette, setAppearanceFontMode, setAppearanceDensity, setAppearanceRadiusMode update appearance', () => {
    act(() => {
      useAppStore.getState().setAppearancePalette('rose-ledger');
      useAppStore.getState().setAppearanceFontMode('modern');
      useAppStore.getState().setAppearanceDensity('airy');
      useAppStore.getState().setAppearanceRadiusMode('grand');
    });

    const state = getAppearance();
    expect(state.paletteId).toBe('rose-ledger');
    expect(state.fontMode).toBe('modern');
    expect(state.density).toBe('airy');
    expect(state.radiusMode).toBe('grand');
  });

  it('applyAppearancePreset updates theme tokens and meta', () => {
    act(() => {
      useAppStore.getState().applyAppearancePreset('modernPure');
    });

    const state = getAppearance();
    expect(state.theme.themeStyle).toBe('modernPure');
    expect(state.meta.activePreset).toBe('modernPure');
  });

  it('updateAppearanceField updates nested paths correctly', () => {
    act(() => {
      useAppStore.getState().updateAppearanceField('layout.zoom', 220);
      useAppStore.getState().updateAppearanceField('contentVisibility.names.showNickname', true);
      useAppStore.getState().updateAppearanceField('advanced.layoutEngine.highlightBranch', true);
    });

    const state = getAppearance();
    expect(state.layout.zoom).toBe(220);
    expect(state.contentVisibility.names.showNickname).toBe(true);
    expect(state.advanced.layoutEngine.highlightBranch).toBe(true);
  });

  it('hydrateAppearanceState replaces state with the provided payload', () => {
    const nextState: AppearanceState = {
      ...clone(DEFAULT_APPEARANCE_STATE),
      coreEngine: {
        treeMode: 'focus',
        orientation: 'horizontal',
      },
      layout: {
        zoom: 240,
        horizontalSpread: 180,
        verticalSpread: 360,
      },
    };

    act(() => {
      useAppStore.getState().hydrateAppearanceState(nextState);
    });

    const state = getAppearance();
    expect(state.coreEngine.orientation).toBe('horizontal');
    expect(state.layout.zoom).toBe(240);
    expect(state.layout.horizontalSpread).toBe(180);
  });

  it('resetAppearanceToDefault restores the default state', () => {
    act(() => {
      useAppStore.getState().setAppearancePalette('rose-ledger');
      useAppStore.getState().updateAppearanceField('layout.zoom', 300);
    });

    act(() => {
      useAppStore.getState().resetAppearanceToDefault();
    });

    expect(getAppearance()).toEqual(DEFAULT_APPEARANCE_STATE);
  });
});
