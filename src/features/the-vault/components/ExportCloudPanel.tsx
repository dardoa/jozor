import React, { useCallback, useEffect, useRef, useState } from 'react';

import { PUBLISHING_EXPORT_RENDERERS } from '../../../types';
import type {
  DriveFile,
  ExportType,
  PublishingExportOptions,
  PublishingPreviewResult,
} from '../../../types';
import { useAppStore } from '../../../store/useAppStore';
import type { TranslationSchema } from '../../../utils/translationLoader';
import { CloudBackupSection } from './CloudBackupSection';
import { ExportHistorySection } from './ExportHistorySection';
import { FamilyBookExportSection } from './FamilyBookExportSection';
import { PortableDataExportSection } from './PortableDataExportSection';
import { VisualOutputsSection } from './VisualOutputsSection';

export type ExportPanelSection =
  | 'family-book'
  | 'visuals'
  | 'data-export'
  | 'history'
  | 'cloud-backup';

interface ExportCloudPanelProps {
  canManageCloud: boolean;
  canExportRawData: boolean;
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
  onRunPublishingPreview?: (
    options: Pick<PublishingExportOptions, 'templateId' | 'renderer' | 'manuscriptOptions'>
  ) => Promise<PublishingPreviewResult>;
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

export const ExportCloudPanel: React.FC<ExportCloudPanelProps> = ({
  canManageCloud,
  canExportRawData,
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
  const language = useAppStore((state) => state.language);
  const [uncontrolledActiveSection, setUncontrolledActiveSection] =
    useState<ExportPanelSection>('family-book');
  const [hasOpenedVisualStudio, setHasOpenedVisualStudio] = useState(
    controlledActiveSection === 'visuals'
  );
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);
  const [isClearingHistory, setIsClearingHistory] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<number | string | null>(null);
  const activeSection = controlledActiveSection ?? uncontrolledActiveSection;
  const activeSectionTabRef = useRef<HTMLButtonElement>(null);

  const setActiveSection = useCallback(
    (section: ExportPanelSection) => {
      setConfirmClearHistory(false);
      if (section === 'visuals') setHasOpenedVisualStudio(true);
      if (controlledActiveSection === undefined) {
        setUncontrolledActiveSection(section);
      }
      onActiveSectionChange?.(section);
    },
    [controlledActiveSection, onActiveSectionChange]
  );

  useEffect(() => {
    if (typeof activeSectionTabRef.current?.scrollIntoView === 'function') {
      activeSectionTabRef.current.scrollIntoView({ block: 'nearest', inline: 'center' });
    }
  }, [activeSection]);

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

  return (
    <div className="space-y-6">
      <div className="rounded-[14px] border border-[var(--border-soft)] bg-[var(--surface-panel)] p-1 shadow-none">
        <div
          className="flex gap-1 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label={language === 'ar' ? 'أقسام التصدير' : 'Export sections'}
        >
          {EXPORT_PANEL_SECTIONS.map((section) => {
            const isActive = activeSection === section.id;
            return (
              <button
                ref={isActive ? activeSectionTabRef : undefined}
                key={section.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveSection(section.id)}
                className={`min-h-10 min-w-[8rem] shrink-0 rounded-lg px-3 py-2 text-xs font-bold transition-all lg:min-w-0 lg:flex-1 ${
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

      <FamilyBookExportSection
        active={activeSection === 'family-book'}
        language={language}
        onRunExport={handleExport}
        onRunPublishingExport={handlePublishingExport}
        onRunPublishingPreview={onRunPublishingPreview}
      />
      <VisualOutputsSection
        active={activeSection === 'visuals'}
        mountStudio={hasOpenedVisualStudio || activeSection === 'visuals'}
        language={language}
        t={t}
        onRunExport={handleExport}
      />
      <PortableDataExportSection
        active={activeSection === 'data-export'}
        canExportRawData={canExportRawData}
        language={language}
        t={t}
        onRunExport={handleExport}
      />
      <ExportHistorySection
        active={activeSection === 'history'}
        language={language}
        t={t}
        confirmClearHistory={confirmClearHistory}
        setConfirmClearHistory={setConfirmClearHistory}
        isClearingHistory={isClearingHistory}
        setIsClearingHistory={setIsClearingHistory}
        expandedHistoryId={expandedHistoryId}
        setExpandedHistoryId={setExpandedHistoryId}
      />
      <CloudBackupSection
        active={activeSection === 'cloud-backup'}
        canManageCloud={canManageCloud}
        files={files}
        t={t}
        language={language}
        onBackupNow={onBackupNow}
        onOpenActivityLog={onOpenActivityLog}
        onRefreshDriveFiles={onRefreshDriveFiles}
        onOpenDriveFile={onOpenDriveFile}
        onSaveAsNewFile={onSaveAsNewFile}
        onOverwriteDriveFile={onOverwriteDriveFile}
        onDeleteDriveFile={onDeleteDriveFile}
        hasSessionError={hasSessionError}
        isAuthorized={isAuthorized}
        onGoogleLogin={onGoogleLogin}
        currentActiveDriveFileId={currentActiveDriveFileId}
        isBackingUp={isBackingUp}
        isRefreshing={isRefreshing}
        isSaving={isSaving}
        isDeleting={isDeleting}
      />
    </div>
  );
};
