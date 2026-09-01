import React from 'react';
import { Archive, Calendar, Download, FileText } from 'lucide-react';

import type { ExportType } from '../../../types';
import type { TranslationSchema } from '../../../utils/translationLoader';

interface PortableDataExportSectionProps {
  active: boolean;
  canExportRawData: boolean;
  language: 'ar' | 'en';
  t: TranslationSchema;
  onRunExport: (type: ExportType) => Promise<void>;
}

type ExportLabelKey =
  | 'vaultExportArchive'
  | 'vaultExportJson'
  | 'vaultExportGedcom'
  | 'vaultExportCalendar';

const EXPORT_ACTIONS: Array<{
  id: ExportType;
  labelKey: ExportLabelKey;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'jozor', labelKey: 'vaultExportArchive', icon: Archive },
  { id: 'json', labelKey: 'vaultExportJson', icon: FileText },
  { id: 'gedcom', labelKey: 'vaultExportGedcom', icon: FileText },
  { id: 'ics', labelKey: 'vaultExportCalendar', icon: Calendar },
];

export const PortableDataExportSection: React.FC<PortableDataExportSectionProps> = ({
  active,
  canExportRawData,
  language,
  t,
  onRunExport,
}) => {
  if (!active) return null;

  return (
    <section>
      <h4 className="text-[16px] font-bold tracking-tight text-[var(--text-main)]">
        {language === 'ar' ? 'بيانات قابلة للنقل' : 'Portable Data'}
      </h4>
      {!canExportRawData && (
        <p
          role="status"
          className="mt-3 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-3 py-2 text-xs leading-relaxed text-[var(--text-muted)]"
        >
          {t.vaultPortableRawRestricted}
        </p>
      )}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {EXPORT_ACTIONS.filter(
          (action) => canExportRawData || (action.id !== 'jozor' && action.id !== 'json')
        ).map((action) => {
          const Icon = action.icon;
          let displayName = t[action.labelKey] || action.id;
          let badgeText = '';
          let descriptionText = '';
          let badgeStyle = '';

          if (action.id === 'jozor') {
            displayName = language === 'ar' ? 'نسخة جذور الكاملة' : 'Jozor Full Backup';
            badgeText = language === 'ar' ? 'للمالك فقط / نسخة كاملة' : 'Owner only / full backup';
            descriptionText =
              language === 'ar'
                ? 'أرشيف كامل للمالك. قد يحتوي بيانات خاماً وصوراً وملفات مشروع. ليس ملف مشاركة عام.'
                : 'Full owner archive. May contain raw project data, media, and backup files. Not a public sharing format.';
            badgeStyle = 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
          } else if (action.id === 'json') {
            displayName = language === 'ar' ? 'JSON خام للمشروع' : 'Raw Project JSON';
            badgeText =
              language === 'ar'
                ? 'تصدير خام داخلي / غير مخصص للمشاركة'
                : 'Internal raw export / not for sharing';
            descriptionText =
              language === 'ar'
                ? 'قد يحتوي بيانات داخلية وروابط وسائط وحقول مشروع خام. ليس JSON نظيفاً قابلاً للمشاركة.'
                : 'May include internal metadata, media references, and raw project fields. Not a clean portable JSON export.';
            badgeStyle = 'bg-rose-500/10 text-rose-600 dark:text-rose-400';
          } else if (action.id === 'gedcom') {
            badgeText = language === 'ar' ? 'صيغة تبادل أنساب' : 'Genealogy exchange';
            descriptionText =
              language === 'ar'
                ? 'صيغة تبادل مع برامج الأنساب. اجتازت معاينة المالك.'
                : 'Genealogy exchange format. Owner spot check passed.';
            badgeStyle = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
          } else if (action.id === 'ics') {
            badgeText = language === 'ar' ? 'أحداث بتواريخ مكتملة' : 'Complete-date events';
            descriptionText =
              language === 'ar'
                ? 'يصدر الأحداث ذات التواريخ الكاملة فقط، ويتجاهل التواريخ الجزئية مثل السنة فقط لتجنب الدقة الزائفة.'
                : 'Exports complete-date events only; partial dates such as year-only values are skipped to avoid false precision.';
            badgeStyle = 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400';
          }

          return (
            <button
              key={action.id}
              type="button"
              onClick={() => void onRunExport(action.id)}
              className="flex w-full flex-col items-start gap-2 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel)] p-3 text-start transition-all duration-200 ease-in-out hover:bg-[var(--surface-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-500)]/40"
            >
              <div className="flex w-full items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="shrink-0 rounded-lg bg-[var(--surface-subtle)] p-2 text-[var(--primary-600)]">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="truncate text-sm font-semibold text-[var(--text-main)]">{displayName}</div>
                </div>
                <Download className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" />
              </div>
              {badgeText && (
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badgeStyle}`}
                >
                  {badgeText}
                </span>
              )}
              {descriptionText && (
                <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-muted)]">{descriptionText}</p>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
};
