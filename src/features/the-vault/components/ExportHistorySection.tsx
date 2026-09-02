import React, { useEffect } from 'react';
import { AlertTriangle, Clock, History, RefreshCw, Trash2 } from 'lucide-react';

import { useAppStore } from '../../../store/useAppStore';
import type { TranslationSchema } from '../../../utils/translationLoader';
import { showToast } from '../../../utils/showToast';
import type { ExportHistoryEntry } from '../../publishing';

interface ExportHistorySectionProps {
  active: boolean;
  language: 'ar' | 'en';
  t: TranslationSchema;
  confirmClearHistory: boolean;
  setConfirmClearHistory: React.Dispatch<React.SetStateAction<boolean>>;
  isClearingHistory: boolean;
  setIsClearingHistory: React.Dispatch<React.SetStateAction<boolean>>;
  expandedHistoryId: number | string | null;
  setExpandedHistoryId: React.Dispatch<React.SetStateAction<number | string | null>>;
}

interface HistoryProductDisplay {
  productLabel: string;
  formatLabel: string;
  badgeLabel: string;
}

function classifyHistoryEntry(entry: ExportHistoryEntry, language: 'ar' | 'en'): HistoryProductDisplay {
  const templateId = entry.templateId;
  const format = entry.format || '';

  if (templateId === 'classic-book-manuscript') {
    return {
      productLabel: language === 'ar' ? 'كتاب العائلة' : 'Family Book',
      formatLabel: format === 'markdown' ? 'Markdown' : 'PDF',
      badgeLabel: language === 'ar' ? 'كتاب العائلة' : 'Family Book',
    };
  }
  if ((!templateId || templateId === 'markdown') && format === 'markdown') {
    return {
      productLabel: language === 'ar' ? 'كتاب العائلة' : 'Family Book',
      formatLabel: 'Markdown',
      badgeLabel: language === 'ar' ? 'كتاب العائلة' : 'Family Book',
    };
  }

  const visualOutputLabels: Record<string, { ar: string; en: string }> = {
    'classic-ancestor-poster': {
      ar: 'شجرة الأسلاف الكلاسيكية الدافئة',
      en: 'Classic Ancestor Poster',
    },
    'modern-ancestor-poster': {
      ar: 'شجرة الأسلاف العصرية الداكنة',
      en: 'Modern Ancestor Poster',
    },
    'current-tree-snapshot': {
      ar: 'لقطة الشجرة الحالية',
      en: 'Current Tree Snapshot',
    },
  };
  const visualLabel = templateId ? visualOutputLabels[templateId] : undefined;
  if (visualLabel || (!templateId && format === 'png')) {
    return {
      productLabel:
        visualLabel?.[language] || (language === 'ar' ? 'لقطة الشجرة الحالية' : 'Current Tree Snapshot'),
      formatLabel: format.toUpperCase() || 'PNG',
      badgeLabel: language === 'ar' ? 'مخرج بصري' : 'Visual Output',
    };
  }

  if (templateId === 'gedcom' || format === 'gedcom') {
    return { productLabel: 'GEDCOM', formatLabel: 'GEDCOM', badgeLabel: language === 'ar' ? 'بيانات قابلة للنقل' : 'Portable Data' };
  }
  if (templateId === 'json' || format === 'json') {
    return { productLabel: 'JSON', formatLabel: 'JSON', badgeLabel: language === 'ar' ? 'بيانات قابلة للنقل' : 'Portable Data' };
  }
  if (templateId === 'jozor' || format === 'jozor') {
    return {
      productLabel: language === 'ar' ? 'أرشيف جذور' : 'Jozor Archive',
      formatLabel: language === 'ar' ? 'أرشيف' : 'Archive',
      badgeLabel: language === 'ar' ? 'بيانات قابلة للنقل' : 'Portable Data',
    };
  }
  if (templateId === 'ics' || format === 'ics') {
    return {
      productLabel: language === 'ar' ? 'التقويم' : 'Calendar',
      formatLabel: 'ICS',
      badgeLabel: language === 'ar' ? 'بيانات قابلة للنقل' : 'Portable Data',
    };
  }

  return {
    productLabel: templateId || (language === 'ar' ? 'تصدير عام' : 'Generic Export'),
    formatLabel: format.toUpperCase() || 'UNKNOWN',
    badgeLabel: language === 'ar' ? 'تصدير عام' : 'Generic Export',
  };
}

