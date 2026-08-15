import React from 'react';

interface VisualOutputReadinessNoticeProps {
  language: 'ar' | 'en';
  status?: 'supported' | 'unsupported';
  reason?: string;
}

export const VisualOutputReadinessNotice: React.FC<VisualOutputReadinessNoticeProps> = ({
  language,
  status = 'supported',
  reason,
}) => {
  const isAr = language === 'ar';

  if (status === 'unsupported') {
    return (
      <div
        className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs leading-relaxed text-amber-300 font-medium"
        data-testid="visual-studio-unsupported-notice"
      >
        {reason || (isAr ? 'عذراً، هذا التخطيط غير مدعوم حالياً في الاستوديو.' : 'Selected layout combination is not currently supported by the Studio runtime.')}
      </div>
    );
  }

  return null;
};
