import React, { useCallback, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  Calendar,
  Cloud,
  FileText,
  HardDrive,
  Image as ImageIcon,
  Printer,
  RefreshCw,
  Save,
  Trash2,
  BookOpen,
  Download,
  ExternalLink,
  Eye,
  Sparkles,
  X,
} from 'lucide-react';

import { PUBLISHING_EXPORT_RENDERERS } from '../../../types';
import type { DriveFile, ExportType, ManuscriptOrderingStrategy, Person, PublishingExportOptions, PublishingPreviewResult } from '../../../types';
import type { TranslationSchema } from '../../../utils/translationLoader';
import { showToast } from '../../../utils/showToast';
import { useAppStore } from '../../../store/useAppStore';

interface ExportCloudPanelProps {
  canManageCloud: boolean;
  files: DriveFile[];
  t: TranslationSchema;
  onCloseVault: () => void;
  onBackupNow: () => Promise<void> | void;
  onOpenActivityLog: () => void;
  onRefreshDriveFiles: () => Promise<void> | void;
  onOpenDriveFile: (fileId: string) => Promise<void> | void;
  onSaveAsNewFile: (fileName: string) => Promise<void> | void;
  onOverwriteDriveFile: (fileId: string) => Promise<void> | void;
  onDeleteDriveFile: (fileId: string) => Promise<void> | void;
  onRunExport: (type: ExportType) => Promise<void>;
  onRunPublishingExport?: (options: PublishingExportOptions) => Promise<void>;
  onRunPublishingPreview?: (options: Pick<PublishingExportOptions, 'templateId' | 'renderer' | 'manuscriptOptions'>) => Promise<PublishingPreviewResult>;
  hasSessionError: boolean;
  isAuthorized: boolean;
  onGoogleLogin: () => void;
  currentActiveDriveFileId: string | null;
  isBackingUp?: boolean;
  isRefreshing?: boolean;
  isSaving?: boolean;
  isDeleting?: boolean;
}

type ExportLabelKey =
  | 'vaultExportArchive'
  | 'vaultExportJson'
  | 'vaultExportGedcom'
  | 'vaultExportCalendar'
  | 'vaultExportMarkdown'
  | 'vaultExportPng'
  | 'vaultExportPdf'
  | 'vaultExportPrint';

const EXPORT_ACTIONS: Array<{
  id: ExportType;
  labelKey: ExportLabelKey;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'jozor', labelKey: 'vaultExportArchive', icon: Archive },
  { id: 'json', labelKey: 'vaultExportJson', icon: FileText },
  { id: 'gedcom', labelKey: 'vaultExportGedcom', icon: FileText },
  { id: 'ics', labelKey: 'vaultExportCalendar', icon: Calendar },
  { id: 'markdown', labelKey: 'vaultExportMarkdown', icon: FileText },
  { id: 'png', labelKey: 'vaultExportPng', icon: ImageIcon },
  { id: 'pdf', labelKey: 'vaultExportPdf', icon: FileText },
  { id: 'print', labelKey: 'vaultExportPrint', icon: Printer },
];

const waitForDrawerDismissal = () =>
  new Promise<void>((resolve) => {
    if (typeof window === 'undefined') {
      resolve();
      return;
    }
    window.setTimeout(resolve, 140);
  });

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

