import { memo } from 'react';
import { Person } from '../../types';
import { getDisplayDate } from '../../utils/familyLogic';
import { Ribbon, Trash2 } from 'lucide-react';
import { useTranslation } from '../../context/TranslationContext';

interface FamilyMemberItemProps {
  id: string;
  person?: Person;
  onSelect: (id: string) => void;
  onRemove?: (id: string) => void;
}

export const FamilyMemberItem = memo<FamilyMemberItemProps>(
  ({ id, person, onSelect, onRemove }) => {
    const { t } = useTranslation();
    if (!person) return null;
    return (
      <div
        onClick={() => onSelect(id)}
        className='group/item flex items-center justify-between p-2 bg-[var(--card-bg)] border border-[var(--border-main)] hover:border-[var(--primary-500)]/30 hover:shadow-sm rounded-xl cursor-pointer transition-all'
      >
        <div className='flex items-center gap-2 flex-1 min-w-0'>
          {/* Avatar */}
          <div
            className={`relative w-8 h-8 shrink-0 rounded-full p-0.5 ${person.gender === 'male' ? 'bg-[var(--gender-male-bg)]' : 'bg-[var(--gender-female-bg)]'}`}
          >
            {person.photoUrl ? (
              <img
                src={person.photoUrl}
                alt=''
                className={`w-full h-full rounded-full object-cover ${person.isDeceased ? 'grayscale' : ''}`}
              />
            ) : (
              <div className='w-full h-full rounded-full bg-[var(--card-bg)] flex items-center justify-center'>
                <span
                  className={`text-[10px] font-bold ${person.gender === 'male' ? 'text-[var(--gender-male-text)]' : 'text-[var(--gender-female-text)]'}`}
                >
                  {person.firstName[0]}
                </span>
              </div>
            )}
            {person.isDeceased && (
              <div className='absolute -bottom-0.5 -end-0.5 bg-[var(--card-bg)] rounded-full p-[1px] shadow-sm'>
                <Ribbon className='w-2 h-2 text-[var(--text-dim)] fill-current' />
              </div>
            )}
          </div>

          {/* Text Info */}
          <div className='flex flex-col min-w-0'>
            <span className='text-xs font-semibold text-[var(--text-main)] truncate group-hover/item:text-[var(--primary-600)] transition-colors'>
              {person.firstName} {person.lastName}
            </span>
            <div className='flex items-center gap-1.5 text-[8px] text-[var(--text-dim)] font-medium'>
              {person.birthDate && <span>{getDisplayDate(person.birthDate)}</span>}
              {person.title && (
                <span className='uppercase tracking-wide opacity-75'>• {person.title}</span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className='flex items-center ps-2'>
          {onRemove ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(id);
              }}
              className='w-6 h-6 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover/item:opacity-100 transition-all scale-90 hover:scale-100'
              title={t.removeRelation}
            >
              <Trash2 className='w-3 h-3' />
            </button>
          ) : null}
        </div>
      </div>
    );
  }
);
