import React, { useState, memo } from 'react';
import { Person } from '../../types';
import { generateBiography } from '../../services/geminiService';
import { Sparkles, Loader2, Info, Plus, BookOpen, Link, Calendar, Tag, MapPin, FileText, Trash2 } from 'lucide-react';
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

export const BioTab: React.FC<BioTabProps> = memo(({ person, people, isEditing, onUpdate }) => {
  const { t } = useTranslation();
  const [isGenerating, setIsGenerating] = useState(false);
  const [bioTone, setBioTone] = useState('Standard');

  // State for Sources
  const [newSourceTitle, setNewSourceTitle] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [newSourceDate, setNewSourceDate] = useState('');
  const [newSourceType, setNewSourceType] = useState('');
  // const [showSourcesSection, setShowSourcesSection] = useState(true); // Removed

  // State for Events
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventPlace, setNewEventPlace] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');
  const [newEventType, setNewEventType] = useState('');
  // const [showEventsSection, setShowEventsSection] = useState(true); // Removed

  const handleChange = (field: keyof Person, value: any) => {
    onUpdate(person.id, { [field]: value });
  };

  const handleGenerateBio = async () => {
    setIsGenerating(true);
    try {
      const bio = await generateBiography(person, people, bioTone);
      handleChange('bio', bio);
    } catch (e) {
      showError("Failed to generate bio. Check API Key.");
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
      showSuccess("Source added successfully!");
    }
  };

  const handleUpdateSource = (id: string, field: string, value: string) => {
    const updatedSources = (person.sources || []).map(source =>
      source.id === id ? { ...source, [field]: value } : source
    );
    onUpdate(person.id, { sources: updatedSources });
  };

  const handleRemoveSource = (id: string) => {
    const filteredSources = (person.sources || []).filter(source => source.id !== id);
    onUpdate(person.id, { sources: filteredSources });
    showSuccess("Source removed successfully!");
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
      showSuccess("Event added successfully!");
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
    showSuccess("Event removed successfully!");
  };

  return (
    <div className="space-y-4">
        {/* --- WORK & INTERESTS --- */}
        <Card title={t.workInterests}>
            {(!hasWorkInterests && !isEditing) ? (
                <div className="text-center py-4 text-stone-400 dark:text-stone-500 bg-stone-50 dark:bg-stone-800/50 rounded-xl border border-dashed border-stone-200 dark:border-stone-700 flex flex-col items-center">
                    <Info className="w-8 h-8 mb-2 opacity-50" />
                    <span className="text-sm">{t.noWorkInterests || 'No work or interests information available.'}</span>
                </div>
            ) : (
                <>
                    <FormField
                        label={t.profession}
                        value={person.profession}
                        onCommit={(v) => handleChange('profession', v)}
                        disabled={!isEditing}
                        labelWidthClass="w-24"
                    />

                    <FormField
                        label={t.company}
                        value={person.company}
                        onCommit={(v) => handleChange('company', v)}
                        disabled={!isEditing}
                        labelWidthClass="w-24"
                    />

                    <FormField
                        label={t.interests}
                        value={person.interests}
                        onCommit={(v) => handleChange('interests', v)}
                        disabled={!isEditing}
                        placeholder={isEditing ? "e.g. Golf, Cooking" : ""}
                        labelWidthClass="w-24"
                    />
                </>
            )}
        </Card>

        {/* --- BIOGRAPHY --- */}
        <Card title={t.biography}>
            <div className="flex justify-between items-center relative z-10 mb-3">
                {isEditing && (
                    <div className="flex items-center gap-2 ms-auto">
                        <span className="text-[9px] text-stone-500">{t.tone}:</span>
                        <select 
                            value={bioTone}
                            onChange={(e) => setBioTone(e.target.value)}
                            className="text-[8px] border border-stone-200 dark:border-stone-600 rounded-lg px-2 py-0.5 bg-stone-50 dark:bg-stone-700 outline-none focus:border-purple-300 text-stone-600 dark:text-stone-200 h-6"
                        >
                            <option value="Standard">Standard</option>
                            <option value="Formal">Formal</option>
                            <option value="Storyteller">Storyteller</option>
                            <option value="Humorous">Humorous</option>
                            <option value="Journalistic">Journalistic</option>
                        </select>
                        <button
                            onClick={handleGenerateBio}
                            disabled={isGenerating}
                            className="text-[8px] text-purple-600 dark:text-purple-300 hover:text-purple-700 flex items-center gap-1 bg-purple-50 dark:bg-purple-900/30 px-1.5 py-0.5 rounded-full border border-purple-100 dark:border-purple-800 transition-colors font-bold"
                        >
                            {isGenerating ? <Loader2 className="w-2.5 h-2.5 animate-spin"/> : <Sparkles className="w-2.5 h-2.5" />}
                            {isGenerating ? '...' : t.generate}
                        </button>
                    </div>
                )}
            </div>
            {isEditing ? (
                <SmartTextarea
                    disabled={!isEditing}
                    rows={8}
                    value={person.bio}
                    onCommit={(v) => handleChange('bio', v)}
                    className="w-full px-2.5 py-1.5 border border-stone-300 dark:border-stone-600 rounded-lg text-xs outline-none focus:border-teal-500 transition-colors bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 disabled:bg-transparent disabled:border-transparent disabled:px-0 disabled:cursor-default disabled:font-medium disabled:text-stone-800 dark:disabled:text-stone-200"
                    placeholder={isEditing ? t.writeBio : t.noBio}
                />
            ) : (
                <div className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
                    {person.bio || <p className="text-stone-400 italic">{t.noBio}</p>}
                </div>
            )}
        </Card>

        {/* --- SOURCES SECTION --- */}
        <Card title={t.sourcesTab}>
            {isEditing && (
                <div className="mb-4 p-3 bg-stone-50 dark:bg-stone-900/50 rounded-xl border border-dashed border-stone-200 dark:border-stone-700 space-y-2">
                    <FormField
                        label={t.sourceTitle}
                        value={newSourceTitle}
                        onCommit={setNewSourceTitle}
                        placeholder={t.sourceTitlePlaceholder}
                        className="!h-7 !text-xs"
                        labelWidthClass="w-20"
                    />
                    <FormField
                        label={t.sourceUrl}
                        value={newSourceUrl}
                        onCommit={setNewSourceUrl}
                        placeholder="https://example.com"
                        type="url"
                        className="!h-7 !text-xs"
                        labelWidthClass="w-20"
                    />
                    <FormField
                        label={t.sourceDate}
                        value={newSourceDate}
                        onCommit={setNewSourceDate}
                        placeholder="YYYY-MM-DD"
                        className="!h-7 !text-xs"
                        labelWidthClass="w-20"
                    />
                    <FormField
                        label={t.sourceType}
                        value={newSourceType}
                        onCommit={setNewSourceType}
                        placeholder={t.sourceTypePlaceholder}
                        className="!h-7 !text-xs"
                        labelWidthClass="w-20"
                    />
                    <button
                        onClick={handleAddSource}
                        disabled={!newSourceTitle.trim()}
                        className="w-full py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-stone-300 dark:disabled:bg-stone-700 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all mt-3"
                    >
                        <Plus className="w-4 h-4" /> {t.addSource}
                    </button>
                </div>
            )}

            {!hasSources && !isEditing ? (
                <div className="text-center py-4 text-stone-400 dark:text-stone-500 bg-stone-50 dark:bg-stone-800/50 rounded-xl border border-dashed border-stone-200 dark:border-stone-700 flex flex-col items-center">
                    <BookOpen className="w-8 h-8 mb-2 opacity-50" />
                    <span className="text-sm">{t.noSources}</span>
                </div>
            ) : (
                <div className="space-y-3">
                    {(person.sources || []).map((source, index) => (
                        <div key={source.id} className="p-3 bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-700 rounded-xl shadow-sm group">
                            {isEditing ? (
                                <div className="space-y-1.5">
                                    <FormField
                                        label={t.sourceTitle}
                                        value={source.title}
                                        onCommit={(v) => handleUpdateSource(source.id, 'title', v)}
                                        disabled={!isEditing}
                                        className="!h-7 !text-xs"
                                        labelWidthClass="w-20"
                                    />
                                    <FormField
                                        label={t.sourceUrl}
                                        value={source.url || ''}
                                        onCommit={(v) => handleUpdateSource(source.id, 'url', v)}
                                        disabled={!isEditing}
                                        type="url"
                                        className="!h-7 !text-xs"
                                        labelWidthClass="w-20"
                                    />
                                    <FormField
                                        label={t.sourceDate}
                                        value={source.date || ''}
                                        onCommit={(v) => handleUpdateSource(source.id, 'date', v)}
                                        disabled={!isEditing}
                                        className="!h-7 !text-xs"
                                        labelWidthClass="w-20"
                                    />
                                    <FormField
                                        label={t.sourceType}
                                        value={source.type || ''}
                                        onCommit={(v) => handleUpdateSource(source.id, 'type', v)}
                                        disabled={!isEditing}
                                        className="!h-7 !text-xs"
                                        labelWidthClass="w-20"
                                    />
                                    <button
                                        onClick={() => handleRemoveSource(source.id)}
                                        className="w-full py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2 mt-2"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" /> {t.removeSource}
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    <h4 className="font-bold text-sm text-stone-800 dark:text-stone-200 flex items-center gap-2">
                                        <BookOpen className="w-4 h-4 text-teal-500" /> {source.title}
                                    </h4>
                                    {source.url && (
                                        <a href={source.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline">
                                            <Link className="w-3 h-3" /> {source.url}
                                        </a>
                                    )}
                                    <div className="flex items-center gap-3 text-xs text-stone-500 dark:text-stone-400">
                                        {source.date && (
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" /> {source.date}
                                            </span>
                                        )}
                                        {source.type && (
                                            <span className="flex items-center gap-1">
                                                <Tag className="w-3 h-3" /> {source.type}
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
                    {(person.events || []).map((event, index) => (
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
    </div>
  );
});