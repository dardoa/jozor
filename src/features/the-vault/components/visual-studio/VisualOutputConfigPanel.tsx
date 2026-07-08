import React from 'react';

interface VisualOutputConfigPanelProps {
  language: 'ar' | 'en';
}

export const VisualOutputConfigPanel: React.FC<VisualOutputConfigPanelProps> = ({ language }) => {
  const isAr = language === 'ar';

  const sections = [
    {
      title: isAr ? 'المنتج' : 'Product',
      value: isAr ? 'بوستر الأسلاف' : 'Ancestor Poster',
    },
    {
      title: isAr ? 'القالب' : 'Template',
      value: isAr ? 'كلاسيكي دافئ' : 'Classic Warm',
    },
    {
      title: isAr ? 'التخطيط' : 'Layout',
      value: isAr ? 'تلقائي (أفقي)' : 'Auto (Landscape)',
    },
    {
      title: isAr ? 'النطاق' : 'Scope',
      value: isAr ? '4 أجيال' : '4 Generations',
    },
    {
      title: isAr ? 'المحتوى' : 'Content',
      value: isAr ? 'التواريخ الكاملة، الصور الشخصية' : 'Full dates, Profile photos',
    },
  ];

  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel)] p-4 text-start"
      data-testid="visual-studio-config-panel"
    >
      <h5 className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)] border-b border-[var(--border-soft)]/60 pb-2 mb-1">
        {isAr ? 'إعدادات النشر المبدئية' : 'Publishing Configuration'}
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
