import React, { useState, memo } from 'react';
import { Person } from '../../types';
import { Card } from '../ui/Card';
import { FormField } from '../ui/FormField';
import { Plus, BookOpen, Link, Calendar, Tag, Trash2, Info } from 'lucide-react';
import { useTranslation } from '../../context/TranslationContext';

interface SourcesTabProps {
  person: Person;
  isEditing: boolean;
  onUpdate: (id: string, updates: Partial<Person>) => void;
}

export const SourcesTab: React.FC<SourcesTabProps> = memo(({ person, isEditing, onUpdate }) => {
  const { t } = useTranslation();
  const [newSourceTitle, setNewSourceTitle] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [newSourceDate, setNewSourceDate] = useState('');
  const [newSourceType, setNewSourceType] = useState('');

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
  };

  const hasSources = person.sources && person.sources.length > 0;

  return (
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
          {(person.sources || []).map((source, idx) => (
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
  );
});