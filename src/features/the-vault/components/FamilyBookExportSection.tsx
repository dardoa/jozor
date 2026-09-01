import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, Eye, FileText, RefreshCw, X } from 'lucide-react';

import { PUBLISHING_EXPORT_RENDERERS } from '../../../types';
import type {
  ExportType,
  ManuscriptOrderingStrategy,
  Person,
  PublishingExportOptions,
  PublishingPreviewResult,
} from '../../../types';
import { useAppStore } from '../../../store/useAppStore';
import { showToast } from '../../../utils/showToast';
import { useControlledPdfReadiness } from '../../publishing/hooks';
import { ManuscriptExportSummary } from './ManuscriptExportSummary';

interface FamilyBookExportSectionProps {
  active: boolean;
  language: 'ar' | 'en';
  onRunExport: (type: ExportType) => Promise<void>;
  onRunPublishingExport: (options: PublishingExportOptions) => Promise<void>;
  onRunPublishingPreview?: (
    options: Pick<PublishingExportOptions, 'templateId' | 'renderer' | 'manuscriptOptions'>
  ) => Promise<PublishingPreviewResult>;
}

function countBranchPeopleInScope(
  people: Record<string, Pick<Person, 'id' | 'children' | 'spouses'>>,
  rootPersonId: string,
  generationsDepth: number | 'all'
): number {
  if (!rootPersonId || !people[rootPersonId]) return 0;

  const collected = new Set<string>();
  const visited = new Set<string>();

  const traverse = (personId: string, depth: number) => {
    if (typeof generationsDepth === 'number' && depth > generationsDepth) return;
    if (visited.has(personId)) return;
    visited.add(personId);

    const person = people[personId];
    if (!person) return;

    collected.add(personId);
    person.spouses?.forEach((spouseId) => {
      if (people[spouseId]) collected.add(spouseId);
    });
    person.children?.forEach((childId) => traverse(childId, depth + 1));
  };

  traverse(rootPersonId, 1);
  return collected.size;
}

