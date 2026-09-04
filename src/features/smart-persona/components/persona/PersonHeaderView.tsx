import { memo } from 'react';
import { Person, FamilyActionsProps, TreeSettings } from '../../../../types';
import { formatDate } from '../../../../utils/familyLogic';
import {
  Baby,
  Ribbon,
  MessageCircle,
  MapPin,
  CalendarDays,
  BookOpen,
  UserRound,
  Heart,
} from 'lucide-react';
import { useTranslation } from '../../../../context/TranslationContext';
import { QuickAddSpeedDial } from '../../../../components/ui/QuickAddSpeedDial';
import { SmartAvatar } from '../../../../components/ui/SmartAvatar';

interface PersonHeaderViewProps {
  person: Person;
  canEdit: boolean;
  onOpenModal: (
    modalType:
      | 'calculator'
      | 'stats'
      | 'chat'
      | 'consistency'
      | 'timeline'
      | 'map'
  ) => void;
  familyActions: FamilyActionsProps;
  settings: TreeSettings;
}

export const PersonHeaderView = memo<PersonHeaderViewProps>(
  ({ person, canEdit, onOpenModal, familyActions, settings }) => {
    const { t } = useTranslation();
    const fullName =
      [person.title, person.firstName, person.middleName, person.lastName, person.suffix]
        .filter(Boolean)
        .join(' ') || t.unnamedPerson;
    // Use configured format, default to ISO if not set (though settings usually has default)
    const dateFormat = settings.dateFormat;
    const displayBirth = formatDate(person.birthDate, dateFormat);
    const displayDeath = formatDate(person.deathDate, dateFormat);

    // Define common button classes for consistency
    const baseButtonClasses =
      'flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all duration-200 active:scale-95 min-w-fit whitespace-nowrap border border-[var(--border-soft)] shadow-[var(--shadow-sm)]';

    const quickAddActions = [
      {
        onClick: () => familyActions.onAddParent('male'),
        icon: <UserRound className='w-3 h-3' />,
        colorClasses:
          'bg-[var(--gender-male-bg)] text-[var(--gender-male-text)] hover:-translate-y-0.5',
        label: t.addFather,
      },
      {
        onClick: () => familyActions.onAddParent('female'),
        icon: <UserRound className='w-3 h-3' />,
        colorClasses:
          'bg-[var(--gender-female-bg)] text-[var(--gender-female-text)] hover:-translate-y-0.5',
        label: t.addMother,
      },
      {
        onClick: () => familyActions.onAddSpouse('male'),
        icon: <Heart className='w-3 h-3' />,
        colorClasses:
          'bg-[var(--surface-subtle)] text-[var(--color-info-500)] hover:-translate-y-0.5',
        label: t.addHusband,
      },
      {
        onClick: () => familyActions.onAddSpouse('female'),
        icon: <Heart className='w-3 h-3' />,
        colorClasses:
          'bg-[color:rgba(197,160,89,0.14)] text-[var(--color-accent-500)] hover:-translate-y-0.5',
        label: t.addWife,
      },
      {
        onClick: () => familyActions.onAddChild('male'),
        icon: <Baby className='w-3 h-3' />,
        colorClasses:
          'bg-[var(--primary-50)] text-[var(--primary-600)] hover:-translate-y-0.5',
        label: t.addSon,
      },
      {
        onClick: () => familyActions.onAddChild('female'),
        icon: <Baby className='w-3 h-3' />,
        colorClasses:
          'bg-[color:rgba(197,160,89,0.12)] text-[var(--support-700)] hover:-translate-y-0.5',
        label: t.addDaughter,
      },
    ];

    return (
      <div className='space-y-5 pb-4'>
        <div
          data-smart-persona-field="identity"
          tabIndex={-1}
          className='ds-persona-section animate-in fade-in flex min-w-0 scroll-mt-4 flex-row items-start gap-4 rounded-lg p-4 duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)]/50 sm:gap-5 sm:p-5'
        >
          {/* Image */}
          <div className='flex shrink-0 flex-col items-center gap-2 self-start'>
            <div className='relative'>
              <div
                className={`flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] shadow-[var(--shadow-sm)] sm:h-28 sm:w-28 ${person.isDeceased ? 'grayscale' : ''}`}
              >
                <SmartAvatar
                  person={person}
                  size={112}
                  className='rounded-2xl'
                />
              </div>
            </div>
          </div>

          {/* Info */}
          <div className='min-w-0 flex-1 space-y-2 pt-0 text-start'>
            <div className='block'>
              <h2 className='text-xl sm:text-2xl font-black text-[var(--text-main)] leading-tight tracking-tight lg:truncate'>
                {fullName}
              </h2>
              {(person.birthName || person.nickName) && (
                <p className='text-[11px] sm:text-xs text-[var(--text-muted)] italic font-medium opacity-80'>
                  {person.nickName && `"${person.nickName}"`}
                  {person.nickName && person.birthName && ' • '}
                  {person.birthName && `${t.nee} ${person.birthName}`}
                </p>
              )}
            </div>
            <div className='space-y-1'>
              <div className='flex items-center gap-2 text-[11px] font-medium'>
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
              <div
                data-smart-persona-field="vitalDates"
                tabIndex={-1}
                className='space-y-1 scroll-mt-4 rounded-lg pt-1 focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)]/50'
              >
                <div
                  data-smart-persona-field="birthDate"
                  tabIndex={-1}
                  className='flex scroll-mt-4 items-center gap-2 rounded-lg text-xs text-[var(--text-main)] group cursor-help focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)]/50'
                  title={person.birthSource ? `${t.source}: ${person.birthSource}` : ''}
                >
                  <Baby className='w-3.5 h-3.5 text-[var(--text-dim)]' />
                  <span>
                    {t.born}{' '}
                    <strong className='text-[var(--text-main)]'>
                      {displayBirth || t.unknownDate}
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
                    data-smart-persona-field="deathDate"
                    tabIndex={-1}
                    className='flex scroll-mt-4 items-center gap-2 rounded-lg text-xs text-[var(--text-main)] group cursor-help focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)]/50'
                    title={person.deathSource ? `${t.source}: ${person.deathSource}` : ''}
                  >
                    <Ribbon className='w-3.5 h-3.5 text-[var(--text-dim)]' />
                    <span>
                      {t.died}{' '}
                      <strong className='text-[var(--text-main)]'>
                        {displayDeath || t.unknownDate}
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

        <div className='h-px bg-[var(--border-soft)]'></div>

        {/* Actions Section - Consolidated */}
        <div className='ds-persona-section p-4 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200'>
          <div className='ds-label px-1'>{t.personQuickActions}</div>
          <div className='grid grid-cols-2 gap-2 px-1 pb-2'>
            {person.isDeceased && (
              <button
                onClick={() => onOpenModal('chat')}
                className={`${baseButtonClasses} w-full bg-[var(--primary-600)] text-[var(--primary-text)] border-transparent`}
              >
                <MessageCircle className='w-3.5 h-3.5' /> {t.chatWithAncestor}
              </button>
            )}

            {/* Quick Add Speed Dial */}
            {canEdit && (
              <div className={person.isDeceased ? 'col-span-1' : 'col-span-2'}>
                <QuickAddSpeedDial
                  actions={quickAddActions}
                  buttonClassName={`${baseButtonClasses} w-full bg-[var(--primary-50)] text-[var(--primary-600)] border-[rgba(var(--primary-600-rgb),0.14)]`}
                />
              </div>
            )}

            <button
              onClick={() => onOpenModal('map')}
              className={`${baseButtonClasses} w-full bg-[var(--surface-subtle)] text-[var(--text-main)]`}
            >
              <MapPin className='w-3.5 h-3.5' /> {t.viewOnMap}
            </button>
            <button
              onClick={() => onOpenModal('timeline')}
              className={`${baseButtonClasses} w-full bg-[var(--surface-subtle)] text-[var(--text-main)]`}
            >
              <CalendarDays className='w-3.5 h-3.5' /> {t.familyTimelineHeader}
            </button>
          </div>
        </div>
      </div>
    );
  }
);
