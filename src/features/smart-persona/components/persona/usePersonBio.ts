import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react';

import type { Person } from '../../../../types';
import { sanitizeExternalUrl } from '../../../../utils/safeUrl';
import { showToast } from '../../../../utils/showToast';
import type { TranslationSchema } from '../../../../utils/translationLoader';

export type BioEditableField = 'profession' | 'company' | 'interests' | 'bio';
export type PersonSource = Person['sources'][number];
export type PersonEvent = Person['events'][number];
export type PersonSourceField = Exclude<keyof PersonSource, 'id'>;
export type PersonEventField = Exclude<keyof PersonEvent, 'id'>;

interface UsePersonBioArgs {
  person: Person;
  people: Record<string, Person>;
  isEditing: boolean;
  onUpdate: (id: string, updates: Partial<Person>) => void;
  t: TranslationSchema;
}

export const usePersonBio = ({ person, people, isEditing, onUpdate, t }: UsePersonBioArgs) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [bioTone, setBioTone] = useState('standard');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    bio: false,
    sources: false,
    events: false,
    work: true,
  });

  const [newSourceTitle, setNewSourceTitle] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [newSourceDate, setNewSourceDate] = useState('');
  const [newSourceType, setNewSourceType] = useState('');

  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventPlace, setNewEventPlace] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');
  const [newEventType, setNewEventType] = useState('');

  const hasWorkInterests = Boolean(person.profession || person.company || person.interests);
  const hasBio = Boolean(person.bio);
  const hasSources = Boolean(person.sources?.length);
  const hasEvents = Boolean(person.events?.length);

  useEffect(() => {
    setExpandedSections({
      work: true,
      bio: hasBio || isEditing,
      sources: hasSources || isEditing,
      events: hasEvents || isEditing,
    });
  }, [person.id, isEditing, hasBio, hasSources, hasEvents]);

  const groupedLifeEvents = useMemo(() => {
    const sortedEvents = [...(person.events || [])].sort((left, right) => left.date.localeCompare(right.date));
    const groups = new Map<string, typeof sortedEvents>();

    sortedEvents.forEach((event) => {
      const year = event.date?.slice(0, 4) || t.unknownDate;
      const current = groups.get(year) || [];
      current.push(event);
      groups.set(year, current);
    });

    return Array.from(groups.entries()).map(([year, events]) => ({ year, events }));
  }, [person.events, t.unknownDate]);

  const toggleSection = useCallback((section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const updateEditableField = useCallback((field: BioEditableField, value: string | number) => {
    const stringValue = typeof value === 'number' ? String(value) : value;
    if (field === 'profession') onUpdate(person.id, { profession: stringValue });
    if (field === 'company') onUpdate(person.id, { company: stringValue });
    if (field === 'interests') onUpdate(person.id, { interests: stringValue });
    if (field === 'bio') onUpdate(person.id, { bio: stringValue });
  }, [onUpdate, person.id]);

  const handleGenerateBio = useCallback(async (event: MouseEvent) => {
    event.stopPropagation();
    setIsGenerating(true);
    try {
      const toneLabel = t.tones[bioTone as keyof typeof t.tones];
      const { generateBiography } = await import('../../../../services/geminiService');
      const bio = await generateBiography(person, people, toneLabel);
      updateEditableField('bio', bio);
    } catch {
      showToast.error('messages.error.bio');
    } finally {
      setIsGenerating(false);
    }
  }, [bioTone, people, person, t, updateEditableField]);

  const addSource = useCallback(() => {
    if (!newSourceTitle.trim()) return;
    const newSource: PersonSource = {
      id: crypto.randomUUID(),
      title: newSourceTitle.trim(),
      url: sanitizeExternalUrl(newSourceUrl),
      date: newSourceDate.trim() || undefined,
      type: newSourceType.trim() || undefined,
    };
    onUpdate(person.id, { sources: [...(person.sources || []), newSource] });
    setNewSourceTitle('');
    setNewSourceUrl('');
    setNewSourceDate('');
    setNewSourceType('');
    showToast.success('messages.success.sourceAdded');
  }, [newSourceDate, newSourceTitle, newSourceType, newSourceUrl, onUpdate, person.id, person.sources]);

  const updateSource = useCallback((id: string, field: PersonSourceField, value: string | number) => {
    const nextValue = field === 'url'
      ? sanitizeExternalUrl(String(value))
      : typeof value === 'number' ? String(value) : value;
    const updatedSources = (person.sources || []).map((source) =>
      source.id === id ? { ...source, [field]: nextValue } : source
    );
    onUpdate(person.id, { sources: updatedSources });
  }, [onUpdate, person.id, person.sources]);

  const removeSource = useCallback((id: string) => {
    onUpdate(person.id, { sources: (person.sources || []).filter((source) => source.id !== id) });
    showToast.success('messages.success.sourceRemoved');
  }, [onUpdate, person.id, person.sources]);

  const addEvent = useCallback(() => {
    if (!newEventTitle.trim() || !newEventDate.trim()) return;
    const newEvent: PersonEvent = {
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
    showToast.success('messages.success.eventAdded');
  }, [newEventDate, newEventDescription, newEventPlace, newEventTitle, newEventType, onUpdate, person.events, person.id]);

  const updateEvent = useCallback((id: string, field: PersonEventField, value: string | number) => {
    const updatedEvents = (person.events || []).map((event) =>
      event.id === id ? { ...event, [field]: typeof value === 'number' ? String(value) : value } : event
    );
    onUpdate(person.id, { events: updatedEvents });
  }, [onUpdate, person.events, person.id]);

  const removeEvent = useCallback((id: string) => {
    onUpdate(person.id, { events: (person.events || []).filter((event) => event.id !== id) });
    showToast.success('messages.success.eventRemoved');
  }, [onUpdate, person.events, person.id]);

  return {
    bioTone,
    setBioTone,
    isGenerating,
    expandedSections,
    hasWorkInterests,
    hasBio,
    hasSources,
    hasEvents,
    groupedLifeEvents,
    toggleSection,
    updateEditableField,
    handleGenerateBio,
    sourceDraft: {
      title: newSourceTitle,
      url: newSourceUrl,
      date: newSourceDate,
      type: newSourceType,
      setTitle: setNewSourceTitle,
      setUrl: setNewSourceUrl,
      setDate: setNewSourceDate,
      setType: setNewSourceType,
    },
    eventDraft: {
      title: newEventTitle,
      date: newEventDate,
      place: newEventPlace,
      description: newEventDescription,
      type: newEventType,
      setTitle: setNewEventTitle,
      setDate: setNewEventDate,
      setPlace: setNewEventPlace,
      setDescription: setNewEventDescription,
      setType: setNewEventType,
    },
    addSource,
    updateSource,
    removeSource,
    addEvent,
    updateEvent,
    removeEvent,
  };
};
