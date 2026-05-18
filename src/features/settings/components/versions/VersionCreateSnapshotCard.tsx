import { Loader2, Plus } from 'lucide-react';

interface VersionCreateSnapshotCardProps {
  title: string;
  description: string;
  placeholder: string;
  saveLabel: string;
  newLabel: string;
  isCreating: boolean;
  onLabelChange: (value: string) => void;
  onCreate: () => void;
}

export const VersionCreateSnapshotCard = ({
  title,
  description,
  placeholder,
  saveLabel,
  newLabel,
  isCreating,
  onLabelChange,
  onCreate,
}: VersionCreateSnapshotCardProps) => (
  <section className="rounded-[var(--radius-xl)] border border-[var(--border-soft)] bg-[var(--surface-panel)] p-4 shadow-[var(--shadow-xs)]">
    <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--text-main)]">
      <Plus className="h-4 w-4" />
      {title}
    </h4>
    <p className="mb-3 text-xs text-[var(--text-dim)]">
      {description}
    </p>
    <div className="flex gap-2">
      <input
        type="text"
        value={newLabel}
        onChange={(event) => onLabelChange(event.target.value)}
        placeholder={placeholder}
        className="flex-1 rounded-lg border border-[var(--border-main)] bg-[var(--theme-bg)] px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)]"
      />
      <button
        type="button"
        onClick={onCreate}
        disabled={isCreating || !newLabel.trim()}
        className="flex items-center gap-2 rounded-lg bg-[var(--primary-600)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--primary-500)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        {saveLabel}
      </button>
    </div>
  </section>
);
