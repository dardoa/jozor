import React from 'react';
import type { VisualOutputDefinition } from '../../../publishing';

interface VisualOutputConfigPanelProps {
  language: 'ar' | 'en';
  selectedDefinition?: VisualOutputDefinition;
}

export const VisualOutputConfigPanel: React.FC<VisualOutputConfigPanelProps> = ({
  language,
  selectedDefinition,
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
      className="flex flex-col gap-3 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel)] p-4 text-start"
      data-testid="visual-studio-config-panel"
    >
      <h5 className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)] border-b border-[var(--border-soft)]/60 pb-2 mb-1">
        {isAr ? 'إعدادات النشر النشطة' : 'Active Publishing Specs'}
      </h5>
      <div className="space-y-3">
        {sections.map((section, idx) => (
          <div key={idx} className="flex flex-col gap-0.5 rounded-lg bg-[var(--surface-subtle)] px-3 py-2 border border-[var(--border-soft)]/40">
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
              {section.title}
            </span>
            <span className="text-xs font-semibold text-[var(--text-secondary)] select-none">
              {section.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
