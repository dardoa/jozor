
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDetailsPanelAutoOpenOnFocus } from '../useDetailsPanelAutoOpenOnFocus';

describe('useDetailsPanelAutoOpenOnFocus', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('opens the details panel automatically on desktop focus changes', () => {
    const setDetailsPanelOpen = vi.fn();

    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))
    );

    renderHook(() =>
      useDetailsPanelAutoOpenOnFocus({
        focusId: 'root',
        isPresentMode: false,
        setDetailsPanelOpen,
      })
    );

    expect(setDetailsPanelOpen).toHaveBeenCalledWith(true);
  });

  it('does not auto-open the details panel on mobile focus changes', () => {
    const setDetailsPanelOpen = vi.fn();

    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))
    );

    renderHook(() =>
      useDetailsPanelAutoOpenOnFocus({
        focusId: 'root',
        isPresentMode: false,
        setDetailsPanelOpen,
      })
    );

    expect(setDetailsPanelOpen).not.toHaveBeenCalled();
  });
});
