import React, { useState, memo } from 'react';
import { Person } from '../../types';
import { Card } from '../ui/Card';
import { FormField } from '../ui/FormField';
import { DateSelect } from '../DateSelect';
import { Plus, Calendar, MapPin, FileText, Info, Trash2 } from 'lucide-react';
import { useTranslation } from '../../context/TranslationContext';

interface EventsTabProps {
  person: Person;
  isEditing: boolean;
  onUpdate: (id: string, updates: Partial<Person>) => void;
}

export const EventsTab: React.FC<EventsTabProps> = memo(({ person, isEditing, onUpdate }) => {
  const { t } = useTranslation();
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventPlace, setNewEventPlace] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');
  const [newEventType, setNewEventType] = useState('');

  const handleAddEvent = () => {
    if (newEventTitle.trim() && newEventDate.trim()) {
      const newEvent = {
        id: crypto.randomUUID(),
        title: newEventTitle.trim(),
        date: newEventDate.trim(),
        place: newEventPlace.trim() || undefined,
        description: newEventDescription.trim() || undefined,
        type: newEventType.trim() || undefined,
      };
      onUpdate(person.id, { events: [...(person.events || []), newEvent] });
      setNewEventTitle('');
      setNewEventDate('');
      setNewEventPlace('');
      setNewEventDescription('');
      setNewEventType('');
    }
  };

  const handleUpdateEvent = (id: string, field: string, value: string) => {
    const updatedEvents = (person.events || []).map(event =>
      event.id === id ? { ...event, [field]: value } : event
    );
    onUpdate(person.id, { events: updatedEvents });
  };

  const handleRemoveEvent = (id: string) => {
    const filteredEvents = (person.events || []).filter(event => event.id !== id);
    onUpdate(person.id, { events: filteredEvents });
  };

  const hasEvents = person.events && person.events.length > 0;

  return (
    <Card title={t.eventsTab}>
      {isEditing && (
        <div className="mb-4 p-3 bg-stone-50 dark:bg-stone-900/50 rounded-xl border border-dashed border-stone-200 dark:border-stone-700 space-y-2">
          <FormField
            label={t.eventTitle}
            value={newEventTitle}
            onCommit={setNewEventTitle}
            placeholder={t.eventTitlePlaceholder}
            className="!h-7 !text-xs"
            labelWidthClass="w-20"
          />
          <div className="flex items-center gap-2">
            <label className="w-20 shrink-0 text-xs text-stone-600 dark:text-stone-400 font-medium">{t.eventDate}</label>
            <DateSelect value={newEventDate} onChange={setNewEventDate} />
          </div>
          <FormField
            label={t.eventPlace}
            value={newEventPlace}
            onCommit={setNewEventPlace}
            placeholder={t.eventPlacePlaceholder}
            className="!h-7 !text-xs"
            labelWidthClass="w-20"
          />
          <FormField
            label={t.eventType}
            value={newEventType}
            onCommit={setNewEventType}
            placeholder={t.eventTypePlaceholder}
            className="!h-7 !text-xs"
            labelWidthClass="w-20"
          />
          <FormField
            label={t.eventDescription}
            value={newEventDescription}
            onCommit={setNewEventDescription}
            placeholder={t.eventDescriptionPlaceholder}
            isTextArea={true}
            rows={2}
            className="!text-xs"
            labelWidthClass="w-20"
          />
          <button
            onClick={handleAddEvent}
            disabled={!newEventTitle.trim() || !newEventDate.trim()}
            className="w-full py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-stone-300 dark:disabled:bg-stone-700 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all mt-3"
          >
            <Plus className="w-4 h-4" /> {t.addEvent}
          </button>
        </div>
      )}

      {!hasEvents && !isEditing ? (
        <div className="text-center py-4 text-stone-400 dark:text-stone-500 bg-stone-50 dark:bg-stone-800/50 rounded-xl border border-dashed border-stone-200 dark:border-stone-700 flex flex-col items-center">
          <Calendar className="w-8 h-8 mb-2 opacity-50" />
          <span className="text-sm">{t.noEventsAdded}</span>
        </div>
      ) : (
        <div className="space-y-3">
          {(person.events || []).map((event, idx) => (
            <div key={event.id} className="p-3 bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-700 rounded-xl shadow-sm group">
              {isEditing ? (
                <div className="space-y-1.5">
                  <FormField
                    label={t.eventTitle}
                    value={event.title}
                    onCommit={(v) => handleUpdateEvent(event.id, 'title', v)}
                    disabled={!isEditing}
                    className="!h-7 !text-xs"
                    labelWidthClass="w-20"
                  />
                  <div className="flex items-center gap-2">
                    <label className="w-20 shrink-0 text-xs text-stone-600 dark:text-stone-400 font-medium">{t.eventDate}</label>
                    <DateSelect value={event.date} onChange={(v) => handleUpdateEvent(event.id, 'date', v)} disabled={!isEditing} />
                  </div>
                  <FormField
                    label={t.eventPlace}
                    value={event.place || ''}
                    onCommit={(v) => handleUpdateEvent(event.id, 'place', v)}
                    disabled={!isEditing}
                    className="!h-7 !text-xs"
                    labelWidthClass="w-20"
                  />
                  <FormField
                    label={t.eventType}
                    value={event.type || ''}
                    onCommit={(v) => handleUpdateEvent(event.id, 'type', v)}
                    disabled={!isEditing}
                    className="!h-7 !text-xs"
                    labelWidthClass="w-20"
                  />
                  <FormField
                    label={t.eventDescription}
                    value={event.description || ''}
                    onCommit={(v) => handleUpdateEvent(event.id, 'description', v)}
                    disabled={!isEditing}
                    isTextArea={true}
                    rows={2}
                    className="!text-xs"
                    labelWidthClass="w-20"
                  />
                  <button
                    onClick={() => handleRemoveEvent(event.id)}
                    className="w-full py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2 mt-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> {t.removeEvent}
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-stone-800 dark:text-stone-200 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-500" /> {event.title}
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-stone-500 dark:text-stone-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {event.date}
                    </span>
                    {event.place && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {event.place}
                      </span>
                    )}
                    {event.type && (
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" /> {event.type}
                      </span>
                    )}
                  </div>
                  {event.description && (
                    <p className="text-xs text-stone-700 dark:text-stone-300 mt-1">{event.description}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
});