import React from 'react';

interface ManuscriptExportSummaryProps {
  language: 'ar' | 'en';
  rootPersonName: string;
  generationsDepth: number | 'all';
  manuscriptScopePersonCount: number;
  manuscriptOrderingLabel: string;
  includedManuscriptSections: string;
  previewStatus: 'idle' | 'generating' | 'ready' | 'stale';
  citationCoverage?: number;
}

export const ManuscriptExportSummary: React.FC<ManuscriptExportSummaryProps> = ({
  language,
  rootPersonName,
  generationsDepth,
  manuscriptScopePersonCount,
  manuscriptOrderingLabel,
  includedManuscriptSections,
  previewStatus,
  citationCoverage,
}) => {
  const isAr = language === 'ar';

  const depthLabel = generationsDepth === 'all'
    ? (isAr ? 'كل الفرع' : 'All branch')
    : (isAr ? `${generationsDepth} أجيال` : `${generationsDepth} generations`);

  const previewStatusText = {
    idle: isAr ? 'المعاينة غير منشأة بعد' : 'Preview not generated',
    generating: isAr ? 'جاري إنشاء المعاينة...' : 'Generating preview...',
    ready: isAr ? 'المعاينة جاهزة' : 'Preview ready',
    stale: isAr ? 'المعاينة قديمة - ينصح بالتحديث' : 'Preview stale - refresh recommended',
  }[previewStatus];

  const citationText = citationCoverage !== undefined
    ? `${isAr ? 'نسبة توثيق المصادر:' : 'Citation coverage:'} ${citationCoverage}%`
    : (isAr ? 'نسبة توثيق المصادر: لم يتم حسابها' : 'Citation coverage: Not calculated');

  const isLowCitation = citationCoverage !== undefined && citationCoverage < 40;

  return (
    <div
      className="mt-3 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-3 text-[11px] leading-relaxed text-[var(--text-muted)]"
      data-testid="manuscript-export-summary"
    >
      <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
        <div>
          <span className="font-bold text-[var(--text-secondary)]">
            {isAr ? 'جذر المخطوط:' : 'Root person:'}
          </span>{' '}
          {rootPersonName || (isAr ? 'غير محدد' : 'Not selected')}
        </div>
        <div>
          <span className="font-bold text-[var(--text-secondary)]">
            {isAr ? 'العمق:' : 'Depth:'}
          </span>{' '}
          {depthLabel}
        </div>
        <div>
          <span className="font-bold text-[var(--text-secondary)]">
            {isAr ? 'الأشخاص في النطاق:' : 'Estimated people count:'}
          </span>{' '}
          {manuscriptScopePersonCount}
        </div>
        <div>
          <span className="font-bold text-[var(--text-secondary)]">
            {isAr ? 'الترتيب:' : 'Ordering strategy:'}
          </span>{' '}
          {manuscriptOrderingLabel}
        </div>
      </div>
      <div className="mt-2 border-t border-[var(--border-soft)]/60 pt-2">
        <span className="font-bold text-[var(--text-secondary)]">
          {isAr ? 'المحتوى المضمن:' : 'Included content:'}
        </span>{' '}
        {includedManuscriptSections}
      </div>
      <div className="mt-2 flex flex-col gap-1 border-t border-[var(--border-soft)]/60 pt-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1.5" data-testid="manuscript-preview-status-indicator">
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${
            previewStatus === 'generating' ? 'animate-pulse bg-blue-500' :
            previewStatus === 'ready' ? 'bg-emerald-500' :
            previewStatus === 'stale' ? 'bg-amber-500' : 'bg-gray-400'
          }`} />
          <span className="font-semibold text-[var(--text-secondary)]">{previewStatusText}</span>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className="font-medium text-[var(--text-secondary)]" data-testid="manuscript-citation-coverage-indicator">
            {citationText}
          </span>
          {isLowCitation && (
            <span className="text-[10px] font-medium text-amber-600 dark:text-amber-500" data-testid="manuscript-low-citation-warning">
              {isAr
                ? 'نسبة توثيق المصادر منخفضة. ينصح بإضافة استشهادات جديدة.'
                : 'Low citation coverage. Consider adding more source references.'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
