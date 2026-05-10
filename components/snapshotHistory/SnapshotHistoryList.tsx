import { FileJson, RotateCcw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Locale } from 'date-fns';
import type { DriveFile } from '../../types';
import { getSnapshotDisplayName } from '../modals/tabs/versions/versionsTabUtils';

interface SnapshotHistoryListProps {
  snapshots: DriveFile[];
  isLoading: boolean;
  dateLocale?: Locale;
  loadingLabel: string;
  emptyLabel: string;
  untitledLabel: string;
  restoreLabel: string;
  onRestore: (snapshot: DriveFile) => void;
}

export const SnapshotHistoryList = ({
  snapshots,
  isLoading,
  dateLocale,
  loadingLabel,
  emptyLabel,
  untitledLabel,
  restoreLabel,
  onRestore,
}: SnapshotHistoryListProps) => (
  <div className="flex-1 overflow-y-auto p-4 space-y-3">
    {isLoading && (
      <div className="text-center py-8 text-[var(--text-dim)]">{loadingLabel}</div>
    )}

    {!isLoading && snapshots.length === 0 && (
      <div className="text-center py-8 text-[var(--text-dim)]">
        {emptyLabel}
      </div>
    )}

    {snapshots.map((snapshot) => {
      const label = getSnapshotDisplayName(snapshot, untitledLabel);
      const date = new Date(snapshot.modifiedTime);

      return (
        <div key={snapshot.id} className="group flex items-center justify-between p-3 rounded-lg border border-[var(--border-main)] hover:border-[var(--primary-500)] hover:bg-[var(--theme-hover)] transition-all">
          <div className="flex flex-col">
            <span className="font-semibold text-sm flex items-center gap-2">
              <FileJson className="w-4 h-4 text-[var(--text-dim)]" />
              {label}
            </span>
            <span className="text-xs text-[var(--text-dim)] mt-1">
              {formatDistanceToNow(date, { addSuffix: true, locale: dateLocale })}
              {' • '}
              {date.toLocaleDateString()} {date.toLocaleTimeString()}
            </span>
          </div>

          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onRestore(snapshot)}
              className="px-3 py-1.5 text-xs font-medium bg-[var(--primary-100)] text-[var(--primary-700)] rounded hover:bg-[var(--primary-200)] flex items-center gap-1"
              title={restoreLabel}
            >
              <RotateCcw className="w-3 h-3" />
              {restoreLabel}
            </button>
          </div>
        </div>
      );
    })}
  </div>
);
