import { memo } from 'react';
import {
  Activity,
  Eraser,
  FolderTree,
  HardDrive,
  History,
  Share2,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react';
import {
  DropdownContent,
  DropdownMenuDivider,
  DropdownMenuHeader,
  DropdownMenuItem,
} from '../ui/DropdownMenu';
import { useTranslation } from '../../context/TranslationContext';

interface TreeMenuProps {
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

export const TreeMenu = memo<TreeMenuProps>(
  ({
    onOpenTreeControlCenter,
    onOpenShare,
    onOpenDiagnostics,
    onOpenTreeManager,
    onOpenDriveFileManager,
    onOpenSnapshotHistory,
    onOpenActivityLog,
    onOpenCleanTree,
    showCleanTree,
  }) => {
    const { t } = useTranslation();
    const settingsText = t.settings as Record<string, string>;
    const diagnosticsLabel = settingsText.diagnostics || 'Diagnostics';

      return (
      <DropdownContent className="w-72" aria-label={t.shareTree}>
        <DropdownMenuHeader icon={<FolderTree className="w-3 h-3" />} label={(t as Record<string, string>).treeMenu || 'Tree'} />

        <DropdownMenuItem
          onClick={onOpenTreeControlCenter}
          icon={<FolderTree className="w-4 h-4" />}
          label={(t as Record<string, string>).treeControlCenterTitle || 'Tree Control Center'}
          subLabel={(t as Record<string, string>).treeControlCenterHint || 'Open the new unified workspace for overview, access, versions, and diagnostics.'}
        />

        <DropdownMenuDivider />

        <DropdownMenuHeader icon={<ShieldCheck className="w-3 h-3" />} label={t.shareTree} />
        <DropdownMenuItem
          onClick={onOpenShare}
          icon={<Share2 className="w-4 h-4" />}
          label={t.shareTree}
          subLabel={settingsText.shareTreeHint || 'Invite collaborators and manage shared access.'}
        />

        <DropdownMenuDivider />

        <DropdownMenuHeader icon={<FolderTree className="w-3 h-3" />} label={t.manageTrees} />
        <DropdownMenuItem
          onClick={onOpenTreeManager}
          icon={<FolderTree className="w-4 h-4" />}
          label={t.manageTrees}
          subLabel={settingsText.treeManagerHint || 'Open, rename, or switch the active tree.'}
        />
        <DropdownMenuItem
          onClick={onOpenDriveFileManager}
          icon={<HardDrive className="w-4 h-4" />}
          label={t.manageDriveFiles}
          subLabel={settingsText.manageBackupsHint || 'Review backup files and connected storage.'}
        />

        <DropdownMenuDivider />

        <DropdownMenuHeader icon={<History className="w-3 h-3" />} label={t.historyLog} />
        <DropdownMenuItem
          onClick={onOpenActivityLog}
          icon={<Activity className="w-4 h-4" />}
          label={t.userMenu.activityLog}
          subLabel={settingsText.activityHistoryHint || 'Inspect recent actions across the tree.'}
        />
        <DropdownMenuItem
          onClick={onOpenSnapshotHistory}
          icon={<History className="w-4 h-4" />}
          label={t.settings.snapshotHistory}
          subLabel={settingsText.snapshotHistoryHint || 'Browse earlier snapshots and restore points.'}
        />

        <DropdownMenuDivider />

        <DropdownMenuHeader icon={<Stethoscope className="w-3 h-3" />} label={diagnosticsLabel} />
        <DropdownMenuItem
          onClick={onOpenDiagnostics}
          icon={<Stethoscope className="w-4 h-4" />}
          label={diagnosticsLabel}
          subLabel={settingsText.diagnosticsHint || 'Check sync, invitations, and notification health.'}
        />

        {showCleanTree && (
          <>
            <DropdownMenuDivider />
            <div className="px-2 py-1">
              <div className="rounded-[var(--radius-md)] border border-[var(--danger-500)]/15 bg-[var(--danger-500)]/[0.04] p-1.5">
                <DropdownMenuItem
                  onClick={onOpenCleanTree}
                  icon={<Eraser className="w-4 h-4" />}
                  label={t.cleanTreeOptionsTitle}
                  subLabel={settingsText.cleanTreeHint || 'Start over carefully. This is intended for owners only.'}
                  colorClass="text-[var(--danger-500)] hover:bg-[var(--danger-500)]/10"
                  iconBgClass="bg-[var(--danger-500)]/10"
                  iconTextColorClass="text-[var(--danger-500)]"
                />
              </div>
            </div>
          </>
        )}
      </DropdownContent>
    );
  }
);

TreeMenu.displayName = 'TreeMenu';
