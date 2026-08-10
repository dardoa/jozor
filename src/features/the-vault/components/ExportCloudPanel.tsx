import React, { useCallback, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  Calendar,
  Cloud,
  FileText,
  HardDrive,
  Image as ImageIcon,
  RefreshCw,
  Save,
  Trash2,
  Download,
  ExternalLink,
  Eye,
  Sparkles,
  X,
  History,
  Clock,
} from 'lucide-react';

import { PUBLISHING_EXPORT_RENDERERS } from '../../../types';
import type { DriveFile, ExportType, ManuscriptOrderingStrategy, Person, PublishingExportOptions, PublishingPreviewResult } from '../../../types';
import type { TranslationSchema } from '../../../utils/translationLoader';
import { showToast } from '../../../utils/showToast';
import { useControlledPdfReadiness } from '../../publishing/hooks';
import { listVisualOutputDefinitionsByProduct } from '../../publishing';
import type { VisualOutputDefinition, VisualOutputProductType, ExportHistoryEntry } from '../../publishing';
import { useAppStore } from '../../../store/useAppStore';
import { ManuscriptExportSummary } from './ManuscriptExportSummary';
import { VisualPublishingStudio } from './visual-studio/VisualPublishingStudio';

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
  activeSection?: ExportPanelSection;
  onActiveSectionChange?: (section: ExportPanelSection) => void;
}

type ExportLabelKey =
  | 'vaultExportArchive'
  | 'vaultExportJson'
  | 'vaultExportGedcom'
  | 'vaultExportCalendar'
  | 'vaultExportPng'
  | 'vaultExportPdf';

const EXPORT_ACTIONS: Array<{
  id: ExportType;
  labelKey: ExportLabelKey;
  icon: React.ComponentType<{ className?: string }>;
  group: 'portable-data';
}> = [
  { id: 'jozor', labelKey: 'vaultExportArchive', icon: Archive, group: 'portable-data' },
  { id: 'json', labelKey: 'vaultExportJson', icon: FileText, group: 'portable-data' },
  { id: 'gedcom', labelKey: 'vaultExportGedcom', icon: FileText, group: 'portable-data' },
  { id: 'ics', labelKey: 'vaultExportCalendar', icon: Calendar, group: 'portable-data' },
];

const TREE_SNAPSHOT_ACTIONS: Array<{
  id: Extract<ExportType, 'png' | 'pdf'>;
  labelKey: ExportLabelKey;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'png', labelKey: 'vaultExportPng', icon: ImageIcon },
  { id: 'pdf', labelKey: 'vaultExportPdf', icon: FileText },
];

const SHOW_LEGACY_POSTER_EXPORT_CARDS = false;

export type ExportPanelSection = 'family-book' | 'visuals' | 'data-export' | 'history' | 'cloud-backup';

const EXPORT_PANEL_SECTIONS: Array<{
  id: ExportPanelSection;
  label: { en: string; ar: string };
}> = [
  { id: 'family-book', label: { en: 'Family Book', ar: 'كتاب العائلة' } },
  { id: 'visuals', label: { en: 'Visual Outputs', ar: 'المخرجات البصرية' } },
  { id: 'data-export', label: { en: 'Portable Data', ar: 'بيانات قابلة للنقل' } },
  { id: 'history', label: { en: 'History & Quality', ar: 'السجل والجودة' } },
  { id: 'cloud-backup', label: { en: 'Cloud Backup', ar: 'النسخ السحابي' } },
];

const waitForDrawerDismissal = () =>
  new Promise<void>((resolve) => {
    if (typeof window === 'undefined') {
      resolve();
      return;
    }
    window.setTimeout(resolve, 140);
  });

function getRendererChips(definition?: VisualOutputDefinition): string[] {
  return (definition?.capabilities?.rendererTargets as unknown as string[]) ?? (definition?.rendererTargets as unknown as string[]) ?? [];
}

function getVisualProductBadge(productType?: VisualOutputProductType, language?: 'ar' | 'en'): string {
  if (productType === 'poster') {
    return language === 'ar' ? 'بوستر' : 'Poster';
  }
  if (productType === 'snapshot') {
    return language === 'ar' ? 'لقطة' : 'Snapshot';
  }
  return '';
}

type HistoryProductCategory =
  | 'family-book'
  | 'visual-output'
  | 'portable-data'
  | 'cloud-backup'
  | 'unknown';

interface HistoryProductDisplay {
  category: HistoryProductCategory;
  productLabel: string;
  formatLabel: string;
  badgeLabel: string;
}

