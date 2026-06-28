import { useCallback, useState } from 'react';
import type { ControlledPdfReadinessResult } from '../services/ControlledPdfReadinessService';

export interface UseControlledPdfReadinessResult {
  readonly status: 'idle' | 'checking' | 'ready' | 'fallback';
  readonly result?: ControlledPdfReadinessResult;
  readonly error?: string;
  readonly refresh: () => Promise<void>;
}

export function useControlledPdfReadiness(): UseControlledPdfReadinessResult {
  const [status, setStatus] = useState<'idle' | 'checking' | 'ready' | 'fallback'>('idle');
  const [result, setResult] = useState<ControlledPdfReadinessResult | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);

  const refresh = useCallback(async () => {
    setStatus('checking');
    setError(undefined);
    try {
      const { ControlledPdfReadinessService } = await import('../services/ControlledPdfReadinessService');
      const readinessResult = await ControlledPdfReadinessService.evaluateReadiness();
      setResult(readinessResult);
      setStatus(readinessResult.available ? 'ready' : 'fallback');
    } catch {
      setError('Renderer unavailable');
      setStatus('fallback');
    }
  }, []);

  return {
    status,
    result,
    error,
    refresh,
  };
}
