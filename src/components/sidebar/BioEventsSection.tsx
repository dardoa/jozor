import React from 'react';
import { Baby, Calendar, FileText, Heart, Home, MapPin, Plus, Trash2 } from 'lucide-react';

import { EMPTY_STRING } from '../../constants';
import type { Person } from '../../types';
import type { TranslationSchema } from '../../utils/translationLoader';
import { DateSelect } from '../DateSelect';
import { FormField } from '../ui/FormField';
import { PlaceInput } from '../ui/PlaceInput';
import { BioAccordionSection } from './BioAccordionSection';
import type { PersonEvent, PersonEventField } from './usePersonBio';

interface EventDraft {
  title: string;
  date: string;
  place: string;
  description: string;
  type: string;
  setTitle: (value: string) => void;
  setDate: (value: string) => void;
  setPlace: (value: string) => void;
  setDescription: (value: string) => void;
  setType: (value: string) => void;
}

interface LifeEventGroup {
  year: string;
  events: PersonEvent[];
}

interface BioEventsSectionProps {
  person: Person;
  isEditing: boolean;
  isOpen: boolean;
  hasEvents: boolean;
  groupedLifeEvents: LifeEventGroup[];
  t: TranslationSchema;
  draft: EventDraft;
  onToggle: () => void;
  onAdd: () => void;
  onUpdate: (id: string, field: PersonEventField, value: string | number) => void;
  onRemove: (id: string) => void;
}

const getLifeEventMeta = (type: string | undefined, t: TranslationSchema) => {
  const normalized = (type || '').trim().toLowerCase();

  if (normalized.includes('birth') || normalized.includes('ولاد')) {
    return {
      label: (t as any).birth,
      chipClass: 'bg-[#edf3f8] text-[#526b82] shadow-sm',
      icon: Baby,
    };
  }

  if (normalized.includes('marriage') || normalized.includes('wedding') || normalized.includes('زواج')) {
    return {
      label: t.marriage,
      chipClass: 'bg-rose-50 text-rose-700 shadow-sm',
      icon: Heart,
    };
  }

  if (normalized.includes('move') || normalized.includes('home') || normalized.includes('relocat') || normalized.includes('انتقال')) {
    return {
      label: t.eventType || 'Move',
      chipClass: 'bg-amber-50 text-amber-700 shadow-sm',
      icon: Home,
    };
  }

  return {
    label: type || t.eventsTab,
    chipClass: 'bg-[#f3efe6] text-[#8b6b36] shadow-sm',
    icon: FileText,
  };
};

