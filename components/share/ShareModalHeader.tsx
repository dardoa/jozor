import { Share2, X } from 'lucide-react';

interface ShareModalHeaderProps {
  title: string;
  closeLabel: string;
  onClose: () => void;
}

export const ShareModalHeader = ({
  title,
  closeLabel,
  onClose,
}: ShareModalHeaderProps) => (
  <div className="ds-modal-header p-5">
    <div className="flex items-center gap-2">
      <div className="p-2 bg-[var(--primary-50)] rounded-[var(--radius-md)] text-[var(--primary-600)]">
        <Share2 className="w-5 h-5" />
      </div>
      <h3 className="ds-heading">{title}</h3>
    </div>
    <button
      onClick={onClose}
      aria-label={closeLabel}
      className="p-2 hover:bg-[var(--theme-hover)] rounded-full transition-colors text-[var(--text-muted)] hover:text-[var(--text-main)]"
    >
      <X className="w-5 h-5" />
    </button>
  </div>
);
