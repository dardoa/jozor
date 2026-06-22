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
}

export function useAppUiBindings({
  modals,
  handleOpenModal,
  handleExport,
  handlePublishingExport,
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
  }), [handleExport, handlePublishingExport]);

  return {
    modalsReturn: modals,
    toolsActions,
    exportActions,
  };
}