export const ExportHistorySection: React.FC<ExportHistorySectionProps> = ({
  active,
  language,
  t,
  confirmClearHistory,
  setConfirmClearHistory,
  isClearingHistory,
  setIsClearingHistory,
  expandedHistoryId,
  setExpandedHistoryId,
}) => {
  const exportHistory = useAppStore((state) => state.exportHistory);
  const loadExportHistory = useAppStore((state) => state.loadExportHistory);
  const clearExportHistory = useAppStore((state) => state.clearExportHistory);

  useEffect(() => {
    void loadExportHistory();
  }, [loadExportHistory]);

  if (!active) return null;

  return (
    <section>
      <div className="mb-4 flex items-center justify-between border-b border-[var(--border-soft)] pb-3">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-[var(--primary-600)]" />
          <h4 className="text-[16px] font-bold tracking-tight text-[var(--text-main)]">
            {language === 'ar' ? 'سجل النشر والجودة' : 'Publishing History & Quality'}
          </h4>
        </div>
        {exportHistory && exportHistory.length > 0 && (
          <button
            type="button"
            onClick={() => setConfirmClearHistory(true)}
            disabled={isClearingHistory}
            className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-3 text-xs font-bold text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {language === 'ar' ? 'مسح السجل' : 'Clear History'}
          </button>
        )}
      </div>

      {confirmClearHistory && exportHistory && exportHistory.length > 0 && (
        <div
          role="alert"
          className="mb-4 flex flex-col gap-3 rounded-lg border border-[var(--danger-500)]/30 bg-[var(--danger-500)]/10 p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <p className="text-sm font-bold text-[var(--danger-700)]">
              {language === 'ar' ? 'مسح سجل النشر؟' : 'Clear publishing history?'}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
              {language === 'ar'
                ? 'سيُحذف سجل النتائج والجودة من هذا الجهاز. لن تُحذف ملفات التصدير التي نزّلتها.'
                : 'This removes local export and quality records. Files you already downloaded will not be deleted.'}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setConfirmClearHistory(false)}
              disabled={isClearingHistory}
              className="min-h-9 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel)] px-3 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] disabled:opacity-50"
            >
              {t.cancel}
            </button>
            <button
              type="button"
              onClick={() => {
                if (isClearingHistory) return;
                setIsClearingHistory(true);
                void clearExportHistory()
                  .then(() => setConfirmClearHistory(false))
                  .catch((error: unknown) => {
                    showToast.error(
                      error instanceof Error
                        ? error.message
                        : language === 'ar'
                          ? 'تعذر مسح سجل النشر.'
                          : 'Unable to clear publishing history.'
                    );
                  })
                  .finally(() => setIsClearingHistory(false));
              }}
              disabled={isClearingHistory}
              className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-[var(--danger-600)] px-3 text-xs font-bold text-white hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isClearingHistory && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
              {language === 'ar' ? 'مسح السجل نهائيًا' : 'Clear history permanently'}
            </button>
          </div>
        </div>
      )}

      {!exportHistory || exportHistory.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border-soft)] bg-[var(--surface-subtle)] p-5 text-center">
          <p className="text-sm font-semibold text-[var(--text-main)]">{t.vaultExportHistoryEmptyTitle}</p>
          <p className="mx-auto mt-1 max-w-xl text-xs leading-5 text-[var(--text-muted)]">
            {t.vaultExportHistoryEmptyHint}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {[...exportHistory]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map((entry) => {
              const classification = classifyHistoryEntry(entry, language);
              const hasWarnings = Boolean(entry.warnings?.length);
              const statusText = !entry.success
                ? language === 'ar'
                  ? 'فشل'
                  : 'Failed'
                : hasWarnings
                  ? language === 'ar'
                    ? 'تنبيهات'
                    : 'Warnings'
                  : language === 'ar'
                    ? 'ناجح'
                    : 'Success';
              const statusColorClass = !entry.success
                ? 'bg-red-500/10 text-red-700 border-red-500/20'
                : hasWarnings
                  ? 'bg-amber-500/10 text-amber-700 border-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20';
              const historyEntryId = entry.id || entry.publicationId;
              const isExpanded = expandedHistoryId === historyEntryId;

              return (
                <div
                  key={historyEntryId}
                  className="flex flex-col gap-3 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-4 transition-all hover:shadow-sm"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-[var(--text-main)]">
                          {classification.productLabel}
                        </span>
                        <span className="rounded border border-[var(--border-soft)] bg-[var(--surface-panel)] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[var(--text-main)]">
                          {classification.formatLabel}
                        </span>
                        <span className="rounded-full bg-[var(--primary-500)]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--primary-700)]">
                          {classification.badgeLabel}
                        </span>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusColorClass}`}>
                          {statusText}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{new Date(entry.createdAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                      {entry.totalPages > 0 && (
                        <span>{language === 'ar' ? `${entry.totalPages} صفحات` : `${entry.totalPages} pages`}</span>
                      )}
                      <span>{language === 'ar' ? `${entry.totalPeople} أشخاص` : `${entry.totalPeople} people`}</span>
                      {entry.privacy && (
                        <span className="rounded bg-[var(--surface-panel)] px-1.5 py-0.5 font-mono text-[10px]">
                          {entry.privacy.masked
                            ? language === 'ar'
                              ? 'مخفي'
                              : 'masked'
                            : language === 'ar'
                              ? 'غير مخفي'
                              : 'unmasked'}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setExpandedHistoryId(isExpanded ? null : historyEntryId)}
                    className="self-start rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel)] px-3 py-1.5 text-[11px] font-bold text-[var(--text-secondary)] transition-all hover:bg-[var(--surface-hover)]"
                    aria-expanded={isExpanded}
                  >
                    {isExpanded
                      ? language === 'ar'
                        ? 'إخفاء التفاصيل'
                        : 'Hide details'
                      : language === 'ar'
                        ? 'عرض التفاصيل'
                        : 'Show details'}
                  </button>

                  {isExpanded && (
                    <>
                      {(entry.integrity || entry.evidence) && (
                        <div className="grid gap-2 border-t border-[var(--border-soft)] pt-2.5 sm:grid-cols-3">
                          {entry.integrity?.healthScore !== undefined && (
                            <div className="flex items-center gap-2 rounded-lg bg-[var(--surface-panel)] p-2 text-xs">
                              <span className="text-[var(--text-muted)]">{language === 'ar' ? 'السلامة البنيوية:' : 'Structural integrity:'}</span>
                              <span className="font-bold text-[var(--text-main)]">{entry.integrity.healthScore}%</span>
                            </div>
                          )}
                          {entry.evidence?.citationCoverage !== undefined && (
                            <div className="flex items-center gap-2 rounded-lg bg-[var(--surface-panel)] p-2 text-xs">
                              <span className="text-[var(--text-muted)]">{language === 'ar' ? 'تغطية المراجع:' : 'Citations:'}</span>
                              <span className="font-bold text-[var(--text-main)]">
                                {Math.round(entry.evidence.citationCoverage * 100)}%
                              </span>
                            </div>
                          )}
                          {entry.integrity?.issueCount !== undefined && (
                            <div className="flex items-center gap-2 rounded-lg bg-[var(--surface-panel)] p-2 text-xs">
                              <span className="text-[var(--text-muted)]">{language === 'ar' ? 'المشاكل المعلقة:' : 'Issues:'}</span>
                              <span className={`font-bold ${entry.integrity.issueCount > 0 ? 'text-amber-600' : 'text-[var(--text-main)]'}`}>
                                {entry.integrity.issueCount}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {entry.manuscript && (
                        <div className="border-t border-[var(--border-soft)] pt-2 text-[11px] text-[var(--text-secondary)]">
                          <div className="mb-1 font-semibold text-[var(--text-main)]">
                            {language === 'ar' ? 'إعدادات التصدير:' : 'Export Configuration:'}
                          </div>
                          <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
                            <div>
                              <span className="text-[var(--text-muted)]">{language === 'ar' ? 'العمق:' : 'Depth:'} </span>
                              <span>
                                {entry.manuscript.generationsDepth === 'all'
                                  ? language === 'ar'
                                    ? 'كل الفروع'
                                    : 'All generations'
                                  : language === 'ar'
                                    ? `${entry.manuscript.generationsDepth} أجيال`
                                    : `${entry.manuscript.generationsDepth} gens`}
                              </span>
                            </div>
                            <div>
                              <span className="text-[var(--text-muted)]">{language === 'ar' ? 'الترتيب:' : 'Ordering:'} </span>
                              <span>
                                {entry.manuscript.orderingStrategy === 'narrative'
                                  ? language === 'ar'
                                    ? 'سردي (مسار العائلة)'
                                    : 'Family path'
                                  : entry.manuscript.orderingStrategy === 'chronological'
                                    ? language === 'ar'
                                      ? 'زمني'
                                      : 'Chronological'
                                    : language === 'ar'
                                      ? 'أبجدي'
                                      : 'Alphabetical'}
                              </span>
                            </div>
                            {entry.manuscript.orderedPersonCount !== undefined && (
                              <div>
                                <span className="text-[var(--text-muted)]">{language === 'ar' ? 'الأشخاص المدرجون:' : 'Included people:'} </span>
                                <span>{entry.manuscript.orderedPersonCount}</span>
                              </div>
                            )}
                            <div>
                              <span className="text-[var(--text-muted)]">{language === 'ar' ? 'الأقسام المدرجة:' : 'Included sections:'} </span>
                              <span>
                                {[
                                  entry.manuscript.includeImages ? (language === 'ar' ? 'الصور' : 'photos') : null,
                                  entry.manuscript.includeTimeline ? (language === 'ar' ? 'الخط الزمني' : 'timeline') : null,
                                  entry.manuscript.includeEvidence ? (language === 'ar' ? 'المراجع' : 'bibliography') : null,
                                  entry.manuscript.includeNarrative ? (language === 'ar' ? 'السرد' : 'narrative') : null,
                                ]
                                  .filter(Boolean)
                                  .join(language === 'ar' ? '، ' : ', ') ||
                                  (language === 'ar' ? 'فصول الأشخاص فقط' : 'people only')}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {hasWarnings && entry.warnings && (
                        <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/5 px-2 py-1 text-[11px] text-amber-700">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>
                            {language === 'ar'
                              ? `تم تسجيل عدد ${entry.warnings.length} من التنبيهات أثناء تصدير المخطوط.`
                              : `${entry.warnings.length} warnings reported during export.`}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </section>
  );
};
