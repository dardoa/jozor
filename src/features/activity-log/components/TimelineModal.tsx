import { useMemo, useState } from 'react';
import { Person, TimelineEvent, Language } from '../../../types';
import {
  X,
  Calendar,
  Baby,
  Heart,
  Ribbon,
  Info,
  Filter,
  FileText,
  Home,
  MapPin,
  Search,
} from 'lucide-react';
import { getDisplayDate } from '../../../utils/familyLogic';
import { useTranslation } from '../../../context/TranslationContext';
import { OverlayPrimitive } from '../../../context/OverlayContext';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';

interface TimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  people: Record<string, Person>;
  onSelectPerson: (id: string) => void;
  language?: Language;
  focusPersonId?: string;
}

type EventTypeMeta = {
  label: string;
  chipClass: string;
  iconWrapClass: string;
  icon: typeof Baby;
};

type TimelineTranslations = {
  birth?: string;
  births?: string;
  familyScope: string;
  personScope: string;
  personTimeline: string;
  timelineSearchPlaceholder: string;
  timelineSearchResults: (visible: number, total: number) => string;
  showMoreEvents: string;
};

const TIMELINE_EVENT_BATCH_SIZE = 50;

const buildPersonName = (person: Person) =>
  [person.firstName, person.middleName, person.lastName].filter(Boolean).join(' ').trim();

