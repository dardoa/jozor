import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  RectangleHorizontal,
  RectangleVertical,
  SlidersHorizontal,
  XCircle,
} from 'lucide-react';
import type {
  PosterDesignState,
  ProductModeSettingsBucket,
  SharedPosterSettings,
} from '../../../publishing';
import {
  VisualOutputActionBar,
  type VisualOutputActionBarProps,
} from './VisualOutputActionBar';

interface VisualOutputPrintDockProps extends VisualOutputActionBarProps {
  state: PosterDesignState;
  onUpdatePrint: (
    updates: Partial<SharedPosterSettings> & Partial<ProductModeSettingsBucket>
  ) => void;
}

const PAGE_SIZES = ['A4', 'A3', 'A2', 'A1', 'A0'] as const;

export const VisualOutputPrintDock: React.FC<VisualOutputPrintDockProps> = ({
  state,
  onUpdatePrint,
  quality,
  ...actionBarProps
}) => {
  const isAr = actionBarProps.language === 'ar';
  const isBranchCollection = state.productMode === 'branch-collection';
  const isTiledWall = state.productMode === 'tiled-wall';
  const qualityStatus = isBranchCollection
    ? (actionBarProps.branchCollectionBlocked || !actionBarProps.branchCollectionAvailable ? 'blocked' : 'pass')
    : isTiledWall
      ? (actionBarProps.tiledWallAvailable ? 'pass' : 'blocked')
      : actionBarProps.isBlocked
        ? 'blocked'
        : (quality?.status ?? 'pass');
  const qualityLabel = qualityStatus === 'blocked'
    ? (isBranchCollection
        ? (isAr ? 'مجموعة الفروع غير جاهزة' : 'Branch collection unavailable')
        : isTiledWall
          ? (isAr ? 'اللوحة المقسمة غير جاهزة' : 'Tiled wall unavailable')
          : (isAr ? 'غير جاهز للطباعة' : 'Print blocked'))
    : qualityStatus === 'warning'
      ? (isAr ? 'راجع جودة الطباعة' : 'Review print quality')
      : isBranchCollection
        ? (isAr ? 'مجموعة الفروع جاهزة' : 'Branch collection ready')
        : isTiledWall
          ? (isAr ? 'اللوحة المقسمة جاهزة' : 'Tiled wall ready')
          : (isAr ? 'جاهز للطباعة' : 'Ready to print');
  const QualityIcon = qualityStatus === 'blocked'
    ? XCircle
    : qualityStatus === 'warning'
      ? AlertTriangle
      : CheckCircle2;

  return (
    <section
      className="max-h-[44vh] shrink-0 overflow-y-auto border-t border-[var(--border-soft)] bg-[var(--surface-panel)] px-3 py-3 sm:px-4 lg:max-h-[38vh]"
      aria-label={isAr ? 'إعدادات الطباعة والتنزيل' : 'Print and download settings'}
      data-testid="visual-studio-print-dock"
    >
      <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-wrap items-end gap-3">
          <fieldset className="min-w-0" role="group" aria-label={isAr ? 'حجم الورق' : 'Paper Size'}>
            <legend className="mb-1 text-[10px] font-semibold text-[var(--text-muted)]">
              {isAr ? 'حجم الورق' : 'Paper'}
            </legend>
            <div className="flex flex-wrap gap-1" data-testid="poster-page-size-controls">
              {PAGE_SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  aria-pressed={state.shared.size === size}
                  onClick={() => onUpdatePrint({ size })}
                  className={`min-h-8 min-w-10 rounded-md border px-2 text-[11px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-500)] ${
                    state.shared.size === size
                      ? 'border-[var(--primary-600)] bg-[var(--primary-600)] text-white'
                      : 'border-[var(--border-soft)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-main)]'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset role="group" aria-label={isAr ? 'اتجاه الورق' : 'Paper orientation'}>
            <legend className="mb-1 text-[10px] font-semibold text-[var(--text-muted)]">
              {isAr ? 'الاتجاه' : 'Orientation'}
            </legend>
            <div className="flex gap-1">
              {([
                { value: 'portrait' as const, label: isAr ? 'عمودي' : 'Portrait', Icon: RectangleVertical },
                { value: 'landscape' as const, label: isAr ? 'أفقي' : 'Landscape', Icon: RectangleHorizontal },
              ]).map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  aria-label={label}
                  title={label}
                  aria-pressed={state.shared.orientation === value}
                  onClick={() => onUpdatePrint({ orientation: value })}
                  className={`inline-flex min-h-8 min-w-9 items-center justify-center rounded-md border px-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-500)] ${
                    state.shared.orientation === value
                      ? 'border-[var(--primary-600)] bg-[var(--primary-600)] text-white'
                      : 'border-[var(--border-soft)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </button>
              ))}
            </div>
          </fieldset>

          <label className="min-w-32 text-[10px] font-semibold text-[var(--text-muted)]">
            <span className="mb-1 flex items-center gap-1">
              <SlidersHorizontal className="h-3 w-3" aria-hidden="true" />
              {isAr ? 'الهوامش' : 'Margins'}
            </span>
            <select
              aria-label={isAr ? 'هوامش الطباعة' : 'Print margins'}
              value={state.shared.marginPreset}
              onChange={(event) => onUpdatePrint({
                marginPreset: event.target.value as SharedPosterSettings['marginPreset'],
              })}
              className="min-h-8 w-full rounded-md border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-2 text-[11px] font-semibold text-[var(--text-main)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-500)]"
            >
              <option value="compact">{isAr ? 'ضيقة' : 'Compact'}</option>
              <option value="balanced">{isAr ? 'متوازنة' : 'Balanced'}</option>
              <option value="generous">{isAr ? 'واسعة' : 'Generous'}</option>
            </select>
          </label>

          {state.productMode === 'tiled-wall' && (
            <div className="flex flex-wrap items-end gap-2" data-testid="tiled-wall-grid-controls">
              {([
                {
                  key: 'tiledRows' as const,
                  label: isAr ? 'الصفوف' : 'Rows',
                  ariaLabel: isAr ? 'عدد صفوف الشبكة' : 'Grid Rows (Sheets)',
                },
                {
                  key: 'tiledColumns' as const,
                  label: isAr ? 'الأعمدة' : 'Columns',
                  ariaLabel: isAr ? 'عدد أعمدة الشبكة' : 'Grid Columns (Sheets)',
                },
              ]).map(({ key, label, ariaLabel }) => (
                <label key={key} className="text-[10px] font-semibold text-[var(--text-muted)]">
                  <span className="mb-1 block">{label}</span>
                  <select
                    aria-label={ariaLabel}
                    value={state.productBucket[key]}
                    onChange={(event) => onUpdatePrint({ [key]: Number(event.target.value) })}
                    className="min-h-8 rounded-md border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-2 text-[11px] font-semibold text-[var(--text-main)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-500)]"
                  >
                    {[2, 3, 4, 5, 6].map((value) => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                </label>
              ))}
              <label className="text-[10px] font-semibold text-[var(--text-muted)]">
                <span className="mb-1 block">{isAr ? 'ورقة التقسيم' : 'Tile paper'}</span>
                <select
                  aria-label={isAr ? 'حجم ورقة التقسيم' : 'Tile Sheet Size'}
                  value={state.productBucket.tiledSheetSize}
                  onChange={(event) => onUpdatePrint({
                    tiledSheetSize: event.target.value as ProductModeSettingsBucket['tiledSheetSize'],
                  })}
                  className="min-h-8 rounded-md border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-2 text-[11px] font-semibold text-[var(--text-main)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-500)]"
                >
                  {(['A4', 'A3', 'A2'] as const).map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </label>
              <label className="text-[10px] font-semibold text-[var(--text-muted)]">
                <span className="mb-1 block">{isAr ? 'التداخل' : 'Overlap'}</span>
                <select
                  aria-label={isAr ? 'مقدار تداخل الأوراق بالملم' : 'Tile Overlap (mm)'}
                  value={state.productBucket.tiledOverlapMm}
                  onChange={(event) => onUpdatePrint({ tiledOverlapMm: Number(event.target.value) })}
                  className="min-h-8 rounded-md border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-2 text-[11px] font-semibold text-[var(--text-main)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-500)]"
                >
                  {[6, 7, 8, 9, 10, 11, 12].map((value) => (
                    <option key={value} value={value}>{value} mm</option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {state.productMode === 'branch-collection' && (
            <label className="min-w-48 text-[10px] font-semibold text-[var(--text-muted)]">
              <span className="mb-1 block">{isAr ? 'عنوان فهرس الفروع' : 'Branch index title'}</span>
              <input
                type="text"
                aria-label={isAr ? 'عنوان فهرس مجموعة الفروع' : 'Branch Collection Index Title'}
                value={state.productBucket.branchCollectionIndexTitle}
                onChange={(event) => onUpdatePrint({ branchCollectionIndexTitle: event.target.value })}
                placeholder={isAr ? 'عنوان اللوحة افتراضيًا' : 'Uses the poster title by default'}
                maxLength={80}
                className="min-h-8 w-full rounded-md border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-2 text-[11px] font-semibold text-[var(--text-main)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-500)]"
              />
            </label>
          )}

        </div>

        <div
          className={`inline-flex min-h-9 shrink-0 items-center gap-2 self-start rounded-md border px-3 text-[11px] font-bold xl:self-end ${
            qualityStatus === 'blocked'
              ? 'border-red-300 bg-red-50 text-red-800'
              : qualityStatus === 'warning'
                ? 'border-amber-300 bg-amber-50 text-amber-800'
                : 'border-emerald-300 bg-emerald-50 text-emerald-800'
          }`}
          role="status"
          data-testid="poster-print-readiness-summary"
        >
          <QualityIcon className="h-4 w-4" aria-hidden="true" />
          {qualityLabel}
        </div>
      </div>

      <VisualOutputActionBar
        quality={quality}
        outputMode={state.productMode}
        {...actionBarProps}
      />
    </section>
  );
};
