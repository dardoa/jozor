import { useState, memo } from 'react';
import { EMPTY_STRING } from '../../constants';
import DOMPurify from 'dompurify';
import { Person } from '../../types';
import { generateBiography } from '../../services/geminiService';
import {
  Sparkles,
  Loader2,
  Info,
  Plus,
  BookOpen,
  Link,
  Calendar,
  Tag,
  MapPin,
  FileText,
  Trash2,
} from 'lucide-react';
import { SmartTextarea } from '../ui/SmartInput';
import { FormField } from '../ui/FormField';
import { Card } from '../ui/Card';
import { DateSelect } from '../DateSelect';
import { useTranslation } from '../../context/TranslationContext';
import { showError, showSuccess } from '../../utils/toast'; // Import toast utilities

interface BioTabProps {
  person: Person;
  people: Record<string, Person>;
  isEditing: boolean;
  onUpdate: (id: string, updates: Partial<Person>) => void;
}

export const BioTab = memo<BioTabProps>(({ person, people, isEditing, onUpdate }) => {
  const { t } = useTranslation();
  const [isGenerating, setIsGenerating] = useState(false);
  const [bioTone, setBioTone] = useState('standard');

  // State for Sources
  const [newSourceTitle, setNewSourceTitle] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [newSourceDate, setNewSourceDate] = useState('');
  const [newSourceType, setNewSourceType] = useState('');

  // State for Events
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventPlace, setNewEventPlace] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');
  const [newEventType, setNewEventType] = useState('');

  const handleChange = (field: keyof Person, value: any) => {
    onUpdate(person.id, { [field]: value });
  };

  const handleGenerateBio = async () => {
    setIsGenerating(true);
    try {
      const bio = await generateBiography(person, people, t.personFields.tones[bioTone as keyof typeof t.personFields.tones]);
      handleChange('bio', bio);
    } catch {
      showError(t.modals.messages.error.bio);
    } finally {
      setIsGenerating(false);
    }
  };

  const hasWorkInterests = person.profession || person.company || person.interests;
  const hasSources = person.sources && person.sources.length > 0;
  const hasEvents = person.events && person.events.length > 0;

  // --- Source Handlers ---
  const handleAddSource = () => {
    if (newSourceTitle.trim()) {
      const newSource = {
        id: crypto.randomUUID(),
        title: newSourceTitle.trim(),
        url: newSourceUrl.trim() || undefined,
        date: newSourceDate.trim() || undefined,
        type: newSourceType.trim() || undefined,
      };
      onUpdate(person.id, { sources: [...(person.sources || []), newSource] });
      setNewSourceTitle('');
      setNewSourceUrl('');
      setNewSourceDate('');
      setNewSourceType('');
      showSuccess(t.modals.messages.success.sourceAdded);
    }
  };

  const handleUpdateSource = (id: string, field: string, value: string) => {
    const updatedSources = (person.sources || []).map((source) =>
      source.id === id ? { ...source, [field]: value } : source
    );
    onUpdate(person.id, { sources: updatedSources });
  };

  const handleRemoveSource = (id: string) => {
    const filteredSources = (person.sources || []).filter((source) => source.id !== id);
    onUpdate(person.id, { sources: filteredSources });
    showSuccess(t.modals.messages.success.sourceRemoved);
  };

  // --- Event Handlers ---
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
      showSuccess(t.modals.messages.success.eventAdded);
    }
  };

  const handleUpdateEvent = (id: string, field: string, value: string) => {
    const updatedEvents = (person.events || []).map((event) =>
      event.id === id ? { ...event, [field]: value } : event
    );
    onUpdate(person.id, { events: updatedEvents });
  };

  const handleRemoveEvent = (id: string) => {
    const filteredEvents = (person.events || []).filter((event) => event.id !== id);
    onUpdate(person.id, { events: filteredEvents });
    showSuccess(t.modals.messages.success.eventRemoved);
  };

  return (
    <div className='space-y-4'>
      {/* --- WORK & INTERESTS --- */}
      <Card title={t.personFields.workInterests}>
        {!hasWorkInterests && !isEditing ? (
          <div className='text-center py-4 text-[var(--text-muted)] bg-[var(--theme-bg)]/50 rounded-xl border border-dashed border-[var(--border-main)] flex flex-col items-center'>
            <Info className='w-8 h-8 mb-2 opacity-50' />
            <span className='text-sm'>
              {t.modals.noWorkInterests}
            </span>
          </div>
        ) : (
          <>
            <FormField
              label={t.personFields.profession}
              value={person.profession}
              onCommit={(v: string) => handleChange('profession', v)}
              disabled={!isEditing}
              placeholder={isEditing ? t.personFields.professionPlaceholder : ''}
              labelWidthClass='w-24'
            />

            <FormField
              label={t.personFields.company}
              value={person.company}
              onCommit={(v: string) => handleChange('company', v)}
              disabled={!isEditing}
              placeholder={isEditing ? t.personFields.companyPlaceholder : ''}
              labelWidthClass='w-24'
            />

            <FormField
              label={t.personFields.interests}
              value={person.interests}
              onCommit={(v: string) => handleChange('interests', v)}
              disabled={!isEditing}
              placeholder={isEditing ? t.personFields.interestsPlaceholder : ''}
              labelWidthClass='w-24'
            />
          </>
        )}
      </Card>

      {/* --- BIOGRAPHY --- */}
      <Card title={t.personFields.biography}>
        <div className='flex justify-between items-center relative z-10 mb-3'>
          {isEditing && (
            <div className='flex items-center gap-2 ms-auto'>
              <span className='text-[9px] text-[var(--text-dim)]'>{t.personFields.tone}:</span>
              <select
                value={bioTone}
                onChange={(e) => setBioTone(e.target.value)}
                aria-label={t.personFields.tone}
                className='text-[8px] border border-[var(--border-main)] rounded-lg px-2 py-0.5 bg-[var(--theme-bg)] outline-none focus:border-[var(--primary-500)] text-[var(--text-main)] h-6'
              >
                <option value='standard'>{t.personFields.tones.standard}</option>
                <option value='formal'>{t.personFields.tones.formal}</option>
                <option value='storyteller'>{t.personFields.tones.storyteller}</option>
                <option value='humorous'>{t.personFields.tones.humorous}</option>
                <option value='journalistic'>{t.personFields.tones.journalistic}</option>
              </select>
              <button
                onClick={handleGenerateBio}
                disabled={isGenerating}
                className='text-[8px] text-[var(--primary-600)] hover:text-[var(--primary-700)] flex items-center gap-1 bg-[var(--primary-600)]/10 px-1.5 py-0.5 rounded-full border border-[var(--primary-600)]/20 transition-colors font-bold'
              >
                {isGenerating ? (
                  <Loader2 className='w-2.5 h-2.5 animate-spin' />
                ) : (
                  <Sparkles className='w-2.5 h-2.5' />
                )}
                {isGenerating ? '...' : t.personFields.generate}
              </button>
            </div>
          )}
        </div>
        {isEditing ? (
          <SmartTextarea
            disabled={!isEditing}
            rows={8}
            value={person.bio}
            onCommit={(v: string) => handleChange('bio', v)}
            className='w-full px-2.5 py-1.5 border border-[var(--border-main)] rounded-lg text-xs outline-none focus:border-[var(--primary-500)] transition-colors bg-[var(--card-bg)] text-[var(--text-main)] disabled:bg-transparent disabled:border-transparent disabled:px-0 disabled:cursor-default disabled:font-medium'
            placeholder={isEditing ? t.personFields.writeBio : t.personFields.noBio}
          />
        ) : (
          <div className='text-sm text-[var(--text-main)] leading-relaxed'>
            {person.bio ? (
              <div className='space-y-2' dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(person.bio) }} />
            ) : (
              <p className='text-[var(--text-muted)] italic'>{t.personFields.noBio}</p>
            )}
          </div>
        )}
      </Card>

      {/* --- SOURCES SECTION --- */}
      <Card title={t.personFields.sourcesTab}>
        {isEditing && (
          <div className='mb-4 p-3 bg-[var(--theme-bg)]/50 rounded-xl border border-dashed border-[var(--border-main)] space-y-2'>
            <FormField
              label={t.personFields.sourceTitle}
              value={newSourceTitle}
              onCommit={setNewSourceTitle}
              placeholder={t.personFields.sourceTitlePlaceholder}
              className='!h-7 !text-xs'
              labelWidthClass='w-20'
            />
            <FormField
              label={t.personFields.sourceUrl}
              value={newSourceUrl}
              onCommit={setNewSourceUrl}
              placeholder='https://...'
              type='url'
              className='!h-7 !text-xs'
              labelWidthClass='w-20'
            />
            <FormField
              label={t.personFields.sourceDate}
              value={newSourceDate}
              onCommit={setNewSourceDate}
              placeholder='YYYY-MM-DD'
              className='!h-7 !text-xs'
              labelWidthClass='w-20'
            />
            <FormField
              label={t.personFields.sourceType}
              value={newSourceType}
              onCommit={setNewSourceType}
              placeholder={t.personFields.sourceTypePlaceholder}
              className='!h-7 !text-xs'
              labelWidthClass='w-20'
            />
            <button
              onClick={handleAddSource}
              disabled={!newSourceTitle.trim()}
              className='w-full py-2 bg-[var(--primary-600)] hover:bg-[var(--primary-700)] disabled:bg-[var(--border-main)] text-[var(--primary-text)] rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all mt-3'
            >
              <Plus className='w-4 h-4' /> {t.personFields.addSource}
            </button>
          </div>
        )}

        {!hasSources && !isEditing ? (
          <div className='text-center py-4 text-[var(--text-muted)] bg-[var(--theme-bg)]/50 rounded-xl border border-dashed border-[var(--border-main)] flex flex-col items-center'>
            <BookOpen className='w-8 h-8 mb-2 opacity-50' />
            <span className='text-sm'>{t.personFields.noSources}</span>
          </div>
        ) : (
          <div className='space-y-3'>
            {(person.sources || []).map((source) => (
              <div
                key={source.id}
                className='p-3 bg-[var(--card-bg)] border border-[var(--border-main)] rounded-xl shadow-sm group'
              >
                {isEditing ? (
                  <div className='space-y-1.5'>
                    <FormField
                      label={t.personFields.sourceTitle}
                      value={source.title}
                      onCommit={(v: string) => handleUpdateSource(source.id, 'title', v)}
                      disabled={!isEditing}
                      className='!h-7 !text-xs'
                      labelWidthClass='w-20'
                    />
                    <FormField
                      label={t.personFields.sourceUrl}
                      value={source.url || EMPTY_STRING}
                      onCommit={(v: string) => handleUpdateSource(source.id, 'url', v)}
                      disabled={!isEditing}
                      type='url'
                      className='!h-7 !text-xs'
                      labelWidthClass='w-20'
                    />
                    <FormField
                      label={t.personFields.sourceDate}
                      value={source.date || EMPTY_STRING}
                      onCommit={(v: string) => handleUpdateSource(source.id, 'date', v)}
                      disabled={!isEditing}
                      className='!h-7 !text-xs'
                      labelWidthClass='w-20'
                    />
                    <FormField
                      label={t.personFields.sourceType}
                      value={source.type || EMPTY_STRING}
                      onCommit={(v: string) => handleUpdateSource(source.id, 'type', v)}
                      disabled={!isEditing}
                      className='!h-7 !text-xs'
                      labelWidthClass='w-20'
                    />
                    <button
                      onClick={() => handleRemoveSource(source.id)}
                      className='w-full py-1.5 bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg text-xs font-bold hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2 mt-2'
                    >
                      <Trash2 className='w-3.5 h-3.5' /> {t.personFields.removeSource}
                    </button>
                  </div>
                ) : (
                  <div className='space-y-1'>
                    <h4 className='font-bold text-sm text-[var(--text-main)] flex items-center gap-2'>
                      <BookOpen className='w-4 h-4 text-[var(--primary-600)]' /> {source.title}
                    </h4>
                    {source.url && (
                      <a
                        href={source.url}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='flex items-center gap-1.5 text-xs text-[var(--primary-600)] hover:underline'
                      >
                        <Link className='w-3 h-3' /> {source.url}
                      </a>
                    )}
                    <div className='flex items-center gap-3 text-xs text-[var(--text-muted)]'>
                      {source.date && (
                        <span className='flex items-center gap-1'>
                          <Calendar className='w-3 h-3' /> {source.date}
                        </span>
                      )}
                      {source.type && (
                        <span className='flex items-center gap-1'>
                          <Tag className='w-3 h-3' /> {source.type}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* --- EVENTS SECTION --- */}
      <Card title={t.personFields.eventsTab}>
        {isEditing && (
          <div className='mb-4 p-3 bg-[var(--theme-bg)]/50 rounded-xl border border-dashed border-[var(--border-main)] space-y-2'>
            <FormField
              label={t.personFields.eventTitle}
              value={newEventTitle}
              onCommit={setNewEventTitle}
              placeholder={t.personFields.eventTitlePlaceholder}
              className='!h-7 !text-xs'
              labelWidthClass='w-20'
            />
            <div className='flex items-center gap-2'>
              <label className='w-20 shrink-0 text-xs text-[var(--text-muted)] font-medium'>
                {t.personFields.eventDate}
              </label>
              <DateSelect value={newEventDate} onChange={setNewEventDate} />
            </div>
            <FormField
              label={t.personFields.eventPlace}
              value={newEventPlace}
              onCommit={setNewEventPlace}
              placeholder={t.personFields.eventPlacePlaceholder}
              className='!h-7 !text-xs'
              labelWidthClass='w-20'
            />
            <FormField
              label={t.personFields.eventType}
              value={newEventType}
              onCommit={setNewEventType}
              placeholder={t.personFields.eventTypePlaceholder}
              className='!h-7 !text-xs'
              labelWidthClass='w-20'
            />
            <FormField
              label={t.personFields.eventDescription}
              value={newEventDescription}
              onCommit={setNewEventDescription}
              placeholder={t.personFields.eventDescriptionPlaceholder}
              isTextArea={true}
              rows={2}
              className='!text-xs'
              labelWidthClass='w-20'
            />
            <button
              onClick={handleAddEvent}
              disabled={!newEventTitle.trim() || !newEventDate.trim()}
              className='w-full py-2 bg-[var(--primary-600)] hover:bg-[var(--primary-700)] disabled:bg-[var(--border-main)] text-[var(--primary-text)] rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all mt-3'
            >
              <Plus className='w-4 h-4' /> {t.personFields.addEvent}
            </button>
          </div>
        )}

        {!hasEvents && !isEditing ? (
          <div className='text-center py-4 text-[var(--text-muted)] bg-[var(--theme-bg)]/50 rounded-xl border border-dashed border-[var(--border-main)] flex flex-col items-center'>
            <Calendar className='w-8 h-8 mb-2 opacity-50' />
            <span className='text-sm'>{t.personFields.noEventsAdded}</span>
          </div>
        ) : (
          <div className='space-y-3'>
            {(person.events || []).map((event) => (
              <div
                key={event.id}
                className='p-3 bg-[var(--card-bg)] border border-[var(--border-main)] rounded-xl shadow-sm group'
              >
                {isEditing ? (
                  <div className='space-y-1.5'>
                    <FormField
                      label={t.personFields.eventTitle}
                      value={event.title}
                      onCommit={(v: string) => handleUpdateEvent(event.id, 'title', v)}
                      disabled={!isEditing}
                      className='!h-7 !text-xs'
                      labelWidthClass='w-20'
                    />
                    <div className='flex items-center gap-2'>
                      <label className='w-20 shrink-0 text-xs text-[var(--text-muted)] font-medium'>
                        {t.personFields.eventDate}
                      </label>
                      <DateSelect
                        value={event.date}
                        onChange={(v: string) => handleUpdateEvent(event.id, 'date', v)}
                        disabled={!isEditing}
                      />
                    </div>
                    <FormField
                      label={t.personFields.eventPlace}
                      value={event.place || EMPTY_STRING}
                      onCommit={(v: string) => handleUpdateEvent(event.id, 'place', v)}
                      disabled={!isEditing}
                      className='!h-7 !text-xs'
                      labelWidthClass='w-20'
                    />
                    <FormField
                      label={t.personFields.eventType}
                      value={event.type || EMPTY_STRING}
                      onCommit={(v: string) => handleUpdateEvent(event.id, 'type', v)}
                      disabled={!isEditing}
                      className='!h-7 !text-xs'
                      labelWidthClass='w-20'
                    />
                    <FormField
                      label={t.personFields.eventDescription}
                      value={event.description || EMPTY_STRING}
                      onCommit={(v: string) => handleUpdateEvent(event.id, 'description', v)}
                      disabled={!isEditing}
                      isTextArea={true}
                      rows={2}
                      className='!text-xs'
                      labelWidthClass='w-20'
                    />
                    <button
                      onClick={() => handleRemoveEvent(event.id)}
                      className='w-full py-1.5 bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg text-xs font-bold hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2 mt-2'
                    >
                      <Trash2 className='w-3.5 h-3.5' /> {t.personFields.removeEvent}
                    </button>
                  </div>
                ) : (
                  <div className='space-y-1'>
                    <h4 className='font-bold text-sm text-[var(--text-main)] flex items-center gap-2'>
                      <Calendar className='w-4 h-4 text-[var(--primary-600)]' /> {event.title}
                    </h4>
                    <div className='flex items-center gap-3 text-xs text-[var(--text-muted)]'>
                      <span className='flex items-center gap-1'>
                        <Calendar className='w-3 h-3' /> {event.date}
                      </span>
                      {event.place && (
                        <span className='flex items-center gap-1'>
                          <MapPin className='w-3 h-3' /> {event.place}
                        </span>
                      )}
                      {event.type && (
                        <span className='flex items-center gap-1'>
                          <FileText className='w-3 h-3' /> {event.type}
                        </span>
                      )}
                    </div>
                    {event.description && (
                      <p className='text-xs text-[var(--text-main)] mt-1'>
                        {event.description}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
});
