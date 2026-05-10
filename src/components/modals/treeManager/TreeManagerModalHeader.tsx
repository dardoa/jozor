import { FolderTree, X } from 'lucide-react';

interface TreeManagerModalHeaderProps {
  title: string;
  description: string;
  closeLabel: string;
  onClose: () => void;
}

export const TreeManagerModalHeader = ({
  title,
  description,
  closeLabel,
  onClose,
}: TreeManagerModalHeaderProps) => (
  <div className="ds-modal-header relative px-8 py-6">
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-[var(--primary-50)] flex items-center justify-center text-[var(--primary-600)] shadow-[var(--shadow-sm)]">
          <FolderTree className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-[var(--text-main)] tracking-tight">{title}</h3>
          <p className="text-sm text-[var(--text-dim)]">{description}</p>
        </div>
      </div>
      <button
        onClick={onClose}
        className="p-2.5 rounded-xl hover:bg-[var(--theme-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all active:scale-90"
        aria-label={closeLabel}
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  </div>
);
