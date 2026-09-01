import React, { useMemo } from 'react';
import { Download, Image as ImageIcon } from 'lucide-react';

import type { ExportType } from '../../../types';
import type { TranslationSchema } from '../../../utils/translationLoader';
import { listVisualOutputDefinitionsByProduct } from '../../publishing';
import type { VisualOutputProductType } from '../../publishing';
import { VisualPublishingStudio } from './visual-studio/VisualPublishingStudio';

interface VisualOutputsSectionProps {
  active: boolean;
  mountStudio: boolean;
  language: 'ar' | 'en';
  t: TranslationSchema;
  onRunExport: (type: ExportType) => Promise<void>;
}

const TREE_SNAPSHOT_ACTIONS: Array<{
  id: Extract<ExportType, 'png' | 'pdf'>;
  labelKey: 'vaultExportPng' | 'vaultExportPdf';
}> = [
  { id: 'png', labelKey: 'vaultExportPng' },
  { id: 'pdf', labelKey: 'vaultExportPdf' },
];

function getVisualProductBadge(productType: VisualOutputProductType | undefined, language: 'ar' | 'en') {
  if (productType === 'poster') return language === 'ar' ? 'بوستر' : 'Poster';
  if (productType === 'snapshot') return language === 'ar' ? 'لقطة' : 'Snapshot';
  return '';
}

export const VisualOutputsSection: React.FC<VisualOutputsSectionProps> = ({
  active,
  mountStudio,
  language,
  t,
  onRunExport,
}) => {
  const treeSnapshotDef = useMemo(
    () =>
      listVisualOutputDefinitionsByProduct('snapshot').find(
        (definition) => definition.id === 'current-tree-snapshot'
      ),
    []
  );

  return (
    <>
      {mountStudio && (
        <div
          hidden={!active}
          aria-hidden={!active}
          className="mb-6"
          data-testid="persistent-visual-publishing-studio"
        >
          <VisualPublishingStudio language={language} previewSourceMode="store" />
        </div>
      )}

      {active && (
        <section className="relative">
          <div
            data-testid="visual-actual-export-section"
            className="border-t border-[var(--border-soft)]/60 pt-2"
          />
          <div
            className="mt-3 flex flex-col gap-3 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-3 sm:flex-row sm:items-center sm:justify-between"
            data-testid="tree-snapshot-export-card"
          >
            <div className="flex min-w-0 items-start gap-3">
              <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--surface-panel)] text-[var(--primary-600)]">
                <ImageIcon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h5 className="text-sm font-bold text-[var(--text-main)]">
                    {treeSnapshotDef?.displayName[language] ||
                      (language === 'ar' ? 'لقطات الشجرة الحالية' : 'Current Tree Snapshot')}
                  </h5>
                  <span className="rounded-full bg-[var(--primary-500)]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--primary-700)]">
                    {getVisualProductBadge(treeSnapshotDef?.productType, language)}
                  </span>
                </div>
                <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-[var(--text-muted)]">
                  {treeSnapshotDef?.description[language] ||
                    (language === 'ar'
                      ? 'تصدير لقطة عالية الدقة للمساحة المعروضة حالياً.'
                      : 'A high-fidelity export of your current workspace viewport.')}
                </p>
              </div>
            </div>
            <div className="flex w-full shrink-0 gap-2 border-t border-[var(--border-soft)] pt-3 sm:w-auto sm:border-s sm:border-t-0 sm:ps-3 sm:pt-0">
              {TREE_SNAPSHOT_ACTIONS.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => void onRunExport(action.id)}
                  className={`flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-bold transition-all active:scale-[0.98] sm:flex-none ${
                    action.id === 'pdf'
                      ? 'bg-[var(--primary-600)] text-white hover:bg-[var(--primary-700)] hover:brightness-105'
                      : 'border border-[var(--border-soft)] bg-[var(--surface-panel)] text-[var(--text-main)] hover:bg-[var(--surface-hover)]'
                  }`}
                >
                  <Download className="h-3.5 w-3.5" />
                  {t[action.labelKey] || action.id.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
};