export const BioEventsSection: React.FC<BioEventsSectionProps> = ({
  person,
  isEditing,
  isOpen,
  hasEvents,
  groupedLifeEvents,
  t,
  draft,
  onToggle,
  onAdd,
  onUpdate,
  onRemove,
}) => (
  <BioAccordionSection
    title={`${t.eventsTab}${person.events?.length ? ` (${person.events.length})` : ''}`}
    icon={<Calendar />}
    isOpen={isEditing || isOpen}
    onToggle={onToggle}
    hasContent={hasEvents}
    isEditing={isEditing}
  >
    <div className="space-y-4">
      {isEditing && (
        <div className="ds-empty-state p-4 space-y-3">
          <FormField label={t.eventTitle} value={draft.title} onCommit={(value: string | number) => draft.setTitle(String(value))} placeholder={t.eventTitlePlaceholder} className="!h-8 !text-xs" labelWidthClass="w-20" />
          <div className="flex items-center gap-2">
            <label className="w-20 shrink-0 text-xs text-[var(--text-muted)] font-bold">{t.eventDate}</label>
            <DateSelect value={draft.date} onChange={(value: string) => draft.setDate(value)} />
          </div>
          <PlaceInput label={t.eventPlace} value={draft.place} onCommit={(value: string) => draft.setPlace(value)} placeholder={t.eventPlacePlaceholder} labelWidthClass="w-20" />
          <FormField label={t.eventType} value={draft.type} onCommit={(value: string | number) => draft.setType(String(value))} placeholder={t.eventTypePlaceholder} className="!h-8 !text-xs" labelWidthClass="w-20" />
          <FormField label={t.eventDescription} value={draft.description} onCommit={(value: string | number) => draft.setDescription(String(value))} placeholder={t.eventDescriptionPlaceholder} isTextArea={true} rows={2} className="!text-xs" labelWidthClass="w-20" />
          <button
            onClick={onAdd}
            disabled={!draft.title.trim() || !draft.date.trim()}
            className="w-full py-2.5 bg-[var(--primary-600)] hover:bg-[var(--primary-700)] disabled:bg-[var(--border-main)] text-[var(--primary-text)] rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all mt-2 shadow-lg shadow-[var(--primary-600)]/20"
          >
            <Plus className="w-4 h-4" /> {t.addEvent}
          </button>
        </div>
      )}

      {!hasEvents && !isEditing ? (
        <p className="px-1 text-xs font-medium text-[var(--text-muted)] opacity-80">
          {t.noEventsAdded || 'No life events recorded yet'}
        </p>
      ) : (
        <>
          {isEditing ? (
            <div className="grid gap-3">
              {(person.events || []).map((event) => (
                <div key={event.id} className="p-4 bg-[var(--surface-panel)] border border-[var(--border-soft)] rounded-2xl shadow-[var(--shadow-sm)] hover:border-[var(--primary-500)]/30 transition-all group">
                  <div className="space-y-2">
                    <FormField label={t.eventTitle} value={event.title} onCommit={(value: string | number) => onUpdate(event.id, 'title', value)} className="!h-8 !text-xs" labelWidthClass="w-20" />
                    <FormField label={t.eventDate} value={event.date} onCommit={(value: string | number) => onUpdate(event.id, 'date', value)} />
                    <PlaceInput label={t.eventPlace} value={event.place || ''} onCommit={(value: string) => onUpdate(event.id, 'place', value)} labelWidthClass="w-20" />
                    <FormField label={t.eventType} value={event.type || EMPTY_STRING} onCommit={(value: string | number) => onUpdate(event.id, 'type', value)} className="!h-8 !text-xs" labelWidthClass="w-20" />
                    <FormField label={t.eventDescription} value={event.description || EMPTY_STRING} onCommit={(value: string | number) => onUpdate(event.id, 'description', value)} isTextArea={true} rows={2} className="!text-xs" labelWidthClass="w-20" />
                    <button onClick={() => onRemove(event.id)} className="flex items-center gap-2 text-[10px] font-bold text-red-500 hover:text-red-600 transition-colors pt-1 ms-auto">
                      <Trash2 className="w-3 h-3" /> {t.removeEvent}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="ds-timeline relative mx-auto max-w-full space-y-7 px-1" style={{ animation: 'bioTimelineFadeIn 220ms ease-out' }}>
              <div className="absolute bottom-0 start-[13px] top-0 w-px bg-[var(--border-soft)]" />
              {groupedLifeEvents.map((group) => (
                <section key={group.year} className="space-y-8">
                  <div className="ms-8 rounded-full bg-[#F6F1E7] px-3 py-1 text-[12px] font-semibold tracking-[0.18px] text-slate-600 w-fit">
                    {group.year}
                  </div>
                  <div className="space-y-4">
                    {group.events.map((event) => {
                      const meta = getLifeEventMeta(event.type, t);
                      const EventIcon = meta.icon;
                      return (
                        <div key={event.id} className="relative ps-9">
                          <div className="absolute start-[5px] top-5 h-4 w-4 rounded-full bg-[var(--surface-panel)] ring-4 ring-[var(--surface-panel)]">
                            <div className="h-full w-full rounded-full bg-[#C8AE7D]" />
                          </div>
                          <div className="rounded-[24px] bg-[var(--surface-panel)] p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border-b border-black/[0.04]">
                            <div className="space-y-4">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`inline-flex min-h-8 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${meta.chipClass}`}>
                                  <EventIcon className="h-3.5 w-3.5" />
                                  {meta.label}
                                </span>
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-[15px] font-semibold text-slate-800">{event.title}</p>
                                <div className="flex flex-wrap items-center gap-3 text-[13px] font-semibold text-slate-700">
                                  <span className="inline-flex items-center gap-1.5">
                                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                    {event.date}
                                  </span>
                                  {event.place ? (
                                    <span className="inline-flex items-center gap-1.5 text-slate-600">
                                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                                      {event.place}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                              {event.description ? (
                                <p className="text-[12px] leading-relaxed text-slate-500/85">{event.description}</p>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  </BioAccordionSection>
);
