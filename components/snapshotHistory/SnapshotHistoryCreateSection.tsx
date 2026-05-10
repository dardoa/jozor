import { Plus } from 'lucide-react';

interface SnapshotHistoryCreateSectionProps {
  label: string;
  placeholder: string;
  saveLabel: string;
  newLabel: string;
  isCreating: boolean;
  onLabelChange: (value: string) => void;
  onCreate: () => void;
}

export const SnapshotHistoryCreateSection = ({
  label,
  placeholder,
  saveLabel,
  newLabel,
  isCreating,
  onLabelChange,
  onCreate,
}: SnapshotHistoryCreateSectionProps) => (
  <div className="p-4 bg-[var(--theme-surface)] border-b border-[var(--border-main)]">
    <label className="text-sm font-medium mb-1 block">
      {label}
    </label>
    <div className="flex gap-2">
      <input
        type="text"
        value={newLabel}
        onChange={(event) => onLabelChange(event.target.value)}
        placeholder={placeholder}
        className="flex-1 px-3 py-2 rounded-lg border border-[var(--border-strong)] bg-[var(--theme-bg)] focus:ring-2 focus:ring-[var(--primary-500)] outline-none"
      />
      <button
        onClick={onCreate}
        disabled={isCreating || !newLabel.trim()}
        className="bg-[var(--primary-600)] text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium hover:bg-[var(--primary-700)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isCreating ? `${saveLabel}...` : (
          <>
            <Plus className="w-4 h-4" />
            {saveLabel}
          </>
        )}
      </button>
    </div>
  </div>
);
