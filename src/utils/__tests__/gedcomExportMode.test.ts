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

  it('Default mode is relationship-edge', () => {
    const state = getGedcomExportMode();
    expect(state.relationshipMode).toBe('relationship-edge');
    expect(state.reason).toContain('by default with legacy fallback');
  });

  it('Reason is safe and contains no person data', () => {
    const state = getGedcomExportMode();
    expect(state.reason).not.toContain('Person');
    expect(state.reason).not.toContain('name');
  });

  it('Test override can set legacy-array only under test environment', () => {
    setGedcomExportModeOverrideForTests('legacy-array');
    const state = getGedcomExportMode();
    expect(state.relationshipMode).toBe('legacy-array');
    expect(state.reason).toContain('overridden for test environment');
  });

  it('Reset override returns to relationship-edge', () => {
    setGedcomExportModeOverrideForTests('legacy-array');
    expect(getGedcomExportMode().relationshipMode).toBe('legacy-array');

    setGedcomExportModeOverrideForTests(null);
    expect(getGedcomExportMode().relationshipMode).toBe('relationship-edge');
  });
});
