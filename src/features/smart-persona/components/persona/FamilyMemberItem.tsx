import { memo } from 'react';
import { Ribbon, Trash2 } from 'lucide-react';

import { useTranslation } from '../../../../context/TranslationContext';
import { Person } from '../../../../types';
import { getDisplayDate } from '../../../../utils/familyLogic';
import { SmartAvatar } from '../../../../components/ui/SmartAvatar';

interface FamilyMemberItemProps {
  id: string;
  person?: Person;
  onSelect: (id: string) => void;
  onRemove?: (id: string) => void;
  highlighted?: boolean;
}

export const FamilyMemberItem = memo<FamilyMemberItemProps>(
  ({ id, person, onSelect, onRemove, highlighted = false }) => {
    const { t } = useTranslation();
    if (!person) return null;

    return (
      <div
        className={`group/item flex min-h-20 items-center justify-between rounded-2xl border bg-[var(--surface-panel)] p-3 transition-all hover:border-[var(--color-accent-500)] hover:shadow-[var(--shadow-sm)] ${
          highlighted ? 'border-[var(--color-accent-500)] shadow-[var(--shadow-sm)]' : 'border-[var(--border-soft)]'
        }`}
      >
        <button
          type="button"
          onClick={() => onSelect(id)}
          aria-label={`${person.firstName} ${person.lastName}`.trim()}
          className="flex min-w-0 flex-1 items-center gap-2 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-500)]"
        >
          <div className={`relative h-8 w-8 shrink-0 rounded-full p-0.5 ${person.gender === 'male' ? 'bg-[var(--gender-male-bg)]' : 'bg-[var(--gender-female-bg)]'}`}>
            <SmartAvatar
              person={person}
              size={28}
              className={`rounded-full ${person.isDeceased ? 'grayscale' : ''}`}
            />
            {person.isDeceased && (
              <div className="absolute -bottom-0.5 -end-0.5 rounded-full bg-[var(--surface-panel)] p-[1px] shadow-[var(--shadow-sm)]">
                <Ribbon className="h-2 w-2 fill-current text-[var(--text-dim)]" />
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-col">
            <span className="truncate text-xs font-semibold text-[var(--text-main)] transition-colors group-hover/item:text-[var(--primary-600)]">
              {person.firstName} {person.lastName}
            </span>
            <div className="flex flex-wrap items-center gap-1.5 text-[9px] font-medium text-[var(--text-dim)]">
              {person.birthDate && <span>{getDisplayDate(person.birthDate)}</span>}
              {person.title && <span className="uppercase tracking-wide opacity-75">{person.title}</span>}
              {highlighted && (
                <span className="rounded-full border border-[var(--color-accent-500)] px-1.5 py-0.5 text-[8px] uppercase tracking-[0.14em] text-[var(--primary-700)]">
                  {t.vaultTreeActive}
                </span>
              )}
            </div>
          </div>
        </button>

        <div className="flex items-center ps-2">
          {onRemove ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(id);
              }}
              aria-label={t.removeRelation}
              className="flex h-8 w-8 scale-90 items-center justify-center rounded-lg text-[var(--text-muted)] opacity-100 transition-all hover:scale-100 hover:bg-red-500/10 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 sm:opacity-0 sm:group-hover/item:opacity-100 sm:group-focus-within/item:opacity-100"
              title={t.removeRelation}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          ) : null}
        </div>
      </div>
    );
  }
);
