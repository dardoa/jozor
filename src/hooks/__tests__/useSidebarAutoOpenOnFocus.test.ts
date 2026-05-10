// @ts-nocheck
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSidebarAutoOpenOnFocus } from '../useSidebarAutoOpenOnFocus';

describe('useSidebarAutoOpenOnFocus', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('opens the sidebar automatically on desktop focus changes', () => {
    const setSidebarOpen = vi.fn();

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
      useSidebarAutoOpenOnFocus({
        focusId: 'root',
        isPresentMode: false,
        setSidebarOpen,
      })
    );

    expect(setSidebarOpen).toHaveBeenCalledWith(true);
  });

  it('does not auto-open the sidebar on mobile focus changes', () => {
    const setSidebarOpen = vi.fn();

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
      useSidebarAutoOpenOnFocus({
        focusId: 'root',
        isPresentMode: false,
        setSidebarOpen,
      })
    );

    expect(setSidebarOpen).not.toHaveBeenCalled();
  });
});