export const ExportCloudPanel: React.FC<ExportCloudPanelProps> = ({
  canManageCloud,
  files,
  t,
  onCloseVault,
  onBackupNow,
  onOpenActivityLog,
  onRefreshDriveFiles,
  onOpenDriveFile,
  onSaveAsNewFile,
  onOverwriteDriveFile,
  onDeleteDriveFile,
  onRunExport,
  onRunPublishingExport,
  onRunPublishingPreview,
  hasSessionError,
  isAuthorized,
  onGoogleLogin,
  currentActiveDriveFileId,
  isBackingUp = false,
  isRefreshing = false,
  isSaving = false,
  isDeleting = false,
}) => {
  const [newFileName, setNewFileName] = useState('');
  const [confirmOverwriteId, setConfirmOverwriteId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [preview, setPreview] = useState<PublishingPreviewResult | null>(null);
  const [previewSettingsSignature, setPreviewSettingsSignature] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [includeImages, setIncludeImages] = useState(false);
  const [includeNarrative, setIncludeNarrative] = useState(false);
  const [includeTimeline, setIncludeTimeline] = useState(true);
  const [includeEvidence, setIncludeEvidence] = useState(true);
  const [orderingStrategy, setOrderingStrategy] = useState<ManuscriptOrderingStrategy>('narrative');
  const language = useAppStore((state) => state.language);
  const people = useAppStore((state) => state.people);
  const focusId = useAppStore((state) => state.focusId);
  const [selectedRootPersonId, setSelectedRootPersonId] = useState(() => focusId || Object.keys(people)[0] || '');
  const [rootSearchText, setRootSearchText] = useState('');
  const [generationsDepth, setGenerationsDepth] = useState<number | 'all'>(3);

  const personOptions = useMemo(
    () => Object.values(people)
      .map((person) => ({
        id: person.id,
        name: [person.title, person.firstName, person.middleName, person.lastName].filter(Boolean).join(' ').trim() || person.nickName || person.id,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    [people]
  );

  const effectiveRootPersonId = selectedRootPersonId || focusId || personOptions[0]?.id || '';
  const selectedRootName = personOptions.find((person) => person.id === effectiveRootPersonId)?.name || effectiveRootPersonId;
  const handleRootSearchChange = useCallback((value: string) => {
    setRootSearchText(value);
    const normalizedValue = value.trim().toLocaleLowerCase();
    const matchedPerson = personOptions.find((person) =>
      person.id.toLocaleLowerCase() === normalizedValue ||
      person.name.toLocaleLowerCase() === normalizedValue
    );

    if (matchedPerson) {
      setSelectedRootPersonId(matchedPerson.id);
      setRootSearchText('');
    }
  }, [personOptions]);
  const manuscriptScopeLabel = generationsDepth === 'all'
    ? (language === 'ar' ? 'كل الفرع' : 'Full branch')
    : (language === 'ar' ? `${generationsDepth} أجيال` : `${generationsDepth} generations`);
  const manuscriptOrderingLabel = useMemo(() => {
    const labels: Record<ManuscriptOrderingStrategy, string> = {
      narrative: language === 'ar' ? 'مسار العائلة' : 'Family path',
      chronological: language === 'ar' ? 'زمني' : 'Chronological',
      alphabetical: language === 'ar' ? 'أبجدي' : 'Alphabetical',
    };
    return labels[orderingStrategy];
  }, [language, orderingStrategy]);
  const manuscriptScopePersonCount = useMemo(
    () => countBranchPeopleInScope(people, effectiveRootPersonId, generationsDepth),
    [effectiveRootPersonId, generationsDepth, people]
  );
  const includedManuscriptSections = useMemo(
    () => [
      includeImages ? (language === 'ar' ? 'الصور' : 'photos') : null,
      includeTimeline ? (language === 'ar' ? 'الخط الزمني' : 'timeline') : null,
      includeEvidence ? (language === 'ar' ? 'المراجع' : 'bibliography') : null,
      includeNarrative ? (language === 'ar' ? 'السرد' : 'narrative') : null,
    ].filter(Boolean).join(language === 'ar' ? '، ' : ', ') || (language === 'ar' ? 'فصول الأشخاص فقط' : 'people chapters only'),
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
    [effectiveRootPersonId, generationsDepth, includeEvidence, includeImages, includeNarrative, includeTimeline, orderingStrategy]
  );
  const manuscriptSettingsSignature = useMemo(
    () => JSON.stringify(manuscriptOptions),
    [manuscriptOptions]
  );
  const isPreviewOutdated = Boolean(preview && previewSettingsSignature !== manuscriptSettingsSignature);

  const handleExport = useCallback(
    async (type: ExportType) => {
      if (type === 'print' || type === 'pdf') {
        onCloseVault();
        await waitForDrawerDismissal();
      }
      await onRunExport(type);
    },
    [onCloseVault, onRunExport]
  );

  const handlePublishingExport = useCallback(
    async (options: PublishingExportOptions) => {
      if (options.renderer !== PUBLISHING_EXPORT_RENDERERS.manuscript) {
        onCloseVault();
        await waitForDrawerDismissal();
      }
      await onRunPublishingExport?.(options);
    },
    [onCloseVault, onRunPublishingExport]
  );

  const handlePublishingPreview = useCallback(
    async () => {
      if (!onRunPublishingPreview) {
        showToast.error(language === 'ar' ? 'معاينة المخطوط غير متاحة حالياً.' : 'Manuscript preview is not available.');
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
    },
    [language, manuscriptOptions, manuscriptSettingsSignature, onRunPublishingPreview]
  );

  const handleOpenPreviewWindow = useCallback(() => {
    if (!preview) {
      return;
    }

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

  const sortedFiles = useMemo(
    () => [...files].sort((a, b) => String(b.modifiedTime || '').localeCompare(String(a.modifiedTime || ''))),
    [files]
  );

  const handleSaveAsNew = useCallback(async () => {
    const trimmed = newFileName.trim();
    if (!trimmed) {
      showToast.error('googleDriveFileNameRequired');
      return;
    }

    await onSaveAsNewFile(trimmed);
    setNewFileName('');
  }, [newFileName, onSaveAsNewFile]);

  const handleOverwrite = useCallback(async (fileId: string) => {
    await onOverwriteDriveFile(fileId);
    setConfirmOverwriteId(null);
  }, [onOverwriteDriveFile]);

  const handleDelete = useCallback(async (fileId: string) => {
    await onDeleteDriveFile(fileId);
    setConfirmDeleteId(null);
  }, [onDeleteDriveFile]);

  const handleGoogleLogin = useCallback(async () => {
    try {
      await onGoogleLogin();
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Failed to connect Google Drive.');
    }
  }, [onGoogleLogin]);

  return (
    <div className="space-y-6">
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
                    void handlePublishingExport({ templateId: 'classic-book-manuscript', format: 'pdf', renderer: PUBLISHING_EXPORT_RENDERERS.manuscript, manuscriptOptions });
                  }}
                  disabled={isPreviewLoading}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white transition-all hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPreviewLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}
                  {isPreviewOutdated
                    ? (language === 'ar' ? 'تحديث المعاينة' : 'Refresh Preview')
                    : (language === 'ar' ? 'PDF مخطوط العائلة' : 'Family Book PDF')}
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
      <section className="rounded-[14px] border border-[var(--border-soft)] bg-[var(--surface-panel)] p-4 shadow-none">
        {hasSessionError && (
          <div className="mb-4 flex flex-col gap-4 rounded-xl border border-[var(--danger-500)]/20 bg-[var(--danger-500)]/10 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-[var(--danger-500)]/10 p-2 text-[var(--danger-600)]">
                <Cloud className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-[var(--text-main)]">
                  {t.vaultSessionExpired || 'Your session has expired.'}
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)] leading-relaxed">
                  Please connect your Google account to manage backups and cloud files.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleGoogleLogin()}
              className="w-full rounded-lg bg-[var(--danger-600)] px-4 py-2 text-sm font-bold text-white transition-all shadow-sm hover:brightness-95 active:scale-[0.98]"
            >
              Reconnect Google Account
            </button>
          </div>
        )}

        {!isAuthorized && !hasSessionError && canManageCloud && (
          <div className="mb-4 flex flex-col gap-4 rounded-xl border border-[var(--color-info-500)]/20 bg-[var(--color-info-500)]/10 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-[var(--color-info-500)]/10 p-2 text-[var(--color-info-500)]">
                <Cloud className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-[var(--text-main)]">
                  Google Drive Disconnected
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)] leading-relaxed">
                  Connect your account to enable automatic cloud backups and cross-device synchronization.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleGoogleLogin()}
              className="w-full rounded-lg bg-[var(--color-info-500)] px-4 py-2 text-sm font-bold text-white transition-all shadow-sm hover:brightness-95 active:scale-[0.98]"
            >
              Connect Google Drive
            </button>
          </div>
        )}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <h3 className="text-[16px] font-bold tracking-tight text-[var(--text-main)]">{t.vaultCloudBackupTitle}</h3>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={() => void onBackupNow()}
              disabled={!canManageCloud || isBackingUp}
              className="min-h-11 rounded-xl bg-[var(--primary-600)] px-4 py-2 text-sm font-semibold text-white transition-all duration-200 ease-in-out hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="inline-flex items-center gap-2">
                {isBackingUp ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Cloud className="h-4 w-4" />}
                {t.vaultBackupNow}
              </span>
            </button>
            <button
              type="button"
              onClick={onOpenActivityLog}
              className="min-h-11 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-all duration-200 ease-in-out hover:bg-[var(--surface-hover)]"
            >
              {t.vaultActivityLog}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-[20px] border border-[var(--primary-500)]/20 bg-gradient-to-br from-[var(--surface-panel)] via-[var(--surface-panel)] to-[var(--primary-500)]/5 p-5 shadow-sm relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-[var(--primary-500)]/5 blur-3xl pointer-events-none" />
        
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-[var(--primary-500)]/10 p-2.5 text-[var(--primary-600)]">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-[17px] font-bold tracking-tight text-[var(--text-main)]">
              {language === 'ar' ? 'نظام النشر والطباعة (جذور 1.0)' : 'Publishing & Printing Engine (Jozor 1.0)'}
            </h4>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {language === 'ar' 
                ? 'تصدير شجرتك باستخدام محرك التخطيط التلقائي وتوزيع الصفحات الذكي.' 
                : 'Export your tree using the automated publishing layouts and page distribution.'}
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {/* Template 1: Classic Family Book */}
          <div className="flex flex-col gap-4 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-4 transition-all hover:border-[var(--primary-500)]/30 hover:shadow-sm">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-xl bg-[var(--surface-panel)] p-2 text-[var(--primary-600)]">
                <BookOpen className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h5 className="text-sm font-bold text-[var(--text-main)]">
                    {language === 'ar' ? 'كتاب العائلة الكلاسيكي المصغر' : 'Classic Family Book Manuscript'}
                  </h5>
                  <span className="rounded-full bg-[var(--primary-500)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--primary-600)]">
                    A4 PDF
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-muted)]">
                  {language === 'ar' 
                    ? 'مخطوط عائلي قابل للمعاينة قبل الطباعة، مع فصول الأشخاص والخط الزمني والمراجع حسب اختيارك.'
                    : 'A previewable family manuscript with people chapters, timeline, and bibliography based on your options.'}
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel)] p-3">
              <div className="mb-3 flex flex-col gap-2 border-b border-[var(--border-soft)] pb-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h6 className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                    {language === 'ar' ? 'لوحة تحكم المخطوط' : 'Manuscript Control Panel'}
                  </h6>
                  <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-muted)]">
                    {language === 'ar'
                      ? 'المعاينة وملف PDF يستخدمان نفس نموذج المخطوط والإعدادات.'
                      : 'Preview and PDF use the same manuscript model and settings.'}
                  </p>
                </div>
                <div className="rounded-lg bg-[var(--surface-subtle)] px-3 py-2 text-[11px] leading-relaxed text-[var(--text-muted)] sm:max-w-xs">
                  <span className="font-bold text-[var(--text-secondary)]">
                    {language === 'ar' ? 'النطاق:' : 'Scope:'}
                  </span>{' '}
                  {selectedRootName} · {manuscriptScopeLabel}
                  <br />
                  <span className="font-bold text-[var(--text-secondary)]">
                    {language === 'ar' ? 'الترتيب:' : 'Order:'}
                  </span>{' '}
                  {manuscriptOrderingLabel}
                  <br />
                  <span className="font-bold text-[var(--text-secondary)]">
                    {language === 'ar' ? 'الأشخاص:' : 'People in scope:'}
                  </span>{' '}
                  {manuscriptScopePersonCount}
                  <br />
                  <span className="font-bold text-[var(--text-secondary)]">
                    {language === 'ar' ? 'المحتوى:' : 'Includes:'}
                  </span>{' '}
                  {includedManuscriptSections}
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex flex-col gap-1 rounded-lg bg-[var(--surface-subtle)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)]">
                <span>{language === 'ar' ? 'جذر المخطوط' : 'Manuscript root'}</span>
                <input
                  list="manuscript-root-options"
                  value={rootSearchText || selectedRootName}
                  onChange={(event) => handleRootSearchChange(event.target.value)}
                  onFocus={() => setRootSearchText('')}
                  onBlur={() => setRootSearchText('')}
                  placeholder={language === 'ar' ? 'ابحث باسم الشخص...' : 'Search by person name...'}
                  className="min-h-9 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel)] px-2 text-xs text-[var(--text-main)] outline-none focus:border-[var(--primary-600)]"
                />
                <datalist id="manuscript-root-options">
                  {personOptions.map((person) => (
                    <option key={person.id} value={person.id}>{person.name}</option>
                  ))}
                  {personOptions.map((person) => (
                    <option key={`${person.id}-name`} value={person.name}>{person.id}</option>
                  ))}
                </datalist>
              </label>
              <label className="flex flex-col gap-1 rounded-lg bg-[var(--surface-subtle)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)]">
                <span>{language === 'ar' ? 'عمق الفرع' : 'Branch depth'}</span>
                <select
                  value={String(generationsDepth)}
                  onChange={(event) => setGenerationsDepth(event.target.value === 'all' ? 'all' : Number(event.target.value))}
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
              <label className="flex min-h-10 cursor-pointer items-center justify-between gap-3 rounded-lg bg-[var(--surface-subtle)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)]">
                <span>{language === 'ar' ? 'تضمين الصور' : 'Include photos'}</span>
                <input
                  type="checkbox"
                  checked={includeImages}
                  onChange={(event) => setIncludeImages(event.target.checked)}
                  className="h-4 w-4 accent-[var(--primary-600)]"
                />
              </label>
              <label className="flex min-h-10 cursor-pointer items-center justify-between gap-3 rounded-lg bg-[var(--surface-subtle)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)]">
                <span>{language === 'ar' ? 'مسودة سردية' : 'Narrative draft'}</span>
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
            </div>

            <div className="flex flex-col justify-end gap-2 border-t border-[var(--border-soft)] pt-3 sm:flex-row">
              <button

                type="button"

                onClick={() => void handlePublishingPreview()}

                disabled={isPreviewLoading}

                className="flex items-center justify-center gap-2 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel)] px-4 py-2 text-xs font-bold text-[var(--text-main)] transition-all hover:bg-[var(--surface-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"

              >

                {isPreviewLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}

                {language === 'ar' ? 'معاينة المخطوط' : 'Preview Manuscript'}

              </button>

              <button

                type="button"

                onClick={() => void handlePublishingExport({ templateId: 'classic-book-manuscript', format: 'pdf', renderer: PUBLISHING_EXPORT_RENDERERS.manuscript, manuscriptOptions })}

                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-emerald-700/10 transition-all hover:brightness-105 active:scale-[0.98]"

              >

                <Printer className="h-3.5 w-3.5" />

                {language === 'ar' ? 'PDF مخطوط العائلة' : 'Family Book PDF'}

              </button>

              <button
                type="button"
                onClick={() => void handlePublishingExport({ templateId: 'classic-book-manuscript', format: 'pdf' })}
                className="flex items-center gap-2 rounded-xl bg-[var(--primary-600)] hover:bg-[var(--primary-700)] text-white px-4 py-2 text-xs font-bold transition-all hover:brightness-105 active:scale-[0.98] shadow-sm shadow-[var(--primary-600)]/10"
              >
                <Download className="h-3.5 w-3.5" />
                {language === 'ar' ? 'PDF متجه تقليدي' : 'Legacy Vector PDF'}
              </button>
            </div>
          </div>

          {/* Template 2: Classic Ancestor Poster */}
          <div className="flex flex-col gap-4 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-4 transition-all hover:border-[var(--primary-500)]/30 hover:shadow-sm">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-xl bg-[var(--surface-panel)] p-2 text-[var(--primary-600)]">
                <ImageIcon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h5 className="text-sm font-bold text-[var(--text-main)]">
                    {language === 'ar' ? 'شجرة الأسلاف الكلاسيكية الدافئة' : 'Classic Ancestor Poster'}
                  </h5>
                  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
                    {language === 'ar' ? 'ثيم دافئ' : 'Warm Theme'}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-muted)]">
                  {language === 'ar' 
                    ? 'تصميم بوستر تقليدي مريح للعين، يعتمد على نبرات لونية هادئة (4 أجيال)، ملائم للطباعة الورقية والتأطير.'
                    : 'Traditional cozy poster design featuring warm vintage tones (4 generations), perfect for print and framing.'}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-[var(--border-soft)] pt-3">
              <button
                type="button"
                onClick={() => void handlePublishingExport({ templateId: 'classic-ancestor-poster', format: 'png' })}
                className="flex items-center gap-1.5 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel)] hover:bg-[var(--surface-hover)] text-[var(--text-main)] px-3 py-2 text-xs font-bold transition-all active:scale-[0.98]"
              >
                <Download className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                {language === 'ar' ? 'تنزيل PNG' : 'Download PNG'}
              </button>
              <button
                type="button"
                onClick={() => void handlePublishingExport({ templateId: 'classic-ancestor-poster', format: 'pdf' })}
                className="flex items-center gap-1.5 rounded-xl bg-[var(--primary-600)] hover:bg-[var(--primary-700)] text-white px-3 py-2 text-xs font-bold transition-all hover:brightness-105 active:scale-[0.98]"
              >
                <Download className="h-3.5 w-3.5" />
                {language === 'ar' ? 'تنزيل PDF' : 'Download PDF'}
              </button>
            </div>
          </div>

          {/* Template 3: Modern Ancestor Poster */}
          <div className="flex flex-col gap-4 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-4 transition-all hover:border-[var(--primary-500)]/30 hover:shadow-sm">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-xl bg-[var(--surface-panel)] p-2 text-[var(--primary-600)]">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h5 className="text-sm font-bold text-[var(--text-main)]">
                    {language === 'ar' ? 'شجرة الأسلاف العصرية الداكنة' : 'Modern Ancestor Poster'}
                  </h5>
                  <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-600">
                    {language === 'ar' ? 'ثيم داكن' : 'Dark Theme'}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-muted)]">
                  {language === 'ar' 
                    ? 'تصميم شجرة عصري بألوان داكنة ونظام ألوان ذكي يبرز التباين والعمق (4 أجيال) للتعليق الإلكتروني والطباعة الفاخرة.'
                    : 'Modern dark-themed poster design utilizing contrasting elements (4 generations) for screens or premium prints.'}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-[var(--border-soft)] pt-3">
              <button
                type="button"
                onClick={() => void handlePublishingExport({ templateId: 'modern-ancestor-poster', format: 'png' })}
                className="flex items-center gap-1.5 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel)] hover:bg-[var(--surface-hover)] text-[var(--text-main)] px-3 py-2 text-xs font-bold transition-all active:scale-[0.98]"
              >
                <Download className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                {language === 'ar' ? 'تنزيل PNG' : 'Download PNG'}
              </button>
              <button
                type="button"
                onClick={() => void handlePublishingExport({ templateId: 'modern-ancestor-poster', format: 'pdf' })}
                className="flex items-center gap-1.5 rounded-xl bg-[var(--primary-600)] hover:bg-[var(--primary-700)] text-white px-3 py-2 text-xs font-bold transition-all hover:brightness-105 active:scale-[0.98]"
              >
                <Download className="h-3.5 w-3.5" />
                {language === 'ar' ? 'تنزيل PDF' : 'Download PDF'}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[14px] border border-[var(--border-soft)] bg-[var(--surface-panel)] p-4 shadow-none">
        <h4 className="text-[16px] font-bold tracking-tight text-[var(--text-main)]">{t.vaultExportDataTitle}</h4>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {EXPORT_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                type="button"
                onClick={() => void handleExport(action.id)}
                className="flex min-h-[88px] flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-4 py-3 text-center transition-all duration-200 ease-in-out hover:bg-[var(--surface-hover)]"
              >
                <div className="rounded-xl bg-[var(--surface-panel)] p-2 text-[var(--primary-600)]">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[var(--text-main)]">{t[action.labelKey] || action.id}</div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-[14px] border border-[var(--border-soft)] bg-[var(--surface-panel)] p-4 shadow-none">
        <div className="mb-4 flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="text-[16px] font-bold tracking-tight text-[var(--text-main)]">{t.vaultCloudFiles}</h4>
              <p className="mt-1 text-xs text-[var(--text-muted)]">{t.vaultCloudFilesHint || 'Manage Google Drive backups from this tab.'}</p>
            </div>
            <button
              type="button"
              onClick={() => void onRefreshDriveFiles()}
              disabled={isRefreshing}
              className="min-h-11 min-w-11 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-2 text-[var(--text-secondary)] transition-all duration-200 ease-in-out hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={t.vaultRefreshCloudFiles}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="grid gap-3 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <input
              type="text"
              value={newFileName}
              onChange={(event) => setNewFileName(event.target.value)}
              placeholder={t.googleDriveFileName}
              disabled={!canManageCloud || isSaving}
              className="min-h-11 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel)] px-3 text-sm text-[var(--text-main)] outline-none transition-all focus:border-[var(--primary-600)] disabled:cursor-not-allowed disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => void handleSaveAsNew()}
              disabled={!canManageCloud || isSaving || !newFileName.trim()}
              className="min-h-11 rounded-xl bg-[var(--primary-600)] px-4 py-2 text-sm font-semibold text-white transition-all duration-200 ease-in-out hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="inline-flex items-center gap-2">
                {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {t.saveAsNewFile}
              </span>
            </button>
          </div>
        </div>

        {sortedFiles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border-soft)] bg-[var(--surface-subtle)] p-5 text-[12px] text-[var(--text-muted)]">
            {t.vaultCloudEmpty}
          </div>
        ) : (
          <div className="space-y-6">
            {sortedFiles.map((file) => {
              const isActive = file.id === currentActiveDriveFileId;

              return (
              <div key={file.id} className={`flex flex-col gap-3 rounded-2xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${isActive ? 'border-[var(--primary-600)]/40 bg-[var(--primary-600)]/5' : 'border-[var(--border-soft)] bg-[var(--surface-subtle)]'}`}>
                <div className="min-w-0 flex items-center gap-3">
                  <div className="rounded-xl bg-[var(--surface-panel)] p-2 text-[var(--text-muted)]">
                    <HardDrive className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-[var(--text-main)]">{file.name}</p>
                      {isActive && (
                        <span className="rounded-md bg-[var(--primary-600)] px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                          {t.active}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-[12px] text-[var(--text-muted)]">{file.modifiedTime}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {confirmOverwriteId === file.id ? (
                    <button
                      type="button"
                      onClick={() => void handleOverwrite(file.id)}
                      disabled={isSaving}
                      className="min-h-11 rounded-xl bg-orange-600 px-3 py-2 text-xs font-semibold text-white transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4" />
                        {t.confirmOverwrite}
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmOverwriteId(file.id)}
                      disabled={!canManageCloud || isSaving || isActive}
                      className="min-h-11 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition-all hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {t.overwrite}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void onOpenDriveFile(file.id)}
                    disabled={isActive}
                    className="min-h-11 rounded-xl bg-[var(--primary-600)] px-3 py-2 text-xs font-semibold text-white transition-all duration-200 ease-in-out hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {t.vaultOpenCloudFile}
                  </button>
                  {confirmDeleteId === file.id ? (
                    <button
                      type="button"
                      onClick={() => void handleDelete(file.id)}
                      disabled={isDeleting}
                      className="min-h-11 rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <Trash2 className="h-4 w-4" />
                        {t.confirmDelete}
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(file.id)}
                      disabled={!canManageCloud || isDeleting || isActive}
                      className="min-h-11 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition-all hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {t.delete}
                    </button>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        )}

        {!canManageCloud && (
          <div className="mt-4 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-4 text-[12px] text-[var(--text-muted)]">{t.vaultCloudAccessLimited}</div>
        )}
      </section>
    </div>
  );
};
