import React from 'react';
import { Edit3, Loader2 } from 'lucide-react';
import type { TreeSettingsText } from './treeSettingsTypes';
import { treeSettingsCardClassName } from './treeSettingsTypes';

interface TreeRenameSectionProps {
  text: TreeSettingsText;
  value: string;
  canRename: boolean;
  isSaving: boolean;
  onChange: (value: string) => void;
  onRename: () => void;
}

export const TreeRenameSection: React.FC<TreeRenameSectionProps> = ({
  text,
  value,
  canRename,
  isSaving,
  onChange,
  onRename,
}) => (
  <section className={treeSettingsCardClassName} aria-labelledby="tree-settings-rename-title">
    <div className="mb-4">
      <h4 id="tree-settings-rename-title" className="flex items-center gap-2 text-sm font-semibold text-[var(--text-main)]">
        <Edit3 className="h-4 w-4 text-[var(--primary-600)]" />
        {text.renameTitle}
      </h4>
      <p className="mt-1 text-xs text-[var(--text-dim)]">{text.renameDescription}</p>
    </div>
    <div className="flex flex-col gap-2 sm:flex-row">
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => event.key === 'Enter' && void onRename()}
        placeholder={text.renamePlaceholder}
        className="ds-input flex-1"
      />
      <button
        type="button"
        onClick={() => void onRename()}
        disabled={!canRename}
        className="inline-flex min-w-32 items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-[var(--primary-600)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--primary-700)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Edit3 className="h-4 w-4" />}
        {text.renameAction}
      </button>
    </div>
  </section>
);
