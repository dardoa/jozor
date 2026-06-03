import React, { type MouseEvent } from 'react';
import DOMPurify, { type Config as DOMPurifyConfig } from 'dompurify';
import { Info, Loader2, Sparkles } from 'lucide-react';

import type { Person } from '../../../../types';
import type { TranslationSchema } from '../../../../utils/translationLoader';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { SmartTextarea } from '../../../../components/ui/SmartInput';
import { BioAccordionSection } from './BioAccordionSection';
import type { BioEditableField } from './usePersonBio';

interface BioBiographySectionProps {
  person: Person;
  isEditing: boolean;
  isOpen: boolean;
  hasBio: boolean;
  bioTone: string;
  isGenerating: boolean;
  t: TranslationSchema;
  onToggle: () => void;
  onToneChange: (tone: string) => void;
  onGenerate: (event: MouseEvent) => void;
  onChange: (field: BioEditableField, value: string | number) => void;
}

const BIO_TONES = ['standard', 'formal', 'storyteller', 'humorous', 'journalistic'] as const;
const BIO_SANITIZE_OPTIONS = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'ul', 'ol', 'li', 'blockquote'],
  ALLOWED_ATTR: [],
} satisfies DOMPurifyConfig;

const sanitizeBioHtml = (bio: string): string => String(DOMPurify.sanitize(bio, BIO_SANITIZE_OPTIONS));

export const BioBiographySection: React.FC<BioBiographySectionProps> = ({
  person,
  isEditing,
  isOpen,
  hasBio,
  bioTone,
  isGenerating,
  t,
  onToggle,
  onToneChange,
  onGenerate,
  onChange,
}) => (
  <BioAccordionSection
    title={t.biography}
    icon={<Sparkles />}
    isOpen={isOpen}
    onToggle={onToggle}
    hasContent={hasBio}
    isEditing={isEditing}
  >
    <div className="pt-4 space-y-4">
      {isEditing && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[var(--surface-subtle)] rounded-xl border border-[var(--border-soft)]">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider">{t.tone}:</span>
            <div className="flex items-center gap-1 p-0.5 bg-[var(--surface-panel)] rounded-full border border-[var(--border-soft)]">
              {BIO_TONES.map((toneKey) => (
                <button
                  key={toneKey}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onToneChange(toneKey);
                  }}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                    bioTone === toneKey
                      ? 'bg-[var(--primary-600)] text-[var(--primary-text)] shadow-sm'
                      : 'text-[var(--text-dim)] hover:text-[var(--text-main)]'
                  }`}
                >
                  {t.tones[toneKey]}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="h-8 px-4 bg-[var(--primary-600)] hover:bg-[var(--primary-700)] text-[var(--primary-text)] rounded-full text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-[var(--primary-600)]/20 disabled:opacity-50"
          >
            {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            {isGenerating ? t.loading : t.generate}
          </button>
        </div>
      )}

      {isEditing ? (
        <SmartTextarea
          disabled={!isEditing}
          rows={8}
          value={person.bio || ''}
          onCommit={(value: string | number) => onChange('bio', value)}
          className="ds-input w-full px-4 py-3 text-xs"
          placeholder={t.writeBio}
        />
      ) : (
        <div className="text-sm text-[var(--text-main)] leading-relaxed">
          {person.bio ? (
            <div className="space-y-4 article-content" dangerouslySetInnerHTML={{ __html: sanitizeBioHtml(person.bio) }} />
          ) : (
            <EmptyState
              icon={<Info className="w-8 h-8" />}
              title={t.noBio}
            />
          )}
        </div>
      )}
    </div>
  </BioAccordionSection>
);