export const FamilyBookExportSection: React.FC<FamilyBookExportSectionProps> = ({
  active,
  language,
  onRunExport,
  onRunPublishingExport,
  onRunPublishingPreview,
}) => {
  const people = useAppStore((state) => state.people);
  const focusId = useAppStore((state) => state.focusId);
  const [preview, setPreview] = useState<PublishingPreviewResult | null>(null);
  const [previewSettingsSignature, setPreviewSettingsSignature] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [includeImages, setIncludeImages] = useState(false);
  const [includeNarrative, setIncludeNarrative] = useState(false);
  const [includeTimeline, setIncludeTimeline] = useState(true);
  const [includeEvidence, setIncludeEvidence] = useState(true);
  const [orderingStrategy, setOrderingStrategy] = useState<ManuscriptOrderingStrategy>('narrative');
  const [selectedRootPersonId, setSelectedRootPersonId] = useState(
    () => focusId || Object.keys(people)[0] || ''
  );
  const [rootSearchText, setRootSearchText] = useState('');
  const [generationsDepth, setGenerationsDepth] = useState<number | 'all'>(3);
  const { status: controlledPdfStatus, refresh: checkControlledPdfReadiness } = useControlledPdfReadiness();

  useEffect(() => {
    void checkControlledPdfReadiness();
  }, [checkControlledPdfReadiness]);

  const personOptions = useMemo(() => {
    const options = Object.values(people)
      .map((person) => ({
        id: person.id,
        name:
          [person.title, person.firstName, person.middleName, person.lastName]
            .filter(Boolean)
            .join(' ')
            .trim() ||
          person.nickName ||
          (language === 'ar' ? 'شخص بلا اسم' : 'Unnamed person'),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    const nameTotals = new Map<string, number>();
    const nameIndexes = new Map<string, number>();

    options.forEach((person) => {
      const key = person.name.toLocaleLowerCase();
      nameTotals.set(key, (nameTotals.get(key) ?? 0) + 1);
    });

    return options.map((person) => {
      const key = person.name.toLocaleLowerCase();
      const index = (nameIndexes.get(key) ?? 0) + 1;
      nameIndexes.set(key, index);
      return {
        ...person,
        selectorLabel: (nameTotals.get(key) ?? 0) > 1 ? `${person.name} (${index})` : person.name,
      };
    });
  }, [language, people]);

  const effectiveRootPersonId = selectedRootPersonId || focusId || personOptions[0]?.id || '';
  const selectedRootName =
    personOptions.find((person) => person.id === effectiveRootPersonId)?.name || effectiveRootPersonId;
  const selectedRootSelectorLabel =
    personOptions.find((person) => person.id === effectiveRootPersonId)?.selectorLabel || selectedRootName;

  const handleRootSearchChange = useCallback(
    (value: string) => {
      setRootSearchText(value);
      const normalizedValue = value.trim().toLocaleLowerCase();
      const matchedPerson = personOptions.find(
        (person) =>
          person.selectorLabel.toLocaleLowerCase() === normalizedValue ||
          person.name.toLocaleLowerCase() === normalizedValue
      );

      if (matchedPerson) {
        setSelectedRootPersonId(matchedPerson.id);
        setRootSearchText('');
      }
    },
    [personOptions]
  );

  const manuscriptOrderingLabel = useMemo(() => {
    const labels: Record<ManuscriptOrderingStrategy, string> = {
      narrative: language === 'ar' ? 'مسار العائلة' : 'Family path',
      chronological: language === 'ar' ? 'زمني' : 'Chronological',
      alphabetical: language === 'ar' ? 'أبجدي' : 'Alphabetical',
      custom: language === 'ar' ? 'مخصص' : 'Custom',
    };
    return labels[orderingStrategy];
  }, [language, orderingStrategy]);

  const manuscriptScopePersonCount = useMemo(
    () => countBranchPeopleInScope(people, effectiveRootPersonId, generationsDepth),
    [effectiveRootPersonId, generationsDepth, people]
  );

  const includedManuscriptSections = useMemo(
    () =>
      [
        includeImages ? (language === 'ar' ? 'الصور' : 'photos') : null,
        includeTimeline ? (language === 'ar' ? 'الخط الزمني' : 'timeline') : null,
        includeEvidence ? (language === 'ar' ? 'المراجع' : 'bibliography') : null,
        includeNarrative ? (language === 'ar' ? 'السرد' : 'narrative') : null,
      ]
        .filter(Boolean)
        .join(language === 'ar' ? '، ' : ', ') ||
      (language === 'ar' ? 'فصول الأشخاص فقط' : 'people chapters only'),
    [includeEvidence, includeImages, includeNarrative, includeTimeline, language]
  );

  const manuscriptOptions = useMemo(
    () => ({
      rootPersonId: effectiveRootPersonId,
      generationsDepth,
      orderingStrategy,
      includeImages,
      includeNarrative,
      includeTimeline,
      includeEvidence,
    }),
    [
      effectiveRootPersonId,
      generationsDepth,
      includeEvidence,
      includeImages,
      includeNarrative,
      includeTimeline,
      orderingStrategy,
    ]
  );
  const manuscriptSettingsSignature = useMemo(
    () => JSON.stringify(manuscriptOptions),
    [manuscriptOptions]
  );
  const isPreviewOutdated = Boolean(preview && previewSettingsSignature !== manuscriptSettingsSignature);
  const manuscriptPreviewStatus = isPreviewLoading
    ? 'generating'
    : isPreviewOutdated
      ? 'stale'
      : preview
        ? 'ready'
        : 'idle';

  const handlePublishingPreview = useCallback(async () => {
    if (!onRunPublishingPreview) {
      showToast.error(
        language === 'ar' ? 'معاينة المخطوط غير متاحة حالياً.' : 'Manuscript preview is not available.'
      );
      return;
    }

    setIsPreviewLoading(true);
    try {
      const result = await onRunPublishingPreview({
        templateId: 'classic-book-manuscript',
        renderer: PUBLISHING_EXPORT_RENDERERS.manuscript,
        manuscriptOptions,
      });
      setPreview(result);
      setPreviewSettingsSignature(manuscriptSettingsSignature);
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Failed to build manuscript preview.');
    } finally {
      setIsPreviewLoading(false);
    }
  }, [language, manuscriptOptions, manuscriptSettingsSignature, onRunPublishingPreview]);

  const handleOpenPreviewWindow = useCallback(() => {
    if (!preview) return;

    const previewWindow = window.open('', '_blank', 'width=1100,height=900');
    if (!previewWindow) {
      showToast.error(language === 'ar' ? 'تعذر فتح نافذة المعاينة.' : 'Unable to open the preview window.');
      return;
    }

    previewWindow.document.open();
    previewWindow.document.write(preview.html);
    previewWindow.document.close();
    previewWindow.document.title = preview.title;
    previewWindow.focus();
  }, [language, preview]);

  return (
    <>
      {preview && (
        <div className="fixed inset-0 z-[var(--z-index-modal)] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <div className="flex h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel)] shadow-2xl">
            <div className="flex flex-col gap-3 border-b border-[var(--border-soft)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h4 className="truncate text-sm font-bold text-[var(--text-main)]">
                  {language === 'ar' ? 'معاينة المخطوط' : 'Manuscript Preview'}
                </h4>
                <p className="truncate text-xs text-[var(--text-muted)]">{preview.title}</p>
                {typeof preview.pageEstimate === 'number' && (
                  <p className="mt-1 text-[11px] font-semibold text-[var(--text-dim)]">
                    {language === 'ar'
                      ? `تقدير الصفحات: ${preview.pageEstimate}`
                      : `Estimated pages: ${preview.pageEstimate}`}
                  </p>
                )}
                {isPreviewOutdated && (
                  <p className="mt-1 rounded-lg bg-amber-500/10 px-2 py-1 text-[11px] font-semibold text-amber-700">
                    {language === 'ar'
                      ? 'تغيرت الإعدادات بعد هذه المعاينة. حدّث المعاينة قبل التصدير.'
                      : 'Settings changed after this preview. Refresh the preview before exporting.'}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenPreviewWindow}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-3 py-2 text-xs font-bold text-[var(--text-secondary)] transition-all hover:bg-[var(--surface-hover)] active:scale-[0.98]"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {language === 'ar' ? 'فتح المعاينة' : 'Open Preview'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (isPreviewOutdated) {
                      void handlePublishingPreview();
                      return;
                    }
                    void onRunPublishingExport({
                      templateId: 'classic-book-manuscript',
                      format: 'pdf',
                      renderer: PUBLISHING_EXPORT_RENDERERS.manuscript,
                      manuscriptOptions,
                    });
                  }}
                  disabled={isPreviewLoading}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white transition-all hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPreviewLoading ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <FileText className="h-3.5 w-3.5" />
                  )}
                  {isPreviewOutdated
                    ? language === 'ar'
                      ? 'تحديث المعاينة'
                      : 'Refresh Preview'
                    : language === 'ar'
                      ? 'PDF مخطوط العائلة'
                      : 'Family Book PDF'}
                </button>
                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] transition-all hover:bg-[var(--surface-hover)]"
                  aria-label={language === 'ar' ? 'إغلاق المعاينة' : 'Close preview'}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <iframe
              title={language === 'ar' ? 'معاينة مخطوط العائلة' : 'Family manuscript preview'}
              srcDoc={preview.html}
              className="h-full w-full flex-1 border-0 bg-white"
            />
          </div>
        </div>
      )}

      {active && (
        <section className="relative">
          <div className="flex flex-col gap-4 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel)] p-4 transition-all hover:border-[var(--primary-500)]/30 hover:shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border-soft)]/60 pb-3">
              <h5 className="text-sm font-bold text-[var(--text-main)]">
                {language === 'ar' ? 'كتاب العائلة الكلاسيكي' : 'Classic Family Book'}
              </h5>
              <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                {language === 'ar' ? 'PDF وMarkdown' : 'PDF and Markdown'}
              </span>
            </div>
            <ManuscriptExportSummary
              language={language}
              rootPersonName={selectedRootName}
              generationsDepth={generationsDepth}
              manuscriptScopePersonCount={manuscriptScopePersonCount}
              manuscriptOrderingLabel={manuscriptOrderingLabel}
              includedManuscriptSections={includedManuscriptSections}
              previewStatus={manuscriptPreviewStatus}
              citationCoverage={preview?.citationCoverage}
            />

            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex flex-col gap-1 rounded-lg bg-[var(--surface-subtle)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)]">
                <span>{language === 'ar' ? 'جذر المخطوط' : 'Manuscript root'}</span>
                <input
                  list="manuscript-root-options"
                  value={rootSearchText || selectedRootSelectorLabel}
                  onChange={(event) => handleRootSearchChange(event.target.value)}
                  onFocus={() => setRootSearchText('')}
                  onBlur={() => setRootSearchText('')}
                  placeholder={language === 'ar' ? 'ابحث باسم الشخص...' : 'Search by person name...'}
                  className="min-h-9 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel)] px-2 text-xs text-[var(--text-main)] outline-none focus:border-[var(--primary-600)]"
                />
                <datalist id="manuscript-root-options">
                  {personOptions.map((person) => (
                    <option key={person.id} value={person.selectorLabel}>
                      {person.name}
                    </option>
                  ))}
                </datalist>
              </label>
              <label className="flex flex-col gap-1 rounded-lg bg-[var(--surface-subtle)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)]">
                <span>{language === 'ar' ? 'عمق الفرع' : 'Branch depth'}</span>
                <select
                  value={String(generationsDepth)}
                  onChange={(event) =>
                    setGenerationsDepth(event.target.value === 'all' ? 'all' : Number(event.target.value))
                  }
                  className="min-h-9 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel)] px-2 text-xs text-[var(--text-main)] outline-none focus:border-[var(--primary-600)]"
                >
                  <option value="2">{language === 'ar' ? 'جيلان' : '2 generations'}</option>
                  <option value="3">{language === 'ar' ? '3 أجيال' : '3 generations'}</option>
                  <option value="4">{language === 'ar' ? '4 أجيال' : '4 generations'}</option>
                  <option value="all">{language === 'ar' ? 'كل الفرع' : 'Full branch'}</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 rounded-lg bg-[var(--surface-subtle)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)]">
                <span>{language === 'ar' ? 'ترتيب القراءة' : 'Reading order'}</span>
                <select
                  value={orderingStrategy}
                  onChange={(event) => setOrderingStrategy(event.target.value as ManuscriptOrderingStrategy)}
                  className="min-h-9 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel)] px-2 text-xs text-[var(--text-main)] outline-none focus:border-[var(--primary-600)]"
                >
                  <option value="narrative">{language === 'ar' ? 'مسار العائلة' : 'Family path'}</option>
                  <option value="chronological">{language === 'ar' ? 'زمني' : 'Chronological'}</option>
                  <option value="alphabetical">{language === 'ar' ? 'أبجدي' : 'Alphabetical'}</option>
                </select>
              </label>
              <div className="flex flex-col gap-1.5">
                <label className="flex min-h-10 cursor-pointer items-center justify-between gap-3 rounded-lg bg-[var(--surface-subtle)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)]">
                  <span>
                    {language === 'ar' ? 'تضمين الصور الشخصية المتاحة' : 'Include available profile photos'}
                  </span>
                  <input
                    type="checkbox"
                    checked={includeImages}
                    onChange={(event) => setIncludeImages(event.target.checked)}
                    className="h-4 w-4 accent-[var(--primary-600)]"
                  />
                </label>
                <p className="px-1 text-[10px] leading-normal text-[var(--text-muted)]">
                  {language === 'ar'
                    ? 'قد تكشف الصور الشخصية داخل الكتاب أشخاصاً أحياء أو خاصين ما لم تنطبق قواعد إخفاء الخصوصية.'
                    : 'Profile photos included in the book may reveal living/private people unless privacy masking applies.'}
                </p>
              </div>
              <label className="flex min-h-10 cursor-pointer items-center justify-between gap-3 rounded-lg bg-[var(--surface-subtle)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)]">
                <span>{language === 'ar' ? 'نصوص تعريفية مبدئية' : 'Draft biography text'}</span>
                <input
                  type="checkbox"
                  checked={includeNarrative}
                  onChange={(event) => setIncludeNarrative(event.target.checked)}
                  className="h-4 w-4 accent-[var(--primary-600)]"
                />
              </label>
              <label className="flex min-h-10 cursor-pointer items-center justify-between gap-3 rounded-lg bg-[var(--surface-subtle)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)]">
                <span>{language === 'ar' ? 'تضمين الخط الزمني' : 'Include timeline'}</span>
                <input
                  type="checkbox"
                  checked={includeTimeline}
                  onChange={(event) => setIncludeTimeline(event.target.checked)}
                  className="h-4 w-4 accent-[var(--primary-600)]"
                />
              </label>
              <label className="flex min-h-10 cursor-pointer items-center justify-between gap-3 rounded-lg bg-[var(--surface-subtle)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)]">
                <span>{language === 'ar' ? 'تضمين المراجع' : 'Include bibliography'}</span>
                <input
                  type="checkbox"
                  checked={includeEvidence}
                  onChange={(event) => setIncludeEvidence(event.target.checked)}
                  className="h-4 w-4 accent-[var(--primary-600)]"
                />
              </label>
            </div>

            <div className="flex flex-col justify-end gap-2 border-t border-[var(--border-soft)] pt-3 sm:flex-row">
              <button
                type="button"
                onClick={() => void handlePublishingPreview()}
                disabled={isPreviewLoading}
                className="flex items-center justify-center gap-2 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel)] px-4 py-2 text-xs font-bold text-[var(--text-main)] transition-all hover:bg-[var(--surface-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPreviewLoading ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
                {language === 'ar' ? 'معاينة المخطوط' : 'Preview Manuscript'}
              </button>
              <button
                type="button"
                onClick={() =>
                  void onRunPublishingExport({
                    templateId: 'classic-book-manuscript',
                    format: 'pdf',
                    renderer: PUBLISHING_EXPORT_RENDERERS.manuscript,
                    manuscriptOptions,
                  })
                }
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-emerald-700/10 transition-all hover:brightness-105 active:scale-[0.98]"
              >
                <FileText className="h-3.5 w-3.5" />
                {language === 'ar' ? 'PDF مخطوط العائلة' : 'Family Book PDF'}
              </button>
              <button
                type="button"
                onClick={() => void onRunExport('markdown')}
                className="flex items-center justify-center gap-2 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel)] px-4 py-2 text-xs font-bold text-[var(--text-main)] transition-all hover:bg-[var(--surface-hover)] active:scale-[0.98]"
              >
                <FileText className="h-3.5 w-3.5" />
                {language === 'ar' ? 'Markdown كتاب العائلة' : 'Family Book Markdown'}
              </button>
            </div>

            {controlledPdfStatus === 'fallback' && (
              <div className="mt-2.5 flex max-w-md flex-col gap-1 text-start text-[10px] leading-relaxed text-amber-600/90 dark:text-amber-500/90">
                <p>
                  {language === 'ar'
                    ? '⚠️ قد تضيف طباعة المتصفح ترويسة وتذييلاً من المتصفح (مثل date أو about:blank). لملفات PDF الجاهزة للبيتا، يرجى استخدام محرك PDF المتحكم عند توفره.'
                    : '⚠️ Browser print may add browser headers and footers. For beta-ready PDFs, use the controlled PDF engine when available.'}
                </p>
                <p className="opacity-80">
                  {language === 'ar'
                    ? 'عند استخدام طباعة المتصفح كبديل مؤقت، يرجى تعطيل خيار "الترويسة والتذييل" (Headers and Footers) في إعدادات الطباعة قبل الحفظ.'
                    : 'For browser print fallback, disable browser headers and footers in the print settings before saving as PDF.'}
                </p>
              </div>
            )}
            <div className="mt-2 flex flex-col items-end gap-1 font-mono text-[10px] text-[var(--text-dim)]">
              <div data-testid="controlled-pdf-readiness-indicator">
                {controlledPdfStatus === 'ready' &&
                  (language === 'ar' ? 'محرك PDF: جاهز' : 'PDF engine: Ready')}
                {controlledPdfStatus === 'fallback' &&
                  (language === 'ar' ? 'محرك PDF: الطباعة من المتصفح' : 'PDF engine: Browser print')}
                {controlledPdfStatus === 'checking' &&
                  (language === 'ar' ? 'محرك PDF: جاري الفحص' : 'PDF engine: Checking')}
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
};
