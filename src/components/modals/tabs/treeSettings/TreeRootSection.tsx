import React from 'react';
import { User } from 'lucide-react';
import { EMPTY_STRING } from '../../../../constants';
import type { Person } from '../../../../types';
import type { TreeSettingsText } from './treeSettingsTypes';
import { treeSettingsCardClassName } from './treeSettingsTypes';
import { getPersonFullName } from './treeSettingsUtils';

interface TreeRootSectionProps {
  text: TreeSettingsText;
  people: Person[];
  currentRootId?: string;
  unnamedPersonLabel: string;
  onRootChange: (newRootId: string) => void;
}

export const TreeRootSection: React.FC<TreeRootSectionProps> = ({
  text,
  people,
  currentRootId,
  unnamedPersonLabel,
  onRootChange,
}) => {
  if (people.length === 0) return null;

  return (
    <section className={treeSettingsCardClassName} aria-labelledby="tree-settings-root-title">
      <div className="mb-4">
        <h4 id="tree-settings-root-title" className="flex items-center gap-2 text-sm font-semibold text-[var(--text-main)]">
          <User className="h-4 w-4 text-[var(--primary-600)]" />
          {text.rootTitle}
        </h4>
        <p className="mt-1 text-xs text-[var(--text-dim)]">{text.rootDescription}</p>
      </div>
      <label className="mb-2 block text-xs font-medium text-[var(--text-dim)]" htmlFor="tree-settings-root-select">
        {text.currentRootLabel}
      </label>
      <select
        id="tree-settings-root-select"
        value={currentRootId || EMPTY_STRING}
        onChange={(event) => onRootChange(event.target.value)}
        className="ds-input w-full"
      >
        {people.map((person) => {
          const fullName = getPersonFullName(person) || unnamedPersonLabel;
          const isCurrent = person.id === currentRootId;
          return (
            <option key={person.id} value={person.id}>
              {isCurrent ? `${fullName} (${text.currentRootSuffix})` : fullName}
            </option>
          );
        })}
      </select>
    </section>
  );
};
