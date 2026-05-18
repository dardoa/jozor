import { Clock, FileJson, Loader2, Pin, PinOff, RotateCcw, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Locale } from 'date-fns';
import type { DriveFile } from '../../../../types';
import type { VersionsPanelText } from './versionsTabUtils';
import { getSnapshotDisplayName, isPinnedSnapshot } from './versionsTabUtils';

interface VersionSnapshotListProps {
  snapshots: DriveFile[];
  isLoading: boolean;
  dateLocale?: Locale;
  title: string;
  description: string;
  emptyLabel: string;
  untitledLabel: string;
  restoreLabel: string;
  deleteLabel: string;
  versionsText: VersionsPanelText;
  onTogglePin: (snapshot: DriveFile) => void;
  onRestore: (snapshot: DriveFile) => void;
  onDelete: (snapshotId: string) => void;
}

export const VersionSnapshotList = ({
  snapshots,
  isLoading,
  dateLocale,
  title,
  description,
  emptyLabel,
  untitledLabel,
  restoreLabel,
  deleteLabel,
  versionsText,
  onTogglePin,
  onRestore,
  onDelete,
}: VersionSnapshotListProps) => (
  <section>
    <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--text-main)]">
      <Clock className="h-4 w-4" />
      {title}
    </h4>
    <p className="mb-3 text-xs text-[var(--text-dim)]">
      {description}
    </p>

    {isLoading ? (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-dim)]" />
      </div>
    ) : snapshots.length === 0 ? (
      <div className="py-8 text-center text-sm text-[var(--text-dim)]">
        {emptyLabel}
      </div>
    ) : (
      <div className="space-y-2">
        {snapshots.map((snapshot) => {
          const isPinned = isPinnedSnapshot(snapshot);
          const label = getSnapshotDisplayName(snapshot, untitledLabel);
          const date = new Date(snapshot.modifiedTime);

          return (
            <div
              key={snapshot.id}
              className={`flex items-center justify-between rounded-lg border p-3 transition-all ${
                isPinned
                  ? 'border-amber-200 bg-amber-50/30 dark:border-amber-800 dark:bg-amber-900/10'
                  : 'border-[var(--border-main)] bg-[var(--theme-surface)] hover:border-[var(--primary-600)]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    isPinned
                      ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30'
                      : 'bg-[var(--primary-600)]/10 text-[var(--primary-600)]'
                  }`}
                >
                  <FileJson className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-[var(--text-main)]">{label}</p>
                    {isPinned && <Pin className="h-3 w-3 fill-amber-500 text-amber-500" />}
                  </div>
                  <p className="text-xs text-[var(--text-dim)]">
                    {formatDistanceToNow(date, { addSuffix: true, locale: dateLocale })} - {date.toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onTogglePin(snapshot)}
                  className={`rounded-lg p-2 transition-colors ${
                    isPinned
                      ? 'text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/30'
                      : 'text-[var(--text-dim)] hover:bg-[var(--theme-hover)]'
                  }`}
                  title={isPinned ? (versionsText.unpinAction || 'Unpin version') : (versionsText.pinAction || 'Pin version')}
                  aria-label={isPinned ? (versionsText.unpinAction || 'Unpin version') : (versionsText.pinAction || 'Pin version')}
                >
                  {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => onRestore(snapshot)}
                  className="flex items-center gap-1 rounded-lg bg-[var(--primary-600)]/10 px-3 py-1.5 text-xs font-medium text-[var(--primary-600)] transition-all hover:bg-[var(--primary-600)] hover:text-white"
                >
                  <RotateCcw className="h-3 w-3" />
                  {restoreLabel}
                </button>
                {!isPinned && (
                  <button
                    type="button"
                    onClick={() => onDelete(snapshot.id)}
                    className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                    title={deleteLabel}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    )}
  </section>
);
