import { Clock, X } from 'lucide-react';

interface SnapshotHistoryHeaderProps {
  title: string;
  closeLabel?: string;
  onClose: () => void;
}

export const SnapshotHistoryHeader = ({
  title,
  closeLabel,
  onClose,
}: SnapshotHistoryHeaderProps) => (
  <div className="flex items-center justify-between p-4 border-b border-[var(--border-main)]">
    <h2 className="text-xl font-bold flex items-center gap-2">
      <Clock className="w-5 h-5 text-[var(--primary-600)]" />
      {title}
    </h2>
    <button
      onClick={onClose}
      className="p-2 hover:bg-[var(--theme-hover)] rounded-full transition-colors"
      aria-label={closeLabel}
    >
      <X className="w-5 h-5" />
    </button>
  </div>
);
