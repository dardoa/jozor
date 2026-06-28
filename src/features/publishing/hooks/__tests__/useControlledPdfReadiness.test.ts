import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ControlledPdfReadinessService } from '../../services/ControlledPdfReadinessService';
import { useControlledPdfReadiness } from '../useControlledPdfReadiness';

vi.mock('../../services/ControlledPdfReadinessService', () => ({
  ControlledPdfReadinessService: {
    evaluateReadiness: vi.fn(),
  },
}));

describe('useControlledPdfReadiness', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts in idle status and transitions successfully on refresh', async () => {
    vi.mocked(ControlledPdfReadinessService.evaluateReadiness).mockResolvedValue({
      available: true,
      recommendedMode: 'controlled-pdf',
      reasons: [],
      diagnostics: { renderer: 'local-controlled' },
    });

    const { result } = renderHook(() => useControlledPdfReadiness());

    expect(result.current.status).toBe('idle');
    expect(result.current.result).toBeUndefined();
    expect(result.current.error).toBeUndefined();

    // Trigger check
    let promise: Promise<void>;
    act(() => {
      promise = result.current.refresh();
    });

    expect(result.current.status).toBe('checking');

    await act(async () => {
      await promise;
    });

    expect(result.current.status).toBe('ready');
    expect(result.current.result?.available).toBe(true);
    expect(result.current.error).toBeUndefined();
  });

  it('safely transitions to fallback state and maps errors to generic message on crash', async () => {
    vi.mocked(ControlledPdfReadinessService.evaluateReadiness).mockRejectedValue(
      new Error('Raw database credential exposure crash')
    );

    const { result } = renderHook(() => useControlledPdfReadiness());

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.status).toBe('fallback');
    expect(result.current.error).toBe('Renderer unavailable');
    // Ensure raw error stack details are completely masked
    expect(result.current.error).not.toContain('database credential');
  });

  it('transitions to fallback when readiness recommends browser print fallback', async () => {
    vi.mocked(ControlledPdfReadinessService.evaluateReadiness).mockResolvedValue({
      available: false,
      recommendedMode: 'browser-print-fallback',
      reasons: ['Renderer unavailable'],
      diagnostics: { renderer: 'local-controlled' },
    });

    const { result } = renderHook(() => useControlledPdfReadiness());

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.status).toBe('fallback');
    expect(result.current.result?.recommendedMode).toBe('browser-print-fallback');
    expect(result.current.error).toBeUndefined();
  });
});
