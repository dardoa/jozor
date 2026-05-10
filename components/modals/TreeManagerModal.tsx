import React from 'react';

import { OverlayPrimitive } from '../../context/OverlayContext';
import { Button } from '../ui/Button';
import { ConfirmationModal } from '../ConfirmationModal';
import { TreeManagerModalBody } from './treeManager/TreeManagerModalBody';
import { TreeManagerModalHeader } from './treeManager/TreeManagerModalHeader';
import { useTreeManagerModalState } from './treeManager/useTreeManagerModalState';

interface TreeManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  ownerId: string;
  userEmail: string;
  activeTreeId: string | null;
  onTreeSelected: (treeId: string) => void;
}

export const TreeManagerModal: React.FC<TreeManagerModalProps> = ({
  isOpen,
  onClose,
  ownerId,
  userEmail,
  activeTreeId,
  onTreeSelected,
}) => {
  const state = useTreeManagerModalState({
    isOpen,
    onClose,
    ownerId,
    userEmail,
    activeTreeId,
    onTreeSelected,
  });
  const { t, fileInputRef, handleImportFile, deleteTreeId, setDeleteTreeId, handleDeleteTree } = state;

  return (
    <OverlayPrimitive
      isOpen={isOpen}
      onClose={onClose}
      id="tree-manager-modal"
      backdropClassName="ds-overlay-backdrop fixed inset-0 z-[var(--z-index-modal)] flex items-center justify-center p-4"
    >
      <input ref={fileInputRef} type="file" accept=".json,.jozor" className="hidden" onChange={handleImportFile} />
      <div
        className="ds-overlay-card relative w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300"
        onClick={(event) => event.stopPropagation()}
      >
        <TreeManagerModalHeader
          title={t.manageTrees}
          description={t.manageTreesDesc}
          closeLabel={t.common.close}
          onClose={onClose}
        />

        <div className="ds-modal-body p-8 max-h-[70vh] overflow-y-auto custom-scrollbar bg-[var(--surface-app)]/50">
          <TreeManagerModalBody state={state} activeTreeId={activeTreeId} />
        </div>

        <div className="ds-modal-footer px-8 py-5">
          <Button onClick={onClose} variant="primary">
            {t.close}
          </Button>
        </div>
      </div>

      <ConfirmationModal
        isOpen={Boolean(deleteTreeId)}
        onClose={() => setDeleteTreeId(null)}
        onConfirm={() => void handleDeleteTree()}
        title={t.vaultTreeDeleteTitle}
        message={t.vaultTreeDeleteMessage}
        type="danger"
        overlayId="tree-manager-delete-tree-confirm"
      />
    </OverlayPrimitive>
  );
};