export const TimelineModal = ({ isOpen, onClose, people, onSelectPerson, focusPersonId }: TimelineModalProps) => {
  const { t } = useTranslation();
  const timelineText = t as typeof t & TimelineTranslations;
  const [sortAsc, setSortAsc] = useState(true);
  const [activeFilters, setActiveFilters] = useState<Set<TimelineEvent['type']>>(
    new Set(['birth', 'death', 'marriage', 'custom'])
  );
  const [scope, setScope] = useState<'person' | 'family'>(focusPersonId ? 'person' : 'family');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleLimit, setVisibleLimit] = useState(TIMELINE_EVENT_BATCH_SIZE);
  const focusPerson = focusPersonId ? people[focusPersonId] : undefined;
  const isPersonScope = scope === 'person' && !!focusPerson;
  const title = isPersonScope
    ? `${buildPersonName(focusPerson) || t.unnamedPerson} - ${timelineText.personTimeline}`
    : t.familyTimeline;

  const toggleFilter = (type: TimelineEvent['type']) => {
    setVisibleLimit(TIMELINE_EVENT_BATCH_SIZE);
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const eventTypes = useMemo(
    () => [
      { id: 'birth' as const, label: t.births, icon: <Baby className='h-3.5 w-3.5' />, tone: 'bg-emerald-50 text-emerald-700' },
      { id: 'death' as const, label: t.deaths, icon: <Ribbon className='h-3.5 w-3.5' />, tone: 'bg-stone-100 text-stone-700' },
      { id: 'marriage' as const, label: t.marriages, icon: <Heart className='h-3.5 w-3.5' />, tone: 'bg-rose-50 text-rose-700' },
      { id: 'custom' as const, label: t.customEvents, icon: <FileText className='h-3.5 w-3.5' />, tone: 'bg-[#edf3f8] text-[#526b82]' },
    ],
    [t]
  );

  const eventTypeMeta = useMemo<Record<TimelineEvent['type'], EventTypeMeta>>(
    () => ({
      birth: {
        label: timelineText.births || timelineText.birth || t.born,
        chipClass: 'bg-emerald-50 text-emerald-700',
        iconWrapClass: 'bg-emerald-50 text-emerald-700',
        icon: Baby,
      },
      death: {
        label: t.deaths,
        chipClass: 'bg-stone-100 text-stone-700',
        iconWrapClass: 'bg-stone-100 text-stone-700',
        icon: Ribbon,
      },
      marriage: {
        label: t.marriage,
        chipClass: 'bg-rose-50 text-rose-700',
        iconWrapClass: 'bg-rose-50 text-rose-700',
        icon: Heart,
      },
      custom: {
        label: t.customEvents,
        chipClass: 'bg-[#edf3f8] text-[#526b82]',
        iconWrapClass: 'bg-[#edf3f8] text-[#526b82]',
        icon: Home,
      },
    }),
    [t, timelineText.birth, timelineText.births]
  );

  const events = useMemo(() => {
    const list: TimelineEvent[] = [];

    const scopedPeople = isPersonScope ? [focusPerson] : Object.values(people);

    scopedPeople.forEach((person) => {
      if (person.birthDate) {
        const y = parseInt(getDisplayDate(person.birthDate));
        if (!isNaN(y)) {
          list.push({
            year: y,
            dateStr: person.birthDate,
            type: 'birth',
            personId: person.id,
            label: `${t.born}: ${person.firstName} ${person.lastName}`,
            subLabel: person.birthPlace,
          });
        }
      }

      if (person.isDeceased && person.deathDate) {
        const y = parseInt(getDisplayDate(person.deathDate));
        if (!isNaN(y)) {
          list.push({
            year: y,
            dateStr: person.deathDate,
            type: 'death',
            personId: person.id,
            label: `${t.died}: ${person.firstName} ${person.lastName}`,
            subLabel: person.deathPlace,
          });
        }
      }

      if (person.partnerDetails) {
        Object.entries(person.partnerDetails).forEach(([spouseId, info]) => {
          if (info.startDate && (focusPerson || person.id < spouseId)) {
            const y = parseInt(getDisplayDate(info.startDate));
            if (!isNaN(y)) {
              const spouse = people[spouseId];
              list.push({
                year: y,
                dateStr: info.startDate,
                type: 'marriage',
                personId: person.id,
                relatedId: spouseId,
                label: `${t.marriage}: ${person.firstName} & ${spouse?.firstName}`,
                subLabel: info.startPlace,
              });
            }
          }
        });
      }

      person.events?.forEach((event) => {
        const y = parseInt(getDisplayDate(event.date));
        if (!isNaN(y)) {
          list.push({
            year: y,
            dateStr: event.date,
            type: 'custom',
            personId: person.id,
            label: event.title,
            subLabel: event.place || event.description,
          });
        }
      });
    });

    const normalizedQuery = searchQuery.trim().toLocaleLowerCase();

    return list
      .filter((event) => activeFilters.has(event.type))
      .filter((event) => {
        if (!normalizedQuery) return true;
        const person = people[event.personId];
        const relatedPerson = event.relatedId ? people[event.relatedId] : undefined;
        return [
          event.label,
          event.subLabel,
          person ? buildPersonName(person) : '',
          relatedPerson ? buildPersonName(relatedPerson) : '',
        ]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase()
          .includes(normalizedQuery);
      })
      .sort((a, b) => {
        if (sortAsc && a.year !== b.year) return a.year - b.year;
        if (!sortAsc && a.year !== b.year) return b.year - a.year;
        return sortAsc ? a.dateStr.localeCompare(b.dateStr) : b.dateStr.localeCompare(a.dateStr);
      });
  }, [people, focusPerson, isPersonScope, sortAsc, activeFilters, searchQuery, t]);

  const renderedEvents = events.slice(0, visibleLimit);

  const groupedEvents = useMemo(() => {
    const groups = new Map<number, TimelineEvent[]>();
    renderedEvents.forEach((event) => {
      const current = groups.get(event.year) || [];
      current.push(event);
      groups.set(event.year, current);
    });
    return Array.from(groups.entries()).map(([year, yearEvents]) => ({ year, events: yearEvents }));
  }, [renderedEvents]);

  return (
    <OverlayPrimitive isOpen={isOpen} onClose={onClose} id='timeline-modal'>
      <div
        className='ds-overlay-card flex h-[92dvh] w-full max-w-2xl flex-col overflow-hidden bg-[#FAF7F2] sm:h-[88vh] sm:rounded-[24px] shadow-[var(--shadow-lg)]'
        onClick={(e) => e.stopPropagation()}
      >
        <div className='ds-modal-header flex items-center justify-between bg-[#F6F1E7]'>
          <div className='flex items-center gap-2'>
            <div className='rounded-xl bg-[#a67c37]/10 p-2 text-[#a67c37]'>
              <Calendar className='h-5 w-5' />
            </div>
            <h3 className='text-[16px] font-semibold tracking-[0.2px] text-slate-800'>{title}</h3>
          </div>
          <div className='flex items-center gap-2'>
            <Button
              onClick={() => {
                setSortAsc(!sortAsc);
                setVisibleLimit(TIMELINE_EVENT_BATCH_SIZE);
              }}
              variant='secondary'
              size='sm'
              className='text-xs'
            >
              {sortAsc ? t.oldestFirst : t.newestFirst}
            </Button>
            <button
              onClick={onClose}
              aria-label={t.close}
              className='inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-white/80 hover:text-[var(--text-main)]'
            >
              <X className='h-5 w-5' />
            </button>
          </div>
        </div>

        <div className='space-y-3 border-b border-black/[0.05] bg-[#F6F1E7]/90 p-4'>
          <label className='relative block min-w-0'>
            <Search className='pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
            <input
              type='search'
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setVisibleLimit(TIMELINE_EVENT_BATCH_SIZE);
              }}
              placeholder={timelineText.timelineSearchPlaceholder}
              aria-label={timelineText.timelineSearchPlaceholder}
              className='h-10 w-full rounded-xl border border-black/[0.08] bg-white/80 ps-9 pe-3 text-sm text-slate-800 outline-none transition focus:border-[#a67c37] focus:ring-2 focus:ring-[#a67c37]/20'
            />
          </label>
          <div className='flex flex-wrap gap-2'>
          {focusPerson ? (
            <div className='me-2 inline-flex rounded-full border border-black/[0.06] bg-white/70 p-1 shadow-sm'>
              <button
                type='button'
                onClick={() => {
                  setScope('person');
                  setVisibleLimit(TIMELINE_EVENT_BATCH_SIZE);
                }}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                  scope === 'person' ? 'bg-[#3B271E] text-white' : 'text-slate-600 hover:bg-white'
                }`}
              >
                {timelineText.personScope}
              </button>
              <button
                type='button'
                onClick={() => {
                  setScope('family');
                  setVisibleLimit(TIMELINE_EVENT_BATCH_SIZE);
                }}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                  scope === 'family' ? 'bg-[#3B271E] text-white' : 'text-slate-600 hover:bg-white'
                }`}
              >
                {timelineText.familyScope}
              </button>
            </div>
          ) : null}
          <span className='me-2 flex items-center gap-1 text-xs font-bold uppercase text-[var(--text-muted)]'>
            <Filter className='h-3.5 w-3.5' /> {t.filterBy}:
          </span>
          {eventTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => toggleFilter(type.id)}
              className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                activeFilters.has(type.id) ? `${type.tone} shadow-sm` : 'bg-white/70 text-slate-500 hover:bg-white'
              }`}
            >
              {type.icon} {type.label}
            </button>
          ))}
          </div>
          <p className='text-[12px] text-slate-500'>
            {timelineText.timelineSearchResults(Math.min(renderedEvents.length, events.length), events.length)}
          </p>
        </div>

        <div className='relative flex-1 overflow-y-auto bg-[#FAF7F2] p-4 sm:p-6'>
          {groupedEvents.length === 0 ? (
            <EmptyState
              icon={<Info className='h-6 w-6' />}
              title={title}
              description={t.noEvents}
              className='mx-auto mt-16 max-w-md'
            />
          ) : (
            <div className='relative mx-auto max-w-xl space-y-8'>
              <div className='absolute bottom-0 start-[15px] top-0 w-px bg-black/[0.08]' />
              {groupedEvents.map((group) => (
                <section key={group.year} className='relative space-y-4'>
                  <div className='sticky top-0 z-10 ms-10 w-fit rounded-full bg-[#F6F1E7]/95 px-3 py-1 text-[12px] font-semibold tracking-[0.18px] text-slate-600 backdrop-blur-sm'>
                    {group.year}
                  </div>

                  <div className='space-y-4'>
                    {group.events.map((evt, idx) => {
                      const meta = eventTypeMeta[evt.type];
                      const EventIcon = meta.icon;
                      const showNotes = evt.type === 'custom' && !!evt.subLabel;

                      return (
                        <div key={`${group.year}-${idx}-${evt.personId}`} className='relative ps-10'>
                          <div className='absolute start-[7px] top-5 h-4 w-4 rounded-full bg-[#FAF7F2] ring-4 ring-[#FAF7F2]'>
                            <div className='h-full w-full rounded-full bg-[#C8AE7D]' />
                          </div>

                          <button
                            type='button'
                            onClick={() => {
                              onSelectPerson(evt.personId);
                              onClose();
                            }}
                            className='w-full rounded-[22px] bg-[#F9F7F3] p-4 text-start shadow-[0_2px_10px_rgba(0,0,0,0.03)] transition-all duration-200 ease-in-out hover:bg-[#f6f1e8]'
                          >
                            <div className='flex items-start justify-between gap-3'>
                              <div className='min-w-0 space-y-3'>
                                <div className='flex flex-wrap items-center gap-2'>
                                  <span className={`inline-flex min-h-8 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${meta.chipClass}`}>
                                    <EventIcon className='h-3.5 w-3.5' />
                                    {meta.label}
                                  </span>
                                </div>

                                <div className='space-y-1.5'>
                                  <p className='text-[15px] font-semibold text-slate-800'>{evt.label}</p>
                                  <div className='flex flex-wrap items-center gap-3 text-[13px] font-semibold text-slate-700'>
                                    <span>{evt.dateStr}</span>
                                    {evt.subLabel && !showNotes ? (
                                      <span className='inline-flex items-center gap-1.5 text-slate-600'>
                                        <MapPin className='h-3.5 w-3.5 text-slate-400' />
                                        {evt.subLabel}
                                      </span>
                                    ) : null}
                                  </div>
                                </div>

                                {showNotes ? <p className='text-[12px] leading-relaxed text-slate-500/85'>{evt.subLabel}</p> : null}
                              </div>

                              <div className={`hidden h-9 w-9 shrink-0 items-center justify-center rounded-full sm:inline-flex ${meta.iconWrapClass}`}>
                                <EventIcon className='h-4 w-4' />
                              </div>
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
              {renderedEvents.length < events.length ? (
                <button
                  type='button'
                  onClick={() => setVisibleLimit((current) => current + TIMELINE_EVENT_BATCH_SIZE)}
                  className='ms-10 w-[calc(100%-2.5rem)] rounded-xl border border-[#d9cbb8] bg-white px-4 py-2.5 text-sm font-semibold text-[#6f4b2f] transition hover:bg-[#f6f1e8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a67c37]'
                >
                  {timelineText.showMoreEvents}
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </OverlayPrimitive>
  );
};
