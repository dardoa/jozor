import { memo } from 'react';
import { Person, FamilyActionsProps, TreeSettings } from '../../types';
import { formatDate } from '../../utils/familyLogic';
import {
  User,
  Baby,
  Ribbon,
  MessageCircle,
  MapPin,
  CalendarDays,
  BookOpen,
  UserRound,
  Heart,
} from 'lucide-react';
import { useTranslation } from '../../context/TranslationContext';
import { QuickAddSpeedDial } from '../ui/QuickAddSpeedDial';

interface PersonHeaderViewProps {
  person: Person;
  onSelect: (id: string) => void;
  onOpenModal: (
    modalType:
      | 'calculator'
      | 'stats'
      | 'chat'
      | 'consistency'
      | 'timeline'
      | 'share'
      | 'story'
      | 'map'
  ) => void;
  familyActions: FamilyActionsProps;
  settings: TreeSettings;
}

export const PersonHeaderView = memo<PersonHeaderViewProps>(
  ({ person, onSelect, onOpenModal, familyActions, settings }) => {
    const { t } = useTranslation();
    const fullName =
      [person.title, person.firstName, person.middleName, person.lastName, person.suffix]
        .filter(Boolean)
        .join(' ') || 'Unnamed Person';
    // Use configured format, default to ISO if not set (though settings usually has default)
    const dateFormat = settings.dateFormat || 'iso';
    const displayBirth = formatDate(person.birthDate, dateFormat);
    const displayDeath = formatDate(person.deathDate, dateFormat);

    // Define common button classes for consistency
    const baseButtonClasses =
      'flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-colors active:scale-95';

    const quickAddActions = [
      {
        onClick: () => familyActions.onAddParent('male'),
        icon: <UserRound className='w-3 h-3' />,
        colorClasses:
          'bg-[var(--gender-male-bg)] text-[var(--gender-male-text)] hover:shadow-sm',
        label: t.addFather,
      },
      {
        onClick: () => familyActions.onAddParent('female'),
        icon: <UserRound className='w-3 h-3' />,
        colorClasses:
          'bg-[var(--gender-female-bg)] text-[var(--gender-female-text)] hover:shadow-sm',
        label: t.addMother,
      },
      {
        onClick: () => familyActions.onAddSpouse('male'),
        icon: <Heart className='w-3 h-3' />,
        colorClasses:
          'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:shadow-sm',
        label: t.addHusband,
      },
      {
        onClick: () => familyActions.onAddSpouse('female'),
        icon: <Heart className='w-3 h-3' />,
        colorClasses:
          'bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:shadow-sm',
        label: t.addWife,
      },
      {
        onClick: () => familyActions.onAddChild('male'),
        icon: <Baby className='w-3 h-3' />,
        colorClasses:
          'bg-[var(--primary-500)]/10 text-[var(--primary-600)] hover:shadow-sm',
        label: t.addSon,
      },
      {
        onClick: () => familyActions.onAddChild('female'),
        icon: <Baby className='w-3 h-3' />,
        colorClasses:
          'bg-orange-500/10 text-orange-600 hover:shadow-sm',
        label: t.addDaughter,
      },
    ];

    return (
      <div className='space-y-4 pb-4'>
        <div className='flex gap-3 items-start animate-in fade-in duration-200'>
          {/* Image */}
          <div className='shrink-0 flex flex-col items-center gap-2'>
            <div className='relative group cursor-pointer' onClick={() => onSelect(person.id)}>
              <div
                className={`w-28 h-28 rounded-2xl border-2 border-[var(--card-bg)] shadow-md flex items-center justify-center overflow-hidden bg-[var(--theme-bg)] ${person.isDeceased ? 'grayscale' : ''}`}
              >
                {person.photoUrl ? (
                  <img
                    src={person.photoUrl}
                    alt={person.firstName}
                    className='w-full h-full object-cover transition-transform group-hover:scale-105 duration-500'
                  />
                ) : (
                  <User
                    className={`w-12 h-12 ${person.gender === 'male' ? 'text-[var(--gender-male-text)]' : 'text-[var(--gender-female-text)]'} opacity-30`}
                  />
                )}
              </div>
              {person.isDeceased && (
                <div className='absolute -top-2 -end-2 bg-[var(--card-bg)] rounded-full p-1 shadow-sm border border-[var(--border-main)] z-10'>
                  <Ribbon className='w-4 h-4 text-[var(--text-dim)] fill-current' />
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className='flex-1 min-w-0 pt-0.5 space-y-2'>
            <div>
              <h2 className='text-2xl font-black text-[var(--text-main)] leading-tight font-serif tracking-tight'>
                {fullName}
              </h2>
              {(person.birthName || person.nickName) && (
                <p className='text-xs text-[var(--text-muted)] italic font-medium opacity-80'>
                  {person.nickName && `"${person.nickName}"`}
                  {person.nickName && person.birthName && ' • '}
                  {person.birthName && `${t.nee} ${person.birthName}`}
                </p>
              )}
            </div>
            <div className='space-y-1'>
              <div className='flex items-center gap-2 text-[10px] font-medium'>
                <span
                  className={`px-2 py-0.5 rounded-md border ${person.gender === 'male' ? 'bg-[var(--gender-male-bg)] border-[var(--gender-male-border)] text-[var(--gender-male-text)]' : 'bg-[var(--gender-female-bg)] border-[var(--gender-female-border)] text-[var(--gender-female-text)]'}`}
                >
                  {person.gender === 'male' ? t.male : t.female}
                </span>
                {person.isDeceased && (
                  <span className='px-2 py-0.5 rounded-md bg-[var(--theme-bg)] border border-[var(--border-main)] text-[var(--text-muted)] flex items-center gap-1'>
                    <Ribbon className='w-2.5 h-2.5' />
                    {t.deceased}
                  </span>
                )}
              </div>
              <div className='space-y-0.5'>
                <div
                  className='flex items-center gap-2 text-xs text-[var(--text-main)] group cursor-help'
                  title={person.birthSource ? `${t.source}: ${person.birthSource}` : ''}
                >
                  <Baby className='w-3.5 h-3.5 text-[var(--text-dim)]' />
                  <span>
                    {t.born}{' '}
                    <strong className='text-[var(--text-main)]'>
                      {displayBirth || '?'}
                    </strong>
                    {person.birthPlace && (
                      <span className='text-[var(--text-muted)]'>
                        {' '}
                        • {person.birthPlace}
                      </span>
                    )}
                  </span>
                  {person.birthSource && (
                    <BookOpen className='w-3 h-3 text-[var(--primary-500)] opacity-60 group-hover:opacity-100' />
                  )}
                </div>
                {person.isDeceased && (
                  <div
                    className='flex items-center gap-2 text-xs text-[var(--text-main)] group cursor-help'
                    title={person.deathSource ? `${t.source}: ${person.deathSource}` : ''}
                  >
                    <Ribbon className='w-3.5 h-3.5 text-[var(--text-dim)] fill-current' />
                    <span>
                      {t.died}{' '}
                      <strong className='text-[var(--text-main)]'>
                        {displayDeath || '?'}
                      </strong>
                      {person.deathPlace && (
                        <span className='text-[var(--text-muted)]'>
                          {' '}
                          • {person.deathPlace}
                        </span>
                      )}
                    </span>
                    {person.deathSource && (
                      <BookOpen className='w-3 h-3 text-[var(--primary-500)] opacity-60 group-hover:opacity-100' />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className='h-px bg-[var(--border-main)]'></div>

        {/* Actions Section - Consolidated */}
        <div className='flex flex-wrap items-center justify-center gap-2 mt-2 animate-in fade-in slide-in-from-top-1 duration-200'>
          {person.isDeceased && (
            <button
              onClick={() => onOpenModal('chat')}
              className={`${baseButtonClasses} bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:shadow-sm`}
            >
              <MessageCircle className='w-3.5 h-3.5' /> {t.chatWithAncestor}
            </button>
          )}

          {/* Quick Add Speed Dial */}
          <QuickAddSpeedDial
            actions={quickAddActions}
            buttonClassName={`${baseButtonClasses} bg-[var(--primary-500)]/10 text-[var(--primary-600)] hover:shadow-sm`}
          />

          <button
            onClick={() => onOpenModal('map')}
            className={`${baseButtonClasses} bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:shadow-sm`}
          >
            <MapPin className='w-3.5 h-3.5' /> {t.viewOnMap}
          </button>
          <button
            onClick={() => onOpenModal('timeline')}
            className={`${baseButtonClasses} bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:shadow-sm`}
          >
            <CalendarDays className='w-3.5 h-3.5' /> {t.familyTimelineHeader}
          </button>
        </div>
      </div>
    );
  }
);
