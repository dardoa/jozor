import { memo } from 'react';
import {
  Activity,
  Eraser,
  FolderTree,
  HardDrive,
  History,
  Share2,
  Stethoscope,
  X,
} from 'lucide-react';
import { useTranslation } from '../../context/TranslationContext';

interface MobileTreeSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTreeControlCenter: () => void;
  onOpenShare: () => void;
  onOpenDiagnostics: () => void;
  onOpenTreeManager: () => void;
  onOpenDriveFileManager: () => void;
  onOpenSnapshotHistory: () => void;
  onOpenActivityLog: () => void;
  onOpenCleanTree: () => void;
  showCleanTree: boolean;
}

const SheetAction = ({
  icon,
  label,
  subLabel,
  onClick,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  subLabel?: string;
  onClick: () => void;
  danger?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all shadow-[var(--shadow-sm)] ${
      danger
        ? 'border-[var(--danger-500)]/15 bg-[var(--danger-500)]/[0.04] text-[var(--danger-500)] hover:bg-[var(--danger-500)]/10'
        : 'border-[var(--border-soft)] bg-[var(--surface-panel-subtle)] hover:bg-[var(--surface-hover)]'
    }`}
  >
    <div
      className={`rounded-xl p-2.5 ${
        danger
          ? 'bg-[var(--danger-500)]/10 text-[var(--danger-500)]'
          : 'bg-[var(--theme-bg)] text-[var(--text-dim)]'
      }`}
    >
      {icon}
    </div>
    <div className="min-w-0 flex-1">
      <div className={`text-sm font-bold ${danger ? 'text-[var(--danger-500)]' : 'text-[var(--text-main)]'}`}>{label}</div>
      {subLabel ? (
        <div className={`mt-0.5 text-[11px] leading-4 ${danger ? 'text-[var(--danger-500)]/80' : 'text-[var(--text-dim)]'}`}>
          {subLabel}
        </div>
      ) : null}
    </div>
  </button>
);

export const MobileTreeSheet = memo(({
  isOpen,
  onClose,
  onOpenTreeControlCenter,
  onOpenShare,
  onOpenDiagnostics,
  onOpenTreeManager,
  onOpenDriveFileManager,
  onOpenSnapshotHistory,
  onOpenActivityLog,
  onOpenCleanTree,
  showCleanTree,
}: MobileTreeSheetProps) => {
  const { t } = useTranslation();
  const settingsText = t.settings as unknown as Record<string, string>;
  const diagnosticsLabel = settingsText.diagnostics || 'Diagnostics';
  const treeLabel = (t as unknown as Record<string, string>).treeMenu || 'Tree';

  if (!isOpen) return null;

  const closeThen = (action: () => void) => () => {
    onClose();
    action();
  };

  return (
    <>
      <div className="ds-overlay-backdrop fixed inset-0 z-[var(--z-index-drawer)] sm:hidden" onClick={onClose} />
      <div className="ds-drawer-shell fixed inset-x-0 bottom-0 z-[calc(var(--z-index-drawer)+1)] max-h-[min(78vh,42rem)] overflow-hidden rounded-t-[28px] border-b-0 sm:hidden">
        <div className="ds-modal-header p-4">
          <div>
            <div className="mb-2 h-1 w-12 rounded-full bg-[var(--border-main)]/70 sm:hidden" aria-hidden="true" />
            <h2 className="text-lg font-bold text-[var(--text-main)]">{treeLabel}</h2>
            <p className="text-xs text-[var(--text-dim)]">{t.manageTrees}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 hover:bg-[var(--theme-hover)] text-[var(--text-dim)]" aria-label={t.settings.close}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto bg-[var(--surface-app)]/70 p-4">
          <section className="space-y-3">
            <h3 className="px-1 text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)] opacity-50">
              {(t as unknown as Record<string, string>).treeControlCenterTitle || 'Tree Control Center'}
            </h3>
            <SheetAction
              icon={<FolderTree className="h-5 w-5" />}
              label={(t as unknown as Record<string, string>).treeControlCenterTitle || 'Tree Control Center'}
              subLabel={(t as unknown as Record<string, string>).treeControlCenterHint || 'Open the new unified workspace for overview, access, versions, and diagnostics.'}
              onClick={closeThen(onOpenTreeControlCenter)}
            />
          </section>

          <section className="space-y-3">
            <h3 className="px-1 text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)] opacity-50">{t.shareTree}</h3>
            <SheetAction
              icon={<Share2 className="h-5 w-5" />}
              label={t.shareTree}
              subLabel={settingsText.shareTreeHint || 'Invite collaborators and manage shared access.'}
              onClick={closeThen(onOpenShare)}
            />
          </section>

          <section className="space-y-3">
            <h3 className="px-1 text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)] opacity-50">{t.manageTrees}</h3>
            <SheetAction
              icon={<FolderTree className="h-5 w-5" />}
              label={t.manageTrees}
              subLabel={settingsText.treeManagerHint || 'Open, rename, or switch the active tree.'}
              onClick={closeThen(onOpenTreeManager)}
            />
            <SheetAction
              icon={<HardDrive className="h-5 w-5" />}
              label={t.manageDriveFiles}
              subLabel={settingsText.manageBackupsHint || 'Review backup files and connected storage.'}
              onClick={closeThen(onOpenDriveFileManager)}
            />
          </section>

          <section className="space-y-3">
            <h3 className="px-1 text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)] opacity-50">{t.historyLog}</h3>
            <SheetAction
              icon={<Activity className="h-5 w-5" />}
              label={t.userMenu.activityLog}
              subLabel={settingsText.activityHistoryHint || 'Inspect recent actions across the tree.'}
              onClick={closeThen(onOpenActivityLog)}
            />
            <SheetAction
              icon={<History className="h-5 w-5" />}
              label={t.settings.snapshotHistory}
              subLabel={settingsText.snapshotHistoryHint || 'Browse earlier snapshots and restore points.'}
              onClick={closeThen(onOpenSnapshotHistory)}
            />
          </section>

          <section className="space-y-3">
            <h3 className="px-1 text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)] opacity-50">{diagnosticsLabel}</h3>
            <SheetAction
              icon={<Stethoscope className="h-5 w-5" />}
              label={diagnosticsLabel}
              subLabel={settingsText.diagnosticsHint || 'Check sync, invitations, and notification health.'}
              onClick={closeThen(onOpenDiagnostics)}
            />
          </section>

          {showCleanTree ? (
            <section className="space-y-3">
              <h3 className="px-1 text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)] opacity-50">{t.cleanTreeOptionsTitle}</h3>
              <SheetAction
                icon={<Eraser className="h-5 w-5" />}
                label={t.cleanTreeOptionsTitle}
                subLabel={settingsText.cleanTreeHint || 'Start over carefully. This is intended for owners only.'}
                onClick={closeThen(onOpenCleanTree)}
                danger
              />
            </section>
          ) : null}
        </div>
      </div>
    </>
  );
});

MobileTreeSheet.displayName = 'MobileTreeSheet';
