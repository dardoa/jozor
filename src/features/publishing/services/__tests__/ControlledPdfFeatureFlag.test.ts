import { afterEach, describe, expect, it, vi } from 'vitest';
import { ControlledPdfFeatureFlag } from '../ControlledPdfFeatureFlag';

describe('ControlledPdfFeatureFlag', () => {
  afterEach(() => {
    ControlledPdfFeatureFlag.setTestOverrideForTests(null);
    vi.unstubAllEnvs();
  });

  it('supports overriding state for tests and resetting to null', () => {
    ControlledPdfFeatureFlag.setTestOverrideForTests(true);
    let state = ControlledPdfFeatureFlag.getState();
    expect(state.enabled).toBe(true);
    expect(state.reason).toBe('Controlled PDF feature flag enabled');

    ControlledPdfFeatureFlag.setTestOverrideForTests(false);
    state = ControlledPdfFeatureFlag.getState();
    expect(state.enabled).toBe(false);
    expect(state.reason).toBe('Controlled PDF feature flag disabled');

    ControlledPdfFeatureFlag.setTestOverrideForTests(null);
  });

  it('defaults to disabled when env configuration is absent or false', () => {
    vi.stubEnv('VITE_ENABLE_CONTROLLED_PDF', 'false');
    const state = ControlledPdfFeatureFlag.getState();
    expect(state.enabled).toBe(false);
    expect(state.reason).toContain('disabled by default');
  });

  it('allows enabling when env configuration is set to true', () => {
    vi.stubEnv('VITE_ENABLE_CONTROLLED_PDF', 'true');
    const state = ControlledPdfFeatureFlag.getState();
    expect(state.enabled).toBe(true);
    expect(state.reason).toContain('enabled via configuration');
  });

  it('safe fallback to disabled when env configuration has unrecognized truthy values', () => {
    vi.stubEnv('VITE_ENABLE_CONTROLLED_PDF', 'yes');
    const state1 = ControlledPdfFeatureFlag.getState();
    expect(state1.enabled).toBe(false);

    vi.stubEnv('VITE_ENABLE_CONTROLLED_PDF', '1');
    const state2 = ControlledPdfFeatureFlag.getState();
    expect(state2.enabled).toBe(false);
  });

  it('ignores test override attempts outside test mode', () => {
    vi.stubEnv('MODE', 'production');
    vi.stubEnv('VITE_ENABLE_CONTROLLED_PDF', 'false');

    ControlledPdfFeatureFlag.setTestOverrideForTests(true);

    const state = ControlledPdfFeatureFlag.getState();
    expect(state.enabled).toBe(false);
    expect(state.reason).toContain('disabled by default');
  });
});
