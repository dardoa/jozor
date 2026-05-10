import { useEffect, useLayoutEffect, useRef } from 'react';

interface UseTreeRenderDiagnosticsParams {
  hasReceivedLayout: boolean;
}

export const useTreeRenderDiagnostics = ({
  hasReceivedLayout,
}: UseTreeRenderDiagnosticsParams) => {
  const prevLayoutRef = useRef(false);

  useLayoutEffect(() => {
    if (!import.meta.env.DEV) return;

    if (hasReceivedLayout && !prevLayoutRef.current) {
      performance.mark('diagnostic-9-first-render-intent');
    }
  }, [hasReceivedLayout]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (!hasReceivedLayout || prevLayoutRef.current) return;

    requestAnimationFrame(() => {
      performance.mark('diagnostic-10-interactive-visible');
      performance.measure(
        'Diagnostic Checkpoint 9 to 10: Render to Interactive',
        'diagnostic-9-first-render-intent',
        'diagnostic-10-interactive-visible',
      );

      const marks = performance
        .getEntriesByType('mark')
        .filter((mark) => mark.name.startsWith('diagnostic-') || mark.name.startsWith('jozor-'));
      const measures = performance
        .getEntriesByType('measure')
        .filter((measure) => measure.name.startsWith('Diagnostic Checkpoint'));

      console.group('[DIAGNOSTIC] End-to-End Trace Results');
      console.table(marks.map((mark) => ({ Stage: mark.name, TimeMs: mark.startTime })));
      console.table(measures.map((measure) => ({ Phase: measure.name, DurationMs: measure.duration })));
      console.groupEnd();
    });

    prevLayoutRef.current = true;
  }, [hasReceivedLayout]);
};
