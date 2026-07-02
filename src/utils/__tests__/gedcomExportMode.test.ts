import { describe, expect, it, beforeEach } from 'vitest';
import {
  getGedcomExportMode,
  setGedcomExportModeOverrideForTests,
} from '../gedcomExportMode';

describe('gedcomExportMode', () => {
  beforeEach(() => {
    // Reset override before each test
    setGedcomExportModeOverrideForTests(null);
  });

  it('Default mode is legacy-array', () => {
    const state = getGedcomExportMode();
    expect(state.relationshipMode).toBe('legacy-array');
    expect(state.reason).toContain('not enabled for production');
  });

  it('Reason is safe and contains no person data', () => {
    const state = getGedcomExportMode();
    expect(state.reason).not.toContain('Person');
    expect(state.reason).not.toContain('name');
  });

  it('Test override can set relationship-edge only under test environment', () => {
    setGedcomExportModeOverrideForTests('relationship-edge');
    const state = getGedcomExportMode();
    expect(state.relationshipMode).toBe('relationship-edge');
    expect(state.reason).toContain('overridden for test environment');
  });

  it('Reset override returns to legacy-array', () => {
    setGedcomExportModeOverrideForTests('relationship-edge');
    expect(getGedcomExportMode().relationshipMode).toBe('relationship-edge');

    setGedcomExportModeOverrideForTests(null);
    expect(getGedcomExportMode().relationshipMode).toBe('legacy-array');
  });
});
