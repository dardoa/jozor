import { useCallback } from 'react';
import type { ExportType, Person } from '../../types';
import { logError, logInfo } from '../../utils/errorLogger';

interface UseDebugExportHandlerOptions {
  people: Record<string, Person>;
  svgRef: React.RefObject<SVGSVGElement | null>;
  rawHandleExport: (type: ExportType) => Promise<void>;
}

export function useDebugExportHandler({
  people,
  svgRef,
  rawHandleExport,
}: UseDebugExportHandlerOptions) {
  return useCallback(async (type: ExportType) => {
    logInfo('EXPORT_TRIGGERED', `Export started: ${type}`, {
      exportType: String(type),
      peopleCount: Object.keys(people).length,
      hasSvgRef: Boolean(svgRef.current),
    });

    try {
      await rawHandleExport(type);
      logInfo('EXPORT_COMPLETED', `Export completed: ${type}`);
    } catch (error) {
      logError('EXPORT_DEBUG_FAILED', error, {
        showToast: false,
        metadata: { exportType: String(type) },
      });
    }
  }, [people, rawHandleExport, svgRef]);
}
