import React from 'react';

interface VisualOutputReadinessNoticeProps {
  language: 'ar' | 'en';
  status?: 'supported' | 'unsupported';
  reason?: string;
}

const AR_REVIEW_NOTICE =
  '\u0646\u0632\u0651\u0644 \u0627\u0644\u0628\u0648\u0633\u062a\u0631 \u0628\u0635\u064a\u063a SVG \u0648PNG \u0648PDF \u0645\u0646 \u0634\u0631\u064a\u0637 \u0627\u0644\u0637\u0628\u0627\u0639\u0629. \u0648\u0644\u062d\u0641\u0638 \u0634\u0643\u0644 \u0645\u0633\u0627\u062d\u0629 \u0627\u0644\u0634\u062c\u0631\u0629 \u0643\u0645\u0627 \u062a\u0638\u0647\u0631 \u0627\u0644\u0622\u0646\u060c \u0627\u0633\u062a\u062e\u062f\u0645 \u0644\u0642\u0637\u0629 \u0627\u0644\u0634\u062c\u0631\u0629 \u0623\u0633\u0641\u0644 \u0627\u0644\u0627\u0633\u062a\u0648\u062f\u064a\u0648.';

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

  return (
    <div
      className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-4 py-3 text-xs leading-relaxed text-indigo-700 dark:text-indigo-300"
      data-testid="visual-studio-readiness-notice"
    >
      {isAr
        ? AR_REVIEW_NOTICE
        : 'Download the poster as SVG, PNG, or PDF from the print bar. To capture the tree exactly as it appears in the workspace, use Current Tree Snapshot below.'}
    </div>
  );
};
