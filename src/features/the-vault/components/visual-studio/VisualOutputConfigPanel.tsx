import React from 'react';
import type { VisualOutputDefinition, VisualPreviewModel } from '../../../publishing';

interface VisualOutputConfigPanelProps {
  language: 'ar' | 'en';
  definitions?: VisualOutputDefinition[];
  selectedDefinitionId?: string;
  selectedDefinition?: VisualOutputDefinition;
  onSelectDefinition?: (id: string) => void;
  previewModel?: VisualPreviewModel;
}

export const VisualOutputConfigPanel: React.FC<VisualOutputConfigPanelProps> = ({
  language,
  definitions = [],
  selectedDefinitionId,
  selectedDefinition,
  onSelectDefinition,
  previewModel,
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

  // Preview Telemetry Stats
  const previewTelemetry = previewModel
    ? [
        {
          title: isAr ? 'وضع المعاينة' : 'Preview Mode',
          value: previewModel.mode,
        },
        {
          title: isAr ? 'مستوى الخصوصية' : 'Privacy Level',
          value: previewModel.privacyMode,
        },
        {
          title: isAr ? 'العقد المعروضة' : 'Rendered Nodes',
          value: previewModel.nodes.length,
        },
        {
          title: isAr ? 'الروابط النشطة' : 'Active Connections',
          value: previewModel.edges.length,
        },
        {
          title: isAr ? 'حالة الاقتصاص' : 'Truncation Status',
          value: previewModel.metadata.truncated ? (isAr ? 'نعم' : 'Yes') : (isAr ? 'لا' : 'No'),
        },
      ]
    : [];

  return (
    <div
      className="flex flex-col gap-4 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel)] p-4 text-start"
      data-testid="visual-studio-config-panel"
    >
      {/* Template Selectors */}
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

      {/* Active Specifications */}
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

      {/* Preview Telemetry Specifications */}
      {previewModel && (
        <div className="flex flex-col gap-2" data-testid="visual-studio-telemetry-panel">
          <h5 className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)] border-b border-[var(--border-soft)]/60 pb-1.5">
            {isAr ? 'إحصاءات المعاينة' : 'Preview Telemetry'}
          </h5>
          <div className="space-y-2">
            {previewTelemetry.map((telemetry, idx) => (
              <div key={idx} className="flex flex-col gap-0.5 rounded-lg bg-[var(--surface-subtle)] px-3 py-1.5 border border-[var(--border-soft)]/40">
                <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  {telemetry.title}
                </span>
                <span className="text-xs font-semibold text-[var(--text-secondary)] select-none">
                  {telemetry.value}
                </span>
              </div>
            ))}
          </div>

          {/* Warnings list rendering */}
          {previewModel.warnings.length > 0 && (
            <div className="mt-1 space-y-1.5" data-testid="visual-studio-telemetry-warnings">
              {previewModel.warnings.map((warning, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 px-3 py-1.5 text-[10px] leading-normal text-indigo-700 dark:text-indigo-300 font-medium"
                >
                  {warning}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
