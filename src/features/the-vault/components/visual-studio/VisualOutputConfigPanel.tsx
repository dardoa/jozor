import React from 'react';
import type { VisualOutputDefinition } from '../../../publishing';

interface VisualOutputConfigPanelProps {
  language: 'ar' | 'en';
  definitions?: VisualOutputDefinition[];
  selectedDefinitionId?: string;
  selectedDefinition?: VisualOutputDefinition;
  onSelectDefinition?: (id: string) => void;
}

export const VisualOutputConfigPanel: React.FC<VisualOutputConfigPanelProps> = ({
  language,
  definitions = [],
  selectedDefinitionId,
  selectedDefinition,
  onSelectDefinition,
}) => {
  const isAr = language === 'ar';

  const productType = selectedDefinition?.productType || '';
  const layoutEngine = selectedDefinition?.layoutEngine || '';
  const readingStrategy = selectedDefinition?.readingStrategy || '';
  const supportedSizes = selectedDefinition?.capabilities.sizes.join(', ') || '';
  const supportedScopes = selectedDefinition?.capabilities.scopes.join(', ') || '';
  const templateId = selectedDefinition?.templateId || '';

  const sections = [
    {
      title: isAr ? 'نوع المنتج' : 'Product Type',
      value: productType,
    },
    {
      title: isAr ? 'القالب المعرف' : 'Template ID',
      value: templateId,
    },
    {
      title: isAr ? 'محرك التخطيط' : 'Layout Engine',
      value: layoutEngine,
    },
    {
      title: isAr ? 'استراتيجية القراءة' : 'Reading Strategy',
      value: readingStrategy,
    },
    {
      title: isAr ? 'الأحجام المدعومة' : 'Supported Sizes',
      value: supportedSizes,
    },
    {
      title: isAr ? 'النطاق المتاح' : 'Supported Scopes',
      value: supportedScopes,
    },
  ];

  return (
    <div
      className="flex flex-col gap-4 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel)] p-4 text-start"
      data-testid="visual-studio-config-panel"
    >
      <div className="flex flex-col gap-2">
        <h5 className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)] border-b border-[var(--border-soft)]/60 pb-1.5">
          {isAr ? 'اختر القالب' : 'Select Template'}
        </h5>
        <div className="flex flex-col gap-1.5" data-testid="visual-studio-template-selectors">
          {definitions.map((def) => {
            const isSelected = def.id === selectedDefinitionId;
            return (
              <button
                key={def.id}
                type="button"
                onClick={() => onSelectDefinition?.(def.id)}
                className={`w-full text-start px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  isSelected
                    ? 'border-[var(--primary-500)] bg-[var(--primary-500)]/5 text-[var(--primary-600)] shadow-sm'
                    : 'border-[var(--border-soft)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-soft)]/80'
                }`}
              >
                {def.displayName[language]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h5 className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)] border-b border-[var(--border-soft)]/60 pb-1.5">
          {isAr ? 'إعدادات النشر النشطة' : 'Active Publishing Specs'}
        </h5>
        <div className="space-y-2">
          {sections.map((section, idx) => (
            <div key={idx} className="flex flex-col gap-0.5 rounded-lg bg-[var(--surface-subtle)] px-3 py-1.5 border border-[var(--border-soft)]/40">
              <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                {section.title}
              </span>
              <span className="text-xs font-semibold text-[var(--text-secondary)] select-none">
                {section.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
