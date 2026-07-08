import React from 'react';

interface VisualOutputReadinessNoticeProps {
  language: 'ar' | 'en';
}

export const VisualOutputReadinessNotice: React.FC<VisualOutputReadinessNoticeProps> = ({ language }) => {
  const isAr = language === 'ar';

  return (
    <div
      className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-4 py-3 text-xs leading-relaxed text-indigo-700 dark:text-indigo-300"
      data-testid="visual-studio-readiness-notice"
    >
      {isAr
        ? 'معاينة هيكل الاستوديو. التصديرات الحالية ما زالت متاحة أدناه.'
        : 'Studio shell preview. Current exports remain available below.'}
    </div>
  );
};