function classifyHistoryEntry(entry: ExportHistoryEntry, language: 'ar' | 'en'): HistoryProductDisplay {
  const templateId = entry.templateId;
  const format = entry.format || '';

  // 1. Family Book
  if (templateId === 'classic-book-manuscript') {
    return {
      category: 'family-book',
      productLabel: language === 'ar' ? 'كتاب العائلة' : 'Family Book',
      formatLabel: format === 'markdown' ? 'Markdown' : 'PDF',
      badgeLabel: language === 'ar' ? 'كتاب العائلة' : 'Family Book',
    };
  }
  // Legacy fallback for old Markdown entries without templateId
  if ((!templateId || templateId === 'markdown') && format === 'markdown') {
    return {
      category: 'family-book',
      productLabel: language === 'ar' ? 'كتاب العائلة' : 'Family Book',
      formatLabel: 'Markdown',
      badgeLabel: language === 'ar' ? 'كتاب العائلة' : 'Family Book',
    };
  }

  // 2. Visual Output
  if (templateId === 'classic-ancestor-poster') {
    return {
      category: 'visual-output',
      productLabel: language === 'ar' ? 'شجرة الأسلاف الكلاسيكية الدافئة' : 'Classic Ancestor Poster',
      formatLabel: format.toUpperCase() || 'PNG',
      badgeLabel: language === 'ar' ? 'مخرج بصري' : 'Visual Output',
    };
  }
  if (templateId === 'modern-ancestor-poster') {
    return {
      category: 'visual-output',
      productLabel: language === 'ar' ? 'شجرة الأسلاف العصرية الداكنة' : 'Modern Ancestor Poster',
      formatLabel: format.toUpperCase() || 'PNG',
      badgeLabel: language === 'ar' ? 'مخرج بصري' : 'Visual Output',
    };
  }
  if (templateId === 'current-tree-snapshot') {
    return {
      category: 'visual-output',
      productLabel: language === 'ar' ? 'لقطة الشجرة الحالية' : 'Current Tree Snapshot',
      formatLabel: format.toUpperCase() || 'PNG',
      badgeLabel: language === 'ar' ? 'مخرج بصري' : 'Visual Output',
    };
  }
  // Legacy PNG fallback without templateId
  if (!templateId && format === 'png') {
    return {
      category: 'visual-output',
      productLabel: language === 'ar' ? 'لقطة الشجرة الحالية' : 'Current Tree Snapshot',
      formatLabel: 'PNG',
      badgeLabel: language === 'ar' ? 'مخرج بصري' : 'Visual Output',
    };
  }

  // 3. Portable Data
  if (templateId === 'gedcom' || format === 'gedcom') {
    return {
      category: 'portable-data',
      productLabel: 'GEDCOM',
      formatLabel: 'GEDCOM',
      badgeLabel: language === 'ar' ? 'بيانات قابلة للنقل' : 'Portable Data',
    };
  }
  if (templateId === 'json' || format === 'json') {
    return {
      category: 'portable-data',
      productLabel: 'JSON',
      formatLabel: 'JSON',
      badgeLabel: language === 'ar' ? 'بيانات قابلة للنقل' : 'Portable Data',
    };
  }
  if (templateId === 'jozor' || format === 'jozor') {
    return {
      category: 'portable-data',
      productLabel: language === 'ar' ? 'أرشيف جذور' : 'Jozor Archive',
      formatLabel: language === 'ar' ? 'أرشيف' : 'Archive',
      badgeLabel: language === 'ar' ? 'بيانات قابلة للنقل' : 'Portable Data',
    };
  }
  if (templateId === 'ics' || format === 'ics') {
    return {
      category: 'portable-data',
      productLabel: language === 'ar' ? 'التقويم' : 'Calendar',
      formatLabel: 'ICS',
      badgeLabel: language === 'ar' ? 'بيانات قابلة للنقل' : 'Portable Data',
    };
  }

  // 4. Default / Fallback
  return {
    category: 'unknown',
    productLabel: templateId || (language === 'ar' ? 'تصدير عام' : 'Generic Export'),
    formatLabel: format.toUpperCase() || 'UNKNOWN',
    badgeLabel: language === 'ar' ? 'تصدير عام' : 'Generic Export',
  };
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
  activeSection: controlledActiveSection,
  onActiveSectionChange,
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
  const exportHistory = useAppStore((state) => state.exportHistory);
  const loadExportHistory = useAppStore((state) => state.loadExportHistory);
  const clearExportHistory = useAppStore((state) => state.clearExportHistory);

  const [selectedRootPersonId, setSelectedRootPersonId] = useState(() => focusId || Object.keys(people)[0] || '');
  const [rootSearchText, setRootSearchText] = useState('');
  const [generationsDepth, setGenerationsDepth] = useState<number | 'all'>(3);
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);
  const [uncontrolledActiveSection, setUncontrolledActiveSection] = useState<ExportPanelSection>('family-book');
  const [expandedHistoryId, setExpandedHistoryId] = useState<number | string | null>(null);
  const { status: controlledPdfStatus, refresh: checkControlledPdfReadiness } = useControlledPdfReadiness();
  const activeSection = controlledActiveSection ?? uncontrolledActiveSection;
  const setActiveSection = useCallback((section: ExportPanelSection) => {
    if (controlledActiveSection === undefined) {
      setUncontrolledActiveSection(section);
    }
    onActiveSectionChange?.(section);
  }, [controlledActiveSection, onActiveSectionChange]);

  const posterVisualOutputs = useMemo(() => listVisualOutputDefinitionsByProduct('poster'), []);
  const snapshotVisualOutputs = useMemo(() => listVisualOutputDefinitionsByProduct('snapshot'), []);

  const classicPosterDef = useMemo(() => posterVisualOutputs.find((def) => def.id === 'classic-ancestor-poster'), [posterVisualOutputs]);
  const modernPosterDef = useMemo(() => posterVisualOutputs.find((def) => def.id === 'modern-ancestor-poster'), [posterVisualOutputs]);
  const treeSnapshotDef = useMemo(() => snapshotVisualOutputs.find((def) => def.id === 'current-tree-snapshot'), [snapshotVisualOutputs]);

  React.useEffect(() => {
    void checkControlledPdfReadiness();
    void loadExportHistory();
  }, [checkControlledPdfReadiness, loadExportHistory]);

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
    () => [
      includeImages ? (language === 'ar' ? 'الصور' : 'photos') : null,
      includeTimeline ? (language === 'ar' ? 'الخط الزمني' : 'timeline') : null,
      includeEvidence ? (language === 'ar' ? 'المراجع' : 'bibliography') : null,
      includeNarrative ? (language === 'ar' ? 'السرد' : 'narrative') : null,
    ].filter(Boolean).join(language === 'ar' ? '، ' : ', ') || (language === 'ar' ? 'فصول الأشخاص فقط' : 'people chapters only'),
    [includeEvidence, includeImages, includeNarrative, includeTimeline, language]
  );

  // Visual inserts are template-level options and are intentionally not exposed in the Vault UI yet.
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
  const manuscriptPreviewStatus = isPreviewLoading
    ? 'generating'
    : isPreviewOutdated
      ? 'stale'
      : preview
        ? 'ready'
        : 'idle';

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
                  {isPreviewLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
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
      <div className="rounded-[16px] border border-[var(--border-soft)] bg-[var(--surface-panel)] p-2 shadow-none">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5" role="tablist" aria-label={language === 'ar' ? 'أقسام التصدير' : 'Export sections'}>
          {EXPORT_PANEL_SECTIONS.map((section) => {
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveSection(section.id)}
                className={`min-h-10 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[var(--primary-600)] text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                }`}
              >
                {language === 'ar' ? section.label.ar : section.label.en}
              </button>
            );
          })}
        </div>
      </div>

      {activeSection === 'cloud-backup' && (
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
      )}

      {(activeSection === 'family-book' || activeSection === 'visuals') && (
      <section className="rounded-[20px] border border-[var(--primary-500)]/20 bg-gradient-to-br from-[var(--surface-panel)] via-[var(--surface-panel)] to-[var(--primary-500)]/5 p-5 shadow-sm relative overflow-hidden">
        <div className="space-y-4">
          {activeSection === 'family-book' && (
          <>
          {/* Template 1: Classic Family Book */}
          <div className="flex flex-col gap-4 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel)] p-4 transition-all hover:border-[var(--primary-500)]/30 hover:shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-[var(--border-soft)]/60 pb-3">
                <h5 className="text-sm font-bold text-[var(--text-main)]">
                  {language === 'ar' ? 'كتاب العائلة الكلاسيكي' : 'Classic Family Book'}
                </h5>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 shrink-0">
                  {language === 'ar' ? 'جاهز للبيتا المحدودة' : 'Limited beta ready'}
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
              <div className="flex flex-col gap-1.5">
                <label className="flex min-h-10 cursor-pointer items-center justify-between gap-3 rounded-lg bg-[var(--surface-subtle)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)]">
                  <span>{language === 'ar' ? 'تضمين الصور الشخصية المتاحة' : 'Include available profile photos'}</span>
                  <input
                    type="checkbox"
                    checked={includeImages}
                    onChange={(event) => setIncludeImages(event.target.checked)}
                    className="h-4 w-4 accent-[var(--primary-600)]"
                  />
                </label>
                <p className="text-[10px] text-[var(--text-muted)] leading-normal px-1">
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

                {isPreviewLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}

                {language === 'ar' ? 'معاينة المخطوط' : 'Preview Manuscript'}

              </button>

              <button

                type="button"

                onClick={() => void handlePublishingExport({ templateId: 'classic-book-manuscript', format: 'pdf', renderer: PUBLISHING_EXPORT_RENDERERS.manuscript, manuscriptOptions })}

                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-sm shadow-emerald-700/10 transition-all hover:brightness-105 active:scale-[0.98]"

              >

                <FileText className="h-3.5 w-3.5" />

                {language === 'ar' ? 'PDF مخطوط العائلة' : 'Family Book PDF'}

              </button>
              <button
                type="button"
                onClick={() => void handleExport('markdown')}
                className="flex items-center justify-center gap-2 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel)] px-4 py-2 text-xs font-bold text-[var(--text-main)] transition-all hover:bg-[var(--surface-hover)] active:scale-[0.98]"
              >
                <FileText className="h-3.5 w-3.5" />
                {language === 'ar' ? 'Markdown كتاب العائلة' : 'Family Book Markdown'}
              </button>
            </div>
            {controlledPdfStatus === 'fallback' && (
              <div className="mt-2.5 text-[10px] leading-relaxed text-amber-600/90 dark:text-amber-500/90 max-w-md text-start flex flex-col gap-1">
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
            <div className="mt-2 flex flex-col items-end gap-1 text-[10px] font-mono text-[var(--text-dim)]">
              <div data-testid="controlled-pdf-readiness-indicator">
                {controlledPdfStatus === 'ready' && (language === 'ar' ? 'محرك PDF: جاهز' : 'PDF engine: Ready')}
                {controlledPdfStatus === 'fallback' && (language === 'ar' ? 'محرك PDF: الطباعة من المتصفح' : 'PDF engine: Browser print')}
                {controlledPdfStatus === 'checking' && (language === 'ar' ? 'محرك PDF: جاري الفحص' : 'PDF engine: Checking')}
              </div>
            </div>
          </div>
          </>
          )}

          {activeSection === 'visuals' && (
          <>
          <div className="mb-6">
            <VisualPublishingStudio language={language} previewSourceMode="store" />
          </div>
          <div data-testid="visual-actual-export-section" className="pt-2 border-t border-[var(--border-soft)]/60">
            <h5 className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)]">
              {language === 'ar' ? '\u0645\u062e\u0631\u062c\u0627\u062a \u0625\u0636\u0627\u0641\u064a\u0629' : 'Additional outputs'}
            </h5>
            <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-muted)]">
              {language === 'ar'
                ? 'استخدم البطاقة التالية لتنزيل لقطة الشجرة. تنزيلات PNG وPDF للبوستر متاحة من الاستوديو أعلاه.'
                : 'Use the following card to download a Tree Snapshot. Poster PNG and PDF downloads are available from the Studio above.'}
            </p>
            <div className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[11px] font-medium leading-relaxed text-amber-700 dark:text-amber-300">
              {language === 'ar'
                ? 'مسار PDF القديم للبوسترات موقوف. يتم إنشاء PNG وPDF أعلاه بواسطة محرك الاستوديو الجديد.'
                : 'The legacy poster PDF path remains paused. PNG and PDF above are generated by the new Studio renderer.'}
            </div>
          </div>

          {SHOW_LEGACY_POSTER_EXPORT_CARDS && (
          <>
          {/* Template 2: Classic Ancestor Poster */}
          <div className="flex flex-col gap-4 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-4 transition-all hover:border-[var(--primary-500)]/30 hover:shadow-sm">
            {classicPosterDef?.previewAsset && (
              <div
                className="w-full h-32 rounded-xl bg-[var(--surface-panel)] border border-[var(--border-soft)] flex items-center justify-center text-[var(--text-dim)] font-medium text-xs relative overflow-hidden select-none"
                aria-label={classicPosterDef.previewAsset.alt[language]}
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-[var(--primary-500)]/5 via-transparent to-transparent pointer-events-none" />
                <div className="flex flex-col items-center gap-1.5 z-10">
                  <ImageIcon className="h-5 w-5 text-[var(--text-secondary)] opacity-60" />
                  <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-mono">
                    {language === 'ar' ? 'معاينة القالب الكلاسيكي' : 'Classic Template Preview'}
                  </span>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-xl bg-[var(--surface-panel)] p-2 text-[var(--primary-600)]">
                <ImageIcon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h5 className="text-sm font-bold text-[var(--text-main)]">
                    {classicPosterDef?.displayName[language] || (language === 'ar' ? 'شجرة الأسلاف الكلاسيكية الدافئة' : 'Classic Ancestor Poster')}
                  </h5>
                  <span className="rounded-full bg-[var(--primary-500)]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--primary-700)]">
                    {getVisualProductBadge(classicPosterDef?.productType, language)}
                  </span>
                  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
                    {language === 'ar' ? 'ثيم دافئ' : 'Warm Theme'}
                  </span>
                  <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    {language === 'ar' ? 'اجتياز بنيوي للبيتا' : 'Structural beta pass'}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-muted)]">
                  {classicPosterDef?.description[language] || (language === 'ar'
                    ? 'تصميم بوستر تقليدي مريح للعين، يعتمد على نبرات لونية هادئة (4 أجيال)، ملائم للطباعة الورقية والتأطير.'
                    : 'Traditional cozy poster design featuring warm vintage tones (4 generations), perfect for print and framing.')}
                </p>
                <p className="mt-1 text-[10px] font-medium leading-relaxed text-indigo-600/90 dark:text-indigo-400/90">
                  {language === 'ar'
                    ? 'تم التحقق من التصدير بنيوياً. راجع النتيجة بصرياً على شجرتك قبل المشاركة.'
                    : 'Export is structurally verified. Review the result visually on your own tree before sharing.'}
                </p>
                {classicPosterDef?.recommendedFor && (
                  <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-semibold text-[var(--text-muted)]">
                      {language === 'ar' ? 'مناسب لـ:' : 'Recommended for:'}
                    </span>
                    {classicPosterDef.recommendedFor[language].slice(0, 3).map((rec) => (
                      <span
                        key={rec}
                        className="rounded-full bg-[var(--surface-panel)] border border-[var(--border-soft)] px-2 py-0.5 text-[9px] font-medium text-[var(--text-secondary)]"
                      >
                        {rec}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5 text-[10px] font-medium text-[var(--text-secondary)]">
                    <span>{language === 'ar' ? 'الصيغ المدعومة:' : 'Supported formats:'}</span>
                    {getRendererChips(classicPosterDef).map((renderer) => (
                      <span key={renderer} className="rounded bg-[var(--surface-panel)] border border-[var(--border-soft)] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[var(--text-main)]">
                        {renderer}
                      </span>
                    ))}
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)]">|</span>
                  <span className="text-[10px] font-medium text-[var(--text-muted)]">
                    {language === 'ar' ? 'أحجام جاهزة للطباعة: A4-A0' : 'Print-ready sizes: A4-A0'}
                  </span>
                </div>
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
            {modernPosterDef?.previewAsset && (
              <div
                className="w-full h-32 rounded-xl bg-[var(--surface-panel)] border border-[var(--border-soft)] flex items-center justify-center text-[var(--text-dim)] font-medium text-xs relative overflow-hidden select-none"
                aria-label={modernPosterDef.previewAsset.alt[language]}
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-[var(--indigo-500)]/5 via-transparent to-transparent pointer-events-none" />
                <div className="flex flex-col items-center gap-1.5 z-10">
                  <Sparkles className="h-5 w-5 text-[var(--text-secondary)] opacity-60" />
                  <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-mono">
                    {language === 'ar' ? 'معاينة القالب العصري' : 'Modern Template Preview'}
                  </span>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-xl bg-[var(--surface-panel)] p-2 text-[var(--primary-600)]">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h5 className="text-sm font-bold text-[var(--text-main)]">
                    {modernPosterDef?.displayName[language] || (language === 'ar' ? 'شجرة الأسلاف العصرية الداكنة' : 'Modern Ancestor Poster')}
                  </h5>
                  <span className="rounded-full bg-[var(--primary-500)]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--primary-700)]">
                    {getVisualProductBadge(modernPosterDef?.productType, language)}
                  </span>
                  <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-600">
                    {language === 'ar' ? 'ثيم داكن' : 'Dark Theme'}
                  </span>
                  <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    {language === 'ar' ? 'اجتياز بنيوي للبيتا' : 'Structural beta pass'}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-muted)]">
                  {modernPosterDef?.description[language] || (language === 'ar'
                    ? 'تصميم شجرة عصري بألوان داكنة ونظام ألوان ذكي يبرز التباين والعمق (4 أجيال) للتعليق الإلكتروني والطباعة الفاخرة.'
                    : 'Modern dark-themed poster design utilizing contrasting elements (4 generations) for screens or premium prints.')}
                </p>
                <p className="mt-1 text-[10px] font-medium leading-relaxed text-indigo-600/90 dark:text-indigo-400/90">
                  {language === 'ar'
                    ? 'تم التحقق من التصدير بنيوياً. راجع النتيجة بصرياً على شجرتك قبل المشاركة.'
                    : 'Export is structurally verified. Review the result visually on your own tree before sharing.'}
                </p>
                {modernPosterDef?.recommendedFor && (
                  <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-semibold text-[var(--text-muted)]">
                      {language === 'ar' ? 'مناسب لـ:' : 'Recommended for:'}
                    </span>
                    {modernPosterDef.recommendedFor[language].slice(0, 3).map((rec) => (
                      <span
                        key={rec}
                        className="rounded-full bg-[var(--surface-panel)] border border-[var(--border-soft)] px-2 py-0.5 text-[9px] font-medium text-[var(--text-secondary)]"
                      >
                        {rec}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5 text-[10px] font-medium text-[var(--text-secondary)]">
                    <span>{language === 'ar' ? 'الصيغ المدعومة:' : 'Supported formats:'}</span>
                    {getRendererChips(modernPosterDef).map((renderer) => (
                      <span key={renderer} className="rounded bg-[var(--surface-panel)] border border-[var(--border-soft)] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[var(--text-main)]">
                        {renderer}
                      </span>
                    ))}
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)]">|</span>
                  <span className="text-[10px] font-medium text-[var(--text-muted)]">
                    {language === 'ar' ? 'أحجام جاهزة للطباعة: A4-A0' : 'Print-ready sizes: A4-A0'}
                  </span>
                </div>
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
          </>
          )}

          {/* Current Tree Snapshot (Compact Product Card Style) */}
          <div className="flex flex-col gap-4 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-4 transition-all hover:border-[var(--primary-500)]/30 hover:shadow-sm">
            {treeSnapshotDef?.previewAsset && (
              <div
                className="w-full h-20 rounded-xl bg-[var(--surface-panel)] border border-[var(--border-soft)] flex items-center justify-center text-[var(--text-dim)] font-medium text-xs relative overflow-hidden select-none"
                aria-label={treeSnapshotDef.previewAsset.alt[language]}
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-[var(--primary-500)]/3 via-transparent to-transparent pointer-events-none" />
                <div className="flex flex-col items-center gap-1 z-10">
                  <ImageIcon className="h-4 w-4 text-[var(--text-secondary)] opacity-60" />
                  <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider font-mono">
                    {language === 'ar' ? 'معاينة لقطة الشجرة الحالية' : 'Current Tree Preview'}
                  </span>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-xl bg-[var(--surface-panel)] p-2 text-[var(--primary-600)]">
                <ImageIcon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h5 className="text-sm font-bold text-[var(--text-main)]">
                    {treeSnapshotDef?.displayName[language] || (language === 'ar' ? 'لقطات الشجرة الحالية' : 'Current Tree Snapshot')}
                  </h5>
                  <span className="rounded-full bg-[var(--primary-500)]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--primary-700)]">
                    {getVisualProductBadge(treeSnapshotDef?.productType, language)}
                  </span>
                  <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    {language === 'ar' ? 'اجتياز بنيوي للبيتا' : 'Structural beta pass'}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-muted)]">
                  {treeSnapshotDef?.description[language] || (language === 'ar'
                    ? 'تصدير لقطة عالية الدقة للمساحة المعروضة حالياً.'
                    : 'A high-fidelity export of your current workspace viewport.')}
                </p>
                <p className="mt-1 text-[10px] font-medium leading-relaxed text-indigo-600/90 dark:text-indigo-400/90">
                  {language === 'ar'
                    ? 'تم التحقق من التصدير بنيوياً. راجع النتيجة بصرياً على شجرتك قبل المشاركة.'
                    : 'Export is structurally verified. Review the result visually on your own tree before sharing.'}
                </p>
                {treeSnapshotDef?.recommendedFor && (
                  <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-semibold text-[var(--text-muted)]">
                      {language === 'ar' ? 'مناسب لـ:' : 'Recommended for:'}
                    </span>
                    {treeSnapshotDef.recommendedFor[language].slice(0, 3).map((rec) => (
                      <span
                        key={rec}
                        className="rounded-full bg-[var(--surface-panel)] border border-[var(--border-soft)] px-2 py-0.5 text-[9px] font-medium text-[var(--text-secondary)]"
                      >
                        {rec}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5 text-[10px] font-medium text-[var(--text-secondary)]">
                    <span>{language === 'ar' ? 'الصيغ المدعومة:' : 'Supported formats:'}</span>
                    {getRendererChips(treeSnapshotDef).map((renderer) => (
                      <span key={renderer} className="rounded bg-[var(--surface-panel)] border border-[var(--border-soft)] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[var(--text-main)]">
                        {renderer}
                      </span>
                    ))}
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)]">|</span>
                  <span className="text-[10px] font-medium text-[var(--text-muted)]">
                    {language === 'ar' ? 'يعتمد على عرض الشجرة الحالي' : 'Uses the current tree view'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-[var(--border-soft)] pt-3">
              {TREE_SNAPSHOT_ACTIONS.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => void handleExport(action.id)}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all active:scale-[0.98] ${
                    action.id === 'pdf'
                      ? 'bg-[var(--primary-600)] hover:bg-[var(--primary-700)] text-white hover:brightness-105'
                      : 'border border-[var(--border-soft)] bg-[var(--surface-panel)] hover:bg-[var(--surface-hover)] text-[var(--text-main)]'
                  }`}
                >
                  <Download className="h-3.5 w-3.5" />
                  {t[action.labelKey] || action.id.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          </>
          )}
        </div>
      </section>
      )}

      {activeSection === 'data-export' && (
      <section className="rounded-[14px] border border-[var(--border-soft)] bg-[var(--surface-panel)] p-4 shadow-none">
        <h4 className="text-[16px] font-bold tracking-tight text-[var(--text-main)]">{t.vaultExportDataTitle}</h4>
        <div className="mt-4 space-y-4">
          {(['portable-data'] as const).map((group) => (
            <div key={group} className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-3">
              <h5 className="mb-3 text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                {group === 'portable-data'
                  ? (language === 'ar' ? 'بيانات قابلة للنقل' : 'Portable Data')
                  : (language === 'ar' ? 'مخرجات مباشرة' : 'Direct Outputs')}
              </h5>
              <div className="grid gap-2 sm:grid-cols-2">
                {EXPORT_ACTIONS.filter((action) => action.group === group).map((action) => {
                  const Icon = action.icon;
                  let displayName = t[action.labelKey] || action.id;
                  let badgeText = '';
                  let descriptionText = '';
                  let badgeStyle = '';

                  if (action.id === 'jozor') {
                    displayName = language === 'ar' ? 'نسخة جذور الكاملة' : 'Jozor Full Backup';
                    badgeText = language === 'ar' ? 'للمالك فقط / نسخة كاملة' : 'Owner only / full backup';
                    descriptionText = language === 'ar'
                      ? 'أرشيف كامل للمالك. قد يحتوي بيانات خاماً وصوراً وملفات مشروع. ليس ملف مشاركة عام.'
                      : 'Full owner archive. May contain raw project data, media, and backup files. Not a public sharing format.';
                    badgeStyle = 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
                  } else if (action.id === 'json') {
                    displayName = language === 'ar' ? 'JSON خام للمشروع' : 'Raw Project JSON';
                    badgeText = language === 'ar' ? 'تصدير خام داخلي / غير مخصص للمشاركة' : 'Internal raw export / not for sharing';
                    descriptionText = language === 'ar'
                      ? 'قد يحتوي بيانات داخلية وروابط وسائط وحقول مشروع خام. ليس JSON نظيفاً قابلاً للمشاركة.'
                      : 'May include internal metadata, media references, and raw project fields. Not a clean portable JSON export.';
                    badgeStyle = 'bg-rose-500/10 text-rose-600 dark:text-rose-400';
                  } else if (action.id === 'gedcom') {
                    badgeText = language === 'ar' ? 'جاهز للبيتا المحدودة' : 'Limited beta ready';
                    descriptionText = language === 'ar'
                      ? 'صيغة تبادل مع برامج الأنساب. اجتازت معاينة المالك.'
                      : 'Genealogy exchange format. Owner spot check passed.';
                    badgeStyle = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
                  } else if (action.id === 'ics') {
                    badgeText = language === 'ar' ? 'اجتياز بنيوي للبيتا' : 'Structural beta pass';
                    descriptionText = language === 'ar'
                      ? 'يصدر الأحداث ذات التواريخ الكاملة فقط، ويتجاهل التواريخ الجزئية مثل السنة فقط لتجنب الدقة الزائفة.'
                      : 'Exports complete-date events only; partial dates such as year-only values are skipped to avoid false precision.';
                    badgeStyle = 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400';
                  }

                  return (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => void handleExport(action.id)}
                      className="flex flex-col items-start gap-2 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel)] p-3 text-start transition-all duration-200 ease-in-out hover:bg-[var(--surface-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]/40 w-full"
                    >
                      <div className="flex w-full items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="rounded-lg bg-[var(--surface-subtle)] p-2 text-[var(--primary-600)] shrink-0">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="text-sm font-semibold text-[var(--text-main)] truncate">{displayName}</div>
                        </div>
                        <Download className="h-3.5 w-3.5 text-[var(--text-muted)] shrink-0" />
                      </div>
                      {badgeText && (
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badgeStyle}`}>
                          {badgeText}
                        </span>
                      )}
                      {descriptionText && (
                        <p className="text-[11px] leading-relaxed text-[var(--text-muted)] mt-1">
                          {descriptionText}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
      )}

      {activeSection === 'history' && (
      <section className="rounded-[14px] border border-[var(--border-soft)] bg-[var(--surface-panel)] p-4 shadow-none">
        <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-3 mb-4">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-[var(--primary-600)]" />
            <h4 className="text-[16px] font-bold tracking-tight text-[var(--text-main)]">
              {language === 'ar' ? 'سجل النشر والجودة' : 'Publishing History & Quality'}
            </h4>
          </div>
          {exportHistory && exportHistory.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (confirmClearHistory) {
                  void clearExportHistory();
                  setConfirmClearHistory(false);
                } else {
                  setConfirmClearHistory(true);
                }
              }}
              className={`min-h-9 px-3 rounded-lg text-xs font-bold transition-all duration-200 ${
                confirmClearHistory
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'border border-[var(--border-soft)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
              }`}
            >
              {confirmClearHistory
                ? (language === 'ar' ? 'تأكيد المسح' : 'Confirm clear')
                : (language === 'ar' ? 'مسح السجل' : 'Clear History')}
            </button>
          )}
        </div>

        {(!exportHistory || exportHistory.length === 0) ? (
          <div className="rounded-2xl border border-dashed border-[var(--border-soft)] bg-[var(--surface-subtle)] p-5 text-center text-xs text-[var(--text-muted)]">
            {language === 'ar' ? 'لا يوجد سجل تصدير بعد.' : 'No export history available yet.'}
          </div>
        ) : (
          <div className="space-y-4">
            {[...exportHistory]
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((entry) => {
                const classification = classifyHistoryEntry(entry, language);

                const hasWarnings = entry.warnings && entry.warnings.length > 0;
                const statusText = !entry.success
                  ? (language === 'ar' ? 'فشل' : 'Failed')
                  : hasWarnings
                    ? (language === 'ar' ? 'تنبيهات' : 'Warnings')
                    : (language === 'ar' ? 'ناجح' : 'Success');

                const statusColorClass = !entry.success
                  ? 'bg-red-500/10 text-red-700 border-red-500/20'
                  : hasWarnings
                    ? 'bg-amber-500/10 text-amber-700 border-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20';
                const historyEntryId = entry.id || entry.publicationId;
                const isHistoryExpanded = expandedHistoryId === historyEntryId;

                return (
                  <div
                    key={historyEntryId}
                    className="flex flex-col gap-3 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-4 transition-all hover:shadow-sm"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-[var(--text-main)]">{classification.productLabel}</span>
                          <span className="rounded bg-[var(--surface-panel)] border border-[var(--border-soft)] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[var(--text-main)]">
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
                          <span>
                            {language === 'ar' ? `${entry.totalPages} صفحات` : `${entry.totalPages} pages`}
                          </span>
                        )}
                        <span>
                          {language === 'ar' ? `${entry.totalPeople} أشخاص` : `${entry.totalPeople} people`}
                        </span>
                        {entry.privacy && (
                          <span className="rounded bg-[var(--surface-panel)] px-1.5 py-0.5 text-[10px] font-mono">
                            {entry.privacy.masked
                              ? (language === 'ar' ? 'مخفي' : 'masked')
                              : (language === 'ar' ? 'غير مخفي' : 'unmasked')}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedHistoryId(isHistoryExpanded ? null : historyEntryId)}
                      className="self-start rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel)] px-3 py-1.5 text-[11px] font-bold text-[var(--text-secondary)] transition-all hover:bg-[var(--surface-hover)]"
                      aria-expanded={isHistoryExpanded}
                    >
                      {isHistoryExpanded
                        ? (language === 'ar' ? 'إخفاء التفاصيل' : 'Hide details')
                        : (language === 'ar' ? 'عرض التفاصيل' : 'Show details')}
                    </button>

                    {isHistoryExpanded && (
                    <>
                    {(entry.integrity || entry.evidence) && (
                      <div className="grid gap-2 border-t border-[var(--border-soft)] pt-2.5 sm:grid-cols-3">
                        {entry.integrity?.healthScore !== undefined && (
                          <div className="flex items-center gap-2 rounded-lg bg-[var(--surface-panel)] p-2 text-xs">
                            <span className="text-[var(--text-muted)]">
                              {language === 'ar' ? 'صحة الشجرة:' : 'Health:'}
                            </span>
                            <span className="font-bold text-[var(--text-main)]">{entry.integrity.healthScore}%</span>
                          </div>
                        )}
                        {entry.evidence?.citationCoverage !== undefined && (
                          <div className="flex items-center gap-2 rounded-lg bg-[var(--surface-panel)] p-2 text-xs">
                            <span className="text-[var(--text-muted)]">
                              {language === 'ar' ? 'تغطية المراجع:' : 'Citations:'}
                            </span>
                            <span className="font-bold text-[var(--text-main)]">
                              {Math.round(entry.evidence.citationCoverage * 100)}%
                            </span>
                          </div>
                        )}
                        {entry.integrity?.issueCount !== undefined && (
                          <div className="flex items-center gap-2 rounded-lg bg-[var(--surface-panel)] p-2 text-xs">
                            <span className="text-[var(--text-muted)]">
                              {language === 'ar' ? 'المشاكل المعلقة:' : 'Issues:'}
                            </span>
                            <span className={`font-bold ${entry.integrity.issueCount > 0 ? 'text-amber-600' : 'text-[var(--text-main)]'}`}>
                              {entry.integrity.issueCount}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {entry.manuscript && (
                      <div className="border-t border-[var(--border-soft)] pt-2 text-[11px] text-[var(--text-secondary)]">
                        <div className="font-semibold text-[var(--text-main)] mb-1">
                          {language === 'ar' ? 'إعدادات التصدير:' : 'Export Configuration:'}
                        </div>
                        <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
                          <div>
                            <span className="text-[var(--text-muted)]">
                              {language === 'ar' ? 'العمق:' : 'Depth:'}{' '}
                            </span>
                            <span>
                              {entry.manuscript.generationsDepth === 'all'
                                ? (language === 'ar' ? 'كل الفروع' : 'All generations')
                                : (language === 'ar' ? `${entry.manuscript.generationsDepth} أجيال` : `${entry.manuscript.generationsDepth} gens`)}
                            </span>
                          </div>
                          <div>
                            <span className="text-[var(--text-muted)]">
                              {language === 'ar' ? 'الترتيب:' : 'Ordering:'}{' '}
                            </span>
                            <span>
                              {entry.manuscript.orderingStrategy === 'narrative'
                                ? (language === 'ar' ? 'سردي (مسار العائلة)' : 'Family path')
                                : entry.manuscript.orderingStrategy === 'chronological'
                                  ? (language === 'ar' ? 'زمني' : 'Chronological')
                                  : (language === 'ar' ? 'أبجدي' : 'Alphabetical')}
                            </span>
                          </div>
                          {entry.manuscript.orderedPersonCount !== undefined && (
                            <div>
                              <span className="text-[var(--text-muted)]">
                                {language === 'ar' ? 'الأشخاص المدرجون:' : 'Included people:'}{' '}
                              </span>
                              <span>{entry.manuscript.orderedPersonCount}</span>
                            </div>
                          )}
                          <div>
                            <span className="text-[var(--text-muted)]">
                              {language === 'ar' ? 'الأقسام المدرجة:' : 'Included sections:'}{' '}
                            </span>
                            <span>
                              {[
                                entry.manuscript.includeImages ? (language === 'ar' ? 'الصور' : 'photos') : null,
                                entry.manuscript.includeTimeline ? (language === 'ar' ? 'الخط الزمني' : 'timeline') : null,
                                entry.manuscript.includeEvidence ? (language === 'ar' ? 'المراجع' : 'bibliography') : null,
                                entry.manuscript.includeNarrative ? (language === 'ar' ? 'السرد' : 'narrative') : null,
                              ].filter(Boolean).join(language === 'ar' ? '، ' : ', ') || (language === 'ar' ? 'فصول الأشخاص فقط' : 'people only')}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {hasWarnings && (
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
      )}

      {activeSection === 'cloud-backup' && (
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
      )}
    </div>
  );
};
