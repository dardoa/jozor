import { useMemo } from 'react';
import type {
  ExportActionsProps,
  ModalOpenContext,
  ModalStateAndActions,
  ModalRouteType,
  ToolsActionsProps,
} from '../../types';

interface UseAppUiBindingsOptions {
  modals: ModalStateAndActions;
  handleOpenModal: (type: ModalRouteType, context?: ModalOpenContext) => void;
  handleExport: ExportActionsProps['handleExport'];
  handlePublishingExport?: ExportActionsProps['handlePublishingExport'];
  handlePublishingPreview?: ExportActionsProps['handlePublishingPreview'];
}

export function useAppUiBindings({
  modals,
  handleOpenModal,
  handleExport,
  handlePublishingExport,
  handlePublishingPreview,
}: UseAppUiBindingsOptions): {
  modalsReturn: ModalStateAndActions;
  toolsActions: ToolsActionsProps;
  exportActions: ExportActionsProps;
} {
  const toolsActions = useMemo<ToolsActionsProps>(() => ({
    onOpenModal: handleOpenModal,
  }), [handleOpenModal]);

  const exportActions = useMemo<ExportActionsProps>(() => ({
    handleExport,
    handlePublishingExport,
    handlePublishingPreview,
  }), [handleExport, handlePublishingExport, handlePublishingPreview]);

  return {
    modalsReturn: modals,
    toolsActions,
    exportActions,
  };
}
