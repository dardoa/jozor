import React from 'react';
import { BookOpen, Calendar, Link, Plus, Tag, Trash2 } from 'lucide-react';

import { EMPTY_STRING } from '../../../../constants';
import type { Person } from '../../../../types';
import { getSafeExternalUrl } from '../../../../utils/safeUrl';
import type { TranslationSchema } from '../../../../utils/translationLoader';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { FormField } from '../../../../components/ui/FormField';
import { BioAccordionSection } from './BioAccordionSection';
import type { PersonSourceField } from './usePersonBio';

interface SourceDraft {
  title: string;
  url: string;
  date: string;
  type: string;
  setTitle: (value: string) => void;
  setUrl: (value: string) => void;
  setDate: (value: string) => void;
  setType: (value: string) => void;
}

interface BioSourcesSectionProps {
  person: Person;
  isEditing: boolean;
  isOpen: boolean;
  hasSources: boolean;
  t: TranslationSchema;
  draft: SourceDraft;
  onToggle: () => void;
  onAdd: () => void;
  onUpdate: (id: string, field: PersonSourceField, value: string | number) => void;
  onRemove: (id: string) => void;
  focusTarget?: boolean;
}

export const BioSourcesSection: React.FC<BioSourcesSectionProps> = ({
  person,
  isEditing,
  isOpen,
  hasSources,
  t,
  draft,
  onToggle,
  onAdd,
  onUpdate,
  onRemove,
  focusTarget = false,
}) => (
  <BioAccordionSection
    title={`${t.sourcesTab}${person.sources?.length ? ` (${person.sources.length})` : ''}`}
    icon={<BookOpen />}
    isOpen={isEditing || isOpen}
    onToggle={onToggle}
    hasContent={hasSources}
    isEditing={isEditing}
    focusTarget={!isEditing && focusTarget ? 'sources' : undefined}
  >
    <div className="space-y-4">
      {isEditing && (
        <div className="ds-empty-state p-4 space-y-3">
          <FormField label={t.sourceTitle} value={draft.title} onCommit={(value: string | number) => draft.setTitle(String(value))} placeholder={t.sourceTitlePlaceholder} className="!h-8 !text-xs" labelWidthClass="w-20" focusTarget={focusTarget ? 'sources' : undefined} />
          <FormField label={t.sourceUrl} value={draft.url} onCommit={(value: string | number) => draft.setUrl(String(value))} placeholder="https://..." type="url" className="!h-8 !text-xs" labelWidthClass="w-20" />
          <FormField label={t.sourceDate} value={draft.date} onCommit={(value: string | number) => draft.setDate(String(value))} placeholder="YYYY-MM-DD" className="!h-8 !text-xs" labelWidthClass="w-20" />
          <FormField label={t.sourceType} value={draft.type} onCommit={(value: string | number) => draft.setType(String(value))} placeholder={t.sourceTypePlaceholder} className="!h-8 !text-xs" labelWidthClass="w-20" />
          <button
            onClick={onAdd}
            disabled={!draft.title.trim()}
            className="w-full py-2.5 bg-[var(--primary-600)] hover:bg-[var(--primary-700)] disabled:bg-[var(--border-main)] text-[var(--primary-text)] rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all mt-2 shadow-lg shadow-[var(--primary-600)]/20"
          >
            <Plus className="w-4 h-4" /> {t.addSource}
          </button>
        </div>
      )}

      {!hasSources && !isEditing ? (
        <EmptyState
          icon={<BookOpen className="w-8 h-8" />}
          title={t.noSources}
        />
      ) : (
        <div className="grid gap-3">
          {(person.sources || []).map((source) => {
            const safeSourceUrl = getSafeExternalUrl(source.url);
            const hasUnsafeSourceUrl = Boolean(source.url && !safeSourceUrl);

            return (
              <div key={source.id} className="p-4 bg-[var(--surface-panel)] border border-[var(--border-soft)] rounded-2xl shadow-[var(--shadow-sm)] hover:border-[var(--primary-500)]/30 transition-all group">
                {isEditing ? (
                  <div className="space-y-2">
                    <FormField label={t.sourceTitle} value={source.title} onCommit={(value: string | number) => onUpdate(source.id, 'title', value)} className="!h-8 !text-xs" labelWidthClass="w-20" />
                    <FormField label={t.sourceUrl} value={source.url || EMPTY_STRING} onCommit={(value: string | number) => onUpdate(source.id, 'url', value)} type="url" className="!h-8 !text-xs" labelWidthClass="w-20" />
                    <FormField label={t.sourceDate} value={source.date || EMPTY_STRING} onCommit={(value: string | number) => onUpdate(source.id, 'date', value)} className="!h-8 !text-xs" labelWidthClass="w-20" />
                    <FormField label={t.sourceType} value={source.type || EMPTY_STRING} onCommit={(value: string | number) => onUpdate(source.id, 'type', value)} className="!h-8 !text-xs" labelWidthClass="w-20" />
                    <button onClick={() => onRemove(source.id)} className="flex items-center gap-2 text-[10px] font-bold text-red-500 hover:text-red-600 transition-colors pt-1 ms-auto">
                      <Trash2 className="w-3 h-3" /> {t.removeSource}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="font-bold text-sm text-[var(--text-main)] group-hover:text-[var(--primary-600)] transition-colors">{source.title}</h4>
                      {safeSourceUrl && (
                        <a href={safeSourceUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-[var(--primary-600)]/10 text-[var(--primary-600)] rounded-lg hover:bg-[var(--primary-600)] hover:text-white transition-all">
                          <Link className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-[var(--text-dim)]">
                      {source.date && <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3 text-[var(--primary-500)]" /> {source.date}</span>}
                      {source.type && <span className="flex items-center gap-1.5"><Tag className="w-3 h-3 text-[var(--primary-500)]" /> {source.type}</span>}
                      {hasUnsafeSourceUrl && <span>{t.unsafeSourceUrlHidden}</span>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  </BioAccordionSection>
);
