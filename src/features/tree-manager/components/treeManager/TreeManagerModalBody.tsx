import React from 'react';
import { Loader2, TreePine } from 'lucide-react';
import { VaultTreesPanel } from '../../../the-vault';
import type { TreeManagerModalState } from '../../hooks/useTreeManagerModalState';

interface TreeManagerModalBodyProps {
  state: TreeManagerModalState;
  activeTreeId: string | null;
}

export const TreeManagerModalBody = ({
  state,
  activeTreeId,
}: TreeManagerModalBodyProps) => {
  const {
    t,
    treeName,
    treePanelLabels,
    fileInputRef,
    ownedTrees,
    sharedTrees,
    isTreeLoading,
    busyTreeId,
    editingTreeId,
    editTreeName,
    loadTrees,
    handleOpenTree,
    handleCreateTree,
    handleRenameTree,
    setEditingTreeId,
    setEditTreeName,
    setDeleteTreeId,
  } = state;

  if (isTreeLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-[var(--text-dim)]">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-[var(--primary-500)]" />
        <p className="text-sm font-medium">{t.loadingFiles}</p>
      </div>
    );
  }

  if (ownedTrees.length === 0 && sharedTrees.length === 0) {
    return (
      <div className="ds-empty-state text-center py-16 text-[var(--text-dim)]">
        <TreePine className="w-12 h-12 mx-auto mb-4 opacity-20" />
        <p className="text-sm">{t.noTreesFound}</p>
      </div>
    );
  }

  return (
    <VaultTreesPanel
      treeName={treeName?.trim() || t.untitledTree}
      treeId={activeTreeId}
      roleLabel={t.roles.owner}
      ownedTrees={ownedTrees}
      sharedTrees={sharedTrees}
      busyTreeId={busyTreeId}
      isTreeLoading={isTreeLoading}
      editingTreeId={editingTreeId}
      editTreeName={editTreeName}
      labels={treePanelLabels}
      onCreateTree={() => void handleCreateTree()}
      onImportTree={() => fileInputRef.current?.click()}
      onRefreshTrees={() => void loadTrees()}
      onOpenTree={(treeId, treeRole) => void handleOpenTree(treeId, treeRole || 'viewer')}
      onStartRename={(tree) => {
        setEditingTreeId(tree.id);
        setEditTreeName(tree.name);
      }}
      onConfirmRename={(treeId) => void handleRenameTree(treeId)}
      onCancelRename={() => {
        setEditingTreeId(null);
        setEditTreeName('');
      }}
      onEditTreeNameChange={setEditTreeName}
      onDeleteTree={setDeleteTreeId}
    />
  );
};
