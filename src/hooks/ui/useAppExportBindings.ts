import { useRef } from 'react';
import type { ExportActionsProps, Person } from '../../types';
import { useExport } from '../export/useExport';
import { useDebugExportHandler } from '../export/useDebugExportHandler';

export function useAppExportBindings(
  people: Record<string, Person>
): {
  svgRef: React.RefObject<SVGSVGElement | null>;
  handleExport: ExportActionsProps['handleExport'];
  handlePublishingExport?: ExportActionsProps['handlePublishingExport'];
  handlePublishingPreview?: ExportActionsProps['handlePublishingPreview'];
  exportActions: ExportActionsProps;
} {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const { handleExport: rawHandleExport, handlePublishingExport, handlePublishingPreview } = useExport(people, svgRef);
  const handleExport = useDebugExportHandler({
    people,
    svgRef,
    rawHandleExport,
  });

  return {
    svgRef,
    handleExport,
    handlePublishingExport,
    handlePublishingPreview,
    exportActions: {
      handleExport,
      handlePublishingExport,
      handlePublishingPreview,
    },
  };
}
