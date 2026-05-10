import { useMemo } from 'react';
import type {
  ExportActionsProps,
  ModalStateAndActions,
  ModalType,
  ToolsActionsProps,
} from '../types';

interface UseAppUiBindingsOptions {
  modals: ModalStateAndActions;
  handleOpenModal: (type: ModalType, data?: unknown) => void;
  handleExport: ExportActionsProps['handleExport'];
}

export function useAppUiBindings({
  modals,
  handleOpenModal,
  handleExport,
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
  }), [handleExport]);

  return {
    modalsReturn: modals,
    toolsActions,
    exportActions,
  };
}
