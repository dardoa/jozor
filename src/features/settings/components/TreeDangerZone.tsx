import React from 'react';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { useTranslation } from '../../../context/TranslationContext';
import type { TreeDangerZoneProps } from './treeSettings/treeSettingsTypes';
import { useTreeDangerZoneState } from './treeSettings/useTreeDangerZoneState';

export const TreeDangerZone: React.FC<TreeDangerZoneProps> = ({
  treeId,
  ownerId,
  ownerEmail,
  peopleCount,
  canManageTreeSettings = false,
  onTreeDeleted,
}) => {
  const { t } = useTranslation();
  const text = t.adminHub.treeSettings;
  const state = useTreeDangerZoneState({
    treeId,
    ownerId,
    ownerEmail,
    canManageTreeSettings,
    text,
    onTreeDeleted,
  });

  return (
    <section
      className="rounded-[var(--radius-xl)] border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 p-4"
      aria-labelledby="tree-settings-danger-title"
    >
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-[var(--color-danger)]" />
        <h4 id="tree-settings-danger-title" className="text-sm font-bold text-[var(--color-danger)]">
          {text.dangerTitle}
        </h4>
      </div>

      {!canManageTreeSettings ? (
        <div className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface-panel)] px-3 py-3 text-xs font-semibold text-[var(--text-secondary)]">
          {t.settings.maintenanceOwnerOnly}
        </div>
      ) : !state.showDeleteConfirm ? (

        <div className="space-y-3">
          <p className="text-xs leading-5 text-[var(--color-danger)]">
            {text.dangerDescription.replace('{count}', peopleCount.toString())}
          </p>
          <button
            type="button"
            onClick={state.openDeleteConfirm}
            className="inline-flex items-center gap-2 rounded-[var(--radius-lg)] bg-[var(--color-danger)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95"
          >
            <Trash2 className="h-4 w-4" />
            {text.deleteAction}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-[var(--color-danger)]">{text.deleteConfirmTitle}</p>
          <p className="text-xs leading-5 text-[var(--color-danger)]">{text.deleteConfirmBody}</p>
          <label className="block text-xs font-medium text-[var(--color-danger)]" htmlFor="tree-settings-delete-confirm">
            {text.deleteConfirmPrompt}
          </label>
          <input
            id="tree-settings-delete-confirm"
            type="text"
            value={state.deleteConfirmText}
            onChange={(event) => state.setDeleteConfirmText(event.target.value)}
            placeholder={text.deleteConfirmPlaceholder}
            className="ds-input w-full border-[var(--color-danger)]/30 bg-white/90"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void state.handleDelete()}
              disabled={state.isDeleting || !state.isDeleteConfirmed}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-[var(--color-danger)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {state.isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {text.permanentDeleteAction}
            </button>
            <button
              type="button"
              onClick={state.closeDeleteConfirm}
              disabled={state.isDeleting}
              className="rounded-[var(--radius-lg)] border border-[var(--border-soft)] bg-[var(--surface-panel)] px-4 py-2 text-sm font-semibold text-[var(--text-main)] transition hover:bg-[var(--surface-hover)]"
            >
              {t.cancel}
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
