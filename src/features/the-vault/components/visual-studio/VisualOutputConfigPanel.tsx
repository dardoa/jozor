import React from 'react';
import { Check, RotateCcw } from 'lucide-react';
import {
  findTiledWallPosterGridRecommendation,
  type PosterPhotoShape,
  type PosterColorOverrides,
  type TiledWallPosterPlan,
  type VisualOutputDefinition,
} from '../../../publishing';
import { getVisualStudioPosterColorDefaults } from './visualStudioPosterOptions';
import type {
  VisualStudioPosterDepth,
  VisualStudioPosterCardScale,
  VisualStudioPosterCardEffect,
  VisualStudioPosterCardFrame,
  VisualStudioPosterCardCorner,
  VisualStudioPosterCardLayout,
  VisualStudioPosterPageFrame,
  VisualStudioPosterHeader,
  VisualStudioPosterConnectorPath,
  VisualStudioPosterDecoration,
  VisualStudioPosterOrnament,
  VisualStudioPosterDirection,
  VisualStudioPosterOptions,
  VisualStudioPosterOrientation,
  VisualStudioPosterMargin,
  VisualStudioPosterSpacing,
  VisualStudioPosterPalette,
  VisualStudioPosterRootOption,
  VisualStudioPosterScope,
  VisualStudioPosterSize,
  VisualStudioPosterTypography,
  VisualStudioPosterFontFamily,
  VisualStudioTiledSheetSize,
} from './visualStudioPosterOptions';

interface VisualOutputConfigPanelProps {
  language: 'ar' | 'en';
  definitions?: VisualOutputDefinition[];
  selectedDefinitionId?: string;
  selectedDefinition?: VisualOutputDefinition;
  onSelectDefinition?: (id: string) => void;
  posterOptions?: VisualStudioPosterOptions;
  onPosterOptionsChange?: (options: VisualStudioPosterOptions) => void;
  posterRootOptions?: readonly VisualStudioPosterRootOption[];
  selectedPosterRootToken?: string;
  onSelectPosterRoot?: (token: string) => void;
  posterTitle?: string;
  posterSubtitle?: string;
  onPosterTitleChange?: (value: string) => void;
  onPosterSubtitleChange?: (value: string) => void;
  tiledWallPlan?: TiledWallPosterPlan;
}

const ar = {
  selectTemplate: 'اختر نوع المخرج',
  posterSettings: 'إعدادات البوستر',
  generations: 'الأجيال',
  pageSize: 'حجم الصفحة',
  orientation: 'اتجاه الصفحة',
  treeDirection: 'اتجاه الشجرة',
  verticalTree: 'رأسي',
  horizontalTree: 'أفقي',
  portrait: 'عمودي',
  landscape: 'أفقي',
  printMargins: 'هوامش الطباعة',
  compactMargins: 'مدمجة',
  balancedMargins: 'متوازنة',
  generousMargins: 'واسعة',
  treeSpacing: 'كثافة توزيع الشجرة',
  styleDefaultSpacing: 'حسب التصميم',
  compactSpacing: 'مدمجة',
  balancedSpacing: 'متوازنة',
  airySpacing: 'رحبة',
  maskLiving: 'إخفاء الأحياء والأشخاص الخاصين',
  showPhotos: 'عرض صور الأشخاص',
  hideLivingPhotos: 'إخفاء صور الأحياء',
  photoShape: 'شكل الصورة',
  circularPhoto: 'دائرية',
  squarePhoto: 'مربعة',
  roundedPhoto: 'حواف ناعمة',
  cardLayout: 'تخطيط محتوى البطاقة',
  styleDefaultCardLayout: 'حسب التصميم',
  standardCardLayout: 'قياسي',
  photoFocusedCardLayout: 'إبراز الصورة',
  textMinimalCardLayout: 'نصي مختصر',
  cardContent: 'محتوى البطاقة',
  showYears: 'عرض سنوات الميلاد والوفاة',
  showRelationship: 'عرض صلة الشخص بالشجرة',
  showBirthPlace: 'عرض مكان الميلاد',
  showOccupation: 'عرض المهنة',
  showDescription: 'عرض السطر الوصفي المختصر',
  connectorStyle: 'أسلوب خطوط العلاقات',
  subtleConnectors: 'ناعم',
  classicConnectors: 'كلاسيكي',
  boldConnectors: 'بارز',
  colorPalette: 'لوحة الألوان',
  styleDefaultPalette: 'حسب التصميم',
  heritageWarmPalette: 'تراثي دافئ',
  evergreenPalette: 'أخضر عائلي',
  monochromePalette: 'أحادي للطباعة',
  customizeColors: 'تخصيص ألوان اللوحة',
  posterBackground: 'خلفية اللوحة',
  cardBackground: 'لون البطاقات',
  accentColor: 'لون الإبراز والإطار',
  connectorColor: 'لون خطوط العلاقات',
  resetColors: 'استعادة ألوان اللوحة',
  backgroundTreatment: 'معالجة الخلفية',
  styleDefaultDecoration: 'حسب التصميم',
  cleanDecoration: 'نظيفة',
  paperDecoration: 'ورق تراثي',
  gridDecoration: 'شبكة نسب هادئة',
  posterOrnament: 'زخرفة اللوحة',
  styleDefaultOrnament: 'حسب التصميم',
  noOrnament: 'بدون زخرفة',
  lineageMedallionOrnament: 'ميدالية نسب',
  galleryMarksOrnament: 'علامات معرض عصري',
  cornerBranchesOrnament: 'أغصان ركنية',
  typographyDensity: 'كثافة الكتابة',
  balancedTypography: 'متوازنة',
  prominentTypography: 'أسماء أوضح',
  compactTypography: 'مضغوطة',
  posterFont: 'خط البوستر',
  styleDefaultFont: 'حسب التصميم',
  amiriFont: 'أميري التراثي',
  notoSansArabicFont: 'نوتو سانس العربي',
  notoKufiArabicFont: 'نوتو كوفي العربي',
  cardSize: 'حجم بطاقة الشخص',
  compactCard: 'صغيرة',
  standardCard: 'قياسية',
  largeCard: 'كبيرة',
  cardEffect: 'عمق البطاقة',
  styleDefaultCardEffect: 'حسب التصميم',
  flatCardEffect: 'مسطحة',
  softCardEffect: 'ظل ناعم',
  elevatedCardEffect: 'بارزة',
  cardFrame: 'إطار البطاقة',
  styleDefaultCardFrame: 'حسب التصميم',
  minimalCardFrame: 'بسيط',
  classicCardFrame: 'كلاسيكي',
  ornateCardFrame: 'مزخرف بخفة',
  cardCorner: 'زوايا البطاقة',
  styleDefaultCardCorner: 'حسب التصميم',
  squareCardCorner: 'حادة',
  softCardCorner: 'ناعمة',
  roundedCardCorner: 'مستديرة',
  pageFrame: 'إطار اللوحة',
  styleDefaultPageFrame: 'حسب التصميم',
  noPageFrame: 'بدون إطار',
  minimalPageFrame: 'بسيط',
  heritagePageFrame: 'تراثي',
  galleryPageFrame: 'معرض عصري',
  headerComposition: 'تكوين عنوان اللوحة',
  styleDefaultHeader: 'حسب التصميم',
  ceremonialHeader: 'احتفالي',
  galleryRailHeader: 'شريط معرض',
  registryHeader: 'سجل مكثف',
  connectorPath: 'مسار خطوط الأجيال',
  styleDefaultConnectorPath: 'حسب التصميم',
  straightConnectorPath: 'مستقيم',
  orthogonalConnectorPath: 'زوايا متدرجة',
  curvedConnectorPath: 'منحني',
  posterRoot: 'جذر البوستر',
  posterTitle: 'عنوان البوستر',
  posterSubtitle: 'الوصف المختصر',
  footerText: 'عبارة التذييل',
  showJozorAttribution: 'إظهار عبارة «أُنشئت في جذور»',
  allGenerations: 'الكل',
  treeScope: 'نطاق الشجرة',
  ancestors: 'الأسلاف',
  descendants: 'الأحفاد',
  fullTree: 'الشجرة الكاملة',
  treeAnchor: 'نقطة ارتكاز العرض',
  wallPoster: 'اللوحة الجدارية المقسمة',
  rows: 'الصفوف',
  columns: 'الأعمدة',
  sheetSize: 'حجم ورقة الطباعة',
  overlap: 'التداخل',
  sheets: 'ورقة',
  finalSize: 'الحجم النهائي',
  minimumText: 'أصغر نص متوقع',
  printReady: 'مناسب للطباعة',
  increaseGrid: 'زد عدد الصفوف أو الأعمدة لتحسين وضوح النص.',
};

const FOCUS_RING_CLASSES = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-500)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--surface-panel)]';

export const VisualOutputConfigPanel: React.FC<VisualOutputConfigPanelProps> = ({
  language,
  definitions = [],
  selectedDefinitionId,
  selectedDefinition,
  onSelectDefinition,
  posterOptions,
  onPosterOptionsChange,
  posterRootOptions = [],
  selectedPosterRootToken,
  onSelectPosterRoot,
  posterTitle = '',
  posterSubtitle = '',
  onPosterTitleChange,
  onPosterSubtitleChange,
  tiledWallPlan,
}) => {
  const isAr = language === 'ar';
  const isPoster = selectedDefinition?.productType === 'poster';
  const tiledWallRecommendation = React.useMemo(
    () => tiledWallPlan ? findTiledWallPosterGridRecommendation(tiledWallPlan) : undefined,
    [tiledWallPlan]
  );

  const updatePosterOptions = (changes: Partial<VisualStudioPosterOptions>) => {
    if (!posterOptions) return;
    onPosterOptionsChange?.({ ...posterOptions, ...changes });
  };

  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel)] p-3 text-start"
      data-testid="visual-studio-config-panel"
    >
      <fieldset
        role="group"
        aria-label={isAr ? ar.selectTemplate : 'Choose output type'}
        className="min-w-0 flex flex-col gap-2 border-0 p-0 m-0"
        data-testid="visual-studio-template-group"
      >
        <legend className="w-full text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)] border-b border-[var(--border-soft)]/60 pb-1.5 mb-1">
          {isAr ? ar.selectTemplate : 'Choose output type'}
        </legend>
        <div className="flex flex-col gap-1.5" data-testid="visual-studio-template-selectors">
          {definitions.map((def) => {
            const isSelected = def.id === selectedDefinitionId;
            return (
              <button
                key={def.id}
                type="button"
                aria-pressed={isSelected}
                aria-label={def.displayName[language]}
                onClick={() => onSelectDefinition?.(def.id)}
                className={`w-full text-start px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${FOCUS_RING_CLASSES} ${
                  isSelected
                    ? 'border-[var(--primary-500)] bg-[var(--primary-500)]/5 text-[var(--primary-600)] shadow-sm'
                    : 'border-[var(--border-soft)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-soft)]/80'
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span>{def.displayName[language]}</span>
                  {def.status === 'experimental' && (
                    <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[8px] font-bold text-amber-800">
                      {isAr ? 'قيد المراجعة' : 'In review'}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {isPoster && posterOptions && (
        <div className="flex flex-col gap-2.5 border-t border-[var(--border-soft)]/60 pt-3" data-testid="visual-studio-poster-settings">
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)] mb-1">
            {isAr ? ar.posterSettings : 'Poster settings'}
          </div>

          <fieldset
            role="group"
            aria-label={isAr ? ar.treeScope : 'Tree scope'}
            className="min-w-0 flex flex-col gap-1.5 border-0 p-0 m-0"
            data-testid="poster-scope-group"
          >
            <legend className="text-[10px] font-semibold text-[var(--text-muted)]">
              {isAr ? ar.treeScope : 'Tree scope'}
            </legend>
            <div className="grid grid-cols-3 gap-1" data-testid="poster-scope-control">
              {(['ancestors', 'descendants', 'full-tree'] as VisualStudioPosterScope[]).map((scope) => (
                <button
                  key={scope}
                  type="button"
                  aria-pressed={posterOptions.scope === scope}
                  aria-label={scope === 'ancestors'
                    ? (isAr ? ar.ancestors : 'Ancestors')
                    : scope === 'descendants'
                      ? (isAr ? ar.descendants : 'Descendants')
                      : (isAr ? ar.fullTree : 'Full tree')}
                  onClick={() => updatePosterOptions({ scope })}
                  className={`min-h-8 rounded-lg border px-2 text-[10px] font-bold transition-colors ${FOCUS_RING_CLASSES} ${
                    posterOptions.scope === scope
                      ? 'border-[var(--primary-500)] bg-[var(--primary-500)]/10 text-[var(--primary-700)]'
                      : 'border-[var(--border-soft)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                  }`}
                >
                  {scope === 'ancestors'
                    ? (isAr ? ar.ancestors : 'Ancestors')
                    : scope === 'descendants'
                      ? (isAr ? ar.descendants : 'Descendants')
                      : (isAr ? ar.fullTree : 'Full tree')}
                </button>
              ))}
            </div>
          </fieldset>

          {posterOptions.scope === 'full-tree' && (
            <div className="flex flex-col gap-2 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-2.5" data-testid="tiled-wall-poster-settings">
              <span className="text-[10px] font-bold text-[var(--text-main)]">
                {isAr ? ar.wallPoster : 'Tiled wall poster'}
              </span>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1 text-[9px] font-semibold text-[var(--text-muted)]">
                  {isAr ? ar.rows : 'Rows'}
                  <select
                    aria-label={isAr ? ar.rows : 'Tile rows'}
                    value={posterOptions.tiledRows}
                    onChange={(event) => updatePosterOptions({ tiledRows: Number(event.target.value) })}
                    className={`min-h-8 rounded-md border border-[var(--border-soft)] bg-[var(--surface-panel)] px-2 text-[10px] text-[var(--text-main)] ${FOCUS_RING_CLASSES}`}
                  >
                    {[2, 3, 4, 5, 6].map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-[9px] font-semibold text-[var(--text-muted)]">
                  {isAr ? ar.columns : 'Columns'}
                  <select
                    aria-label={isAr ? ar.columns : 'Tile columns'}
                    value={posterOptions.tiledColumns}
                    onChange={(event) => updatePosterOptions({ tiledColumns: Number(event.target.value) })}
                    className={`min-h-8 rounded-md border border-[var(--border-soft)] bg-[var(--surface-panel)] px-2 text-[10px] text-[var(--text-main)] ${FOCUS_RING_CLASSES}`}
                  >
                    {[2, 3, 4, 5, 6].map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1 text-[9px] font-semibold text-[var(--text-muted)]">
                  {isAr ? ar.sheetSize : 'Sheet size'}
                  <select
                    aria-label={isAr ? ar.sheetSize : 'Tile sheet size'}
                    value={posterOptions.tiledSheetSize}
                    onChange={(event) => updatePosterOptions({ tiledSheetSize: event.target.value as VisualStudioTiledSheetSize })}
                    className={`min-h-8 rounded-md border border-[var(--border-soft)] bg-[var(--surface-panel)] px-2 text-[10px] text-[var(--text-main)] ${FOCUS_RING_CLASSES}`}
                  >
                    <option value="A4">A4</option>
                    <option value="A3">A3</option>
                    <option value="A2">A2</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-[9px] font-semibold text-[var(--text-muted)]">
                  {isAr ? ar.overlap : 'Overlap'}
                  <select
                    aria-label={isAr ? ar.overlap : 'Tile overlap'}
                    value={posterOptions.tiledOverlapMm}
                    onChange={(event) => updatePosterOptions({ tiledOverlapMm: Number(event.target.value) })}
                    className={`min-h-8 rounded-md border border-[var(--border-soft)] bg-[var(--surface-panel)] px-2 text-[10px] text-[var(--text-main)] ${FOCUS_RING_CLASSES}`}
                  >
                    {[6, 8, 10, 12].map((value) => <option key={value} value={value}>{value} mm</option>)}
                  </select>
                </label>
              </div>
              {tiledWallPlan && (
                <div className="flex flex-col gap-1.5">
                  <div
                    className={`rounded-md border px-2 py-1.5 text-[9px] font-semibold leading-relaxed ${
                      tiledWallPlan.quality.status === 'pass'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        : tiledWallPlan.quality.status === 'warning'
                          ? 'border-amber-200 bg-amber-50 text-amber-800'
                          : 'border-red-200 bg-red-50 text-red-800'
                    }`}
                    data-testid="tiled-wall-quality-summary"
                  >
                    <div>
                      {tiledWallPlan.tiles.length} {isAr ? ar.sheets : 'sheets'}
                      {' \u00b7 '}
                      {isAr ? ar.finalSize : 'Final size'}: {(tiledWallPlan.assembledPhysicalSizeMm.width / 10).toFixed(1)}{' \u00d7 '}{(tiledWallPlan.assembledPhysicalSizeMm.height / 10).toFixed(1)} cm
                    </div>
                    <div>
                      {isAr ? ar.minimumText : 'Estimated smallest text'}: {tiledWallPlan.quality.metrics.minimumFontSizePt?.toFixed(1)} pt
                      {' \u00b7 '}
                      {tiledWallPlan.quality.status === 'pass'
                        ? (isAr ? ar.printReady : 'Print readable')
                        : (isAr ? ar.increaseGrid : 'Increase rows or columns for clearer text.')}
                    </div>
                  </div>
                  {tiledWallPlan.utilization.decorativeOnlyEdgeSheetCount > 0 && (
                    <div
                      className="flex flex-col gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[9px] font-medium leading-relaxed text-amber-900"
                      data-testid="tiled-wall-utilization-note"
                    >
                      <p>
                        {isAr
                          ? `${tiledWallPlan.utilization.decorativeOnlyEdgeSheetCount} من أوراق الحواف تحمل العنوان أو الإطار فقط.${tiledWallRecommendation ? ` اقتراح أقل تكلفة: ${tiledWallRecommendation.rows} صفوف × ${tiledWallRecommendation.columns} أعمدة (${tiledWallRecommendation.sheetCount} ورقة، نص متوقع ${tiledWallRecommendation.minimumFontSizePt.toFixed(1)} pt).` : ' راجع توزيع الصفوف والأعمدة إذا أردت تقليل تكلفة الطباعة.'}`
                          : `${tiledWallPlan.utilization.decorativeOnlyEdgeSheetCount} edge sheets carry only the title or frame.${tiledWallRecommendation ? ` Lower-cost option: ${tiledWallRecommendation.rows} rows x ${tiledWallRecommendation.columns} columns (${tiledWallRecommendation.sheetCount} sheets, estimated text ${tiledWallRecommendation.minimumFontSizePt.toFixed(1)} pt).` : ' Review the grid if you want to reduce print cost.'}`}
                      </p>
                      {tiledWallRecommendation && (
                        <button
                          type="button"
                          onClick={() => updatePosterOptions({
                            tiledRows: tiledWallRecommendation.rows,
                            tiledColumns: tiledWallRecommendation.columns,
                          })}
                          className={`inline-flex min-h-7 w-fit items-center gap-1 rounded-md border border-amber-300 bg-white px-2 font-semibold text-amber-950 transition-colors hover:bg-amber-100 ${FOCUS_RING_CLASSES}`}
                        >
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                          {isAr ? 'تطبيق الاقتراح' : 'Apply lower-cost grid'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <label className="flex flex-col gap-1.5 text-[10px] font-semibold text-[var(--text-muted)]">
            {posterOptions.scope === 'full-tree'
              ? (isAr ? ar.treeAnchor : 'Layout anchor')
              : (isAr ? ar.posterRoot : 'Poster root')}
            <select
              aria-label={posterOptions.scope === 'full-tree'
                ? (isAr ? ar.treeAnchor : 'Layout anchor')
                : (isAr ? ar.posterRoot : 'Poster root')}
              value={selectedPosterRootToken ?? ''}
              onChange={(event) => onSelectPosterRoot?.(event.target.value)}
              className={`min-h-9 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-2 text-xs font-semibold text-[var(--text-main)] ${FOCUS_RING_CLASSES}`}
            >
              {posterRootOptions.map((option) => (
                <option key={option.token} value={option.token}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 text-[10px] font-semibold text-[var(--text-muted)]">
            {isAr ? ar.posterTitle : 'Poster title'}
            <input
              type="text"
              aria-label={isAr ? ar.posterTitle : 'Poster title'}
              value={posterTitle}
              maxLength={60}
              onChange={(event) => onPosterTitleChange?.(event.target.value)}
              className={`min-h-9 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-2 text-xs font-semibold text-[var(--text-main)] ${FOCUS_RING_CLASSES}`}
            />
          </label>

          <label className="flex flex-col gap-1.5 text-[10px] font-semibold text-[var(--text-muted)]">
            {isAr ? ar.posterSubtitle : 'Short description'}
            <input
              type="text"
              aria-label={isAr ? ar.posterSubtitle : 'Short description'}
              value={posterSubtitle}
              maxLength={100}
              onChange={(event) => onPosterSubtitleChange?.(event.target.value)}
              className={`min-h-9 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-2 text-xs font-medium text-[var(--text-main)] ${FOCUS_RING_CLASSES}`}
            />
          </label>

          <div className="flex flex-col gap-2 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-2" data-testid="poster-header-controls">
            <span className="text-[10px] font-bold text-[var(--text-muted)]">
              {isAr ? ar.headerComposition : 'Poster title composition'}
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {([
                ['style-default', isAr ? ar.styleDefaultHeader : 'Style default'],
                ['ceremonial', isAr ? ar.ceremonialHeader : 'Ceremonial'],
                ['gallery-rail', isAr ? ar.galleryRailHeader : 'Gallery rail'],
                ['registry', isAr ? ar.registryHeader : 'Compact registry'],
              ] as readonly [VisualStudioPosterHeader, string][]).map(([header, label]) => (
                <button
                  key={header}
                  type="button"
                  aria-pressed={posterOptions.header === header}
                  onClick={() => updatePosterOptions({ header })}
                  className={`min-h-9 rounded-md border px-1.5 py-1 text-start text-[9px] font-bold ${FOCUS_RING_CLASSES} ${posterOptions.header === header
                    ? 'border-[var(--primary-500)] bg-[var(--surface-panel)] text-[var(--primary-700)]'
                    : 'border-[var(--border-soft)] bg-transparent text-[var(--text-secondary)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex flex-col gap-1.5 text-[10px] font-semibold text-[var(--text-muted)]">
            {isAr ? ar.footerText : 'Footer phrase'}
            <input
              type="text"
              aria-label={isAr ? ar.footerText : 'Footer phrase'}
              value={posterOptions.footerText}
              maxLength={80}
              onChange={(event) => updatePosterOptions({ footerText: event.target.value })}
              placeholder={isAr ? '\u0630\u0627\u0643\u0631\u0629 \u0627\u0644\u0639\u0627\u0626\u0644\u0629 \u062a\u062c\u0645\u0639\u0646\u0627' : 'A short family phrase'}
              className={`min-h-9 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-2 text-xs font-medium text-[var(--text-main)] ${FOCUS_RING_CLASSES}`}
            />
          </label>

          <label className="flex cursor-pointer items-start gap-2 text-[10px] font-semibold leading-relaxed text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={posterOptions.showJozorAttribution}
              onChange={(event) => updatePosterOptions({ showJozorAttribution: event.target.checked })}
              className={`mt-0.5 h-4 w-4 accent-[var(--primary-600)] ${FOCUS_RING_CLASSES}`}
            />
            <span>{isAr ? ar.showJozorAttribution : 'Show “Created in Jozor”'}</span>
          </label>

          {posterOptions.scope !== 'full-tree' && (
            <fieldset
              role="group"
              aria-label={isAr ? ar.generations : 'Generations'}
              className="min-w-0 flex flex-col gap-1.5 border-0 p-0 m-0"
              data-testid="poster-depth-group"
            >
              <legend className="text-[10px] font-semibold text-[var(--text-muted)]">
                {isAr ? ar.generations : 'Generations'}
              </legend>
              <div className="grid grid-cols-5 gap-1" data-testid="poster-depth-control">
                {([1, 2, 3, 4, 'all'] as VisualStudioPosterDepth[]).map((depth) => (
                  <button
                    key={depth}
                    type="button"
                    aria-pressed={posterOptions.generationDepth === depth}
                    onClick={() => updatePosterOptions({ generationDepth: depth })}
                    className={`min-h-8 rounded-lg border px-2 text-[11px] font-bold transition-colors ${FOCUS_RING_CLASSES} ${
                      posterOptions.generationDepth === depth
                        ? 'border-[var(--primary-500)] bg-[var(--primary-500)]/10 text-[var(--primary-700)]'
                        : 'border-[var(--border-soft)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                    }`}
                  >
                    {depth === 'all' ? (isAr ? ar.allGenerations : 'All') : depth}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          <fieldset
            role="group"
            aria-label={isAr ? ar.treeDirection : 'Tree direction'}
            className="min-w-0 flex flex-col gap-1.5 border-0 p-0 m-0"
            data-testid="poster-direction-group"
          >
            <legend className="text-[10px] font-semibold text-[var(--text-muted)]">
              {isAr ? ar.treeDirection : 'Tree direction'}
            </legend>
            <div className="grid grid-cols-2 gap-1" data-testid="poster-direction-control">
              {(['vertical', 'horizontal'] as VisualStudioPosterDirection[]).map((direction) => (
                <button
                  key={direction}
                  type="button"
                  aria-pressed={posterOptions.direction === direction}
                  onClick={() => updatePosterOptions({ direction })}
                  className={`min-h-8 rounded-lg border px-2 text-[10px] font-bold transition-colors ${FOCUS_RING_CLASSES} ${
                    posterOptions.direction === direction
                      ? 'border-[var(--primary-500)] bg-[var(--primary-500)]/10 text-[var(--primary-700)]'
                      : 'border-[var(--border-soft)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                  }`}
                >
                  {direction === 'vertical'
                    ? (isAr ? ar.verticalTree : 'Vertical')
                    : (isAr ? ar.horizontalTree : 'Horizontal')}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset
            role="group"
            aria-label={isAr ? 'حجم الصفحة والاتجاه' : 'Page size and orientation'}
            className="min-w-0 flex flex-col gap-2 border-0 p-0 m-0"
            data-testid="poster-size-orientation-group"
          >
            <legend className="text-[10px] font-semibold text-[var(--text-muted)]">
              {isAr ? 'حجم الصفحة والاتجاه' : 'Page size and orientation'}
            </legend>
            <label className="flex flex-col gap-1 text-[10px] font-semibold text-[var(--text-muted)]">
              {isAr ? ar.pageSize : 'Page size'}
              <select
                aria-label={isAr ? ar.pageSize : 'Page size'}
                value={posterOptions.size}
                onChange={(event) => updatePosterOptions({ size: event.target.value as VisualStudioPosterSize })}
                className={`min-h-9 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-2 text-xs font-semibold text-[var(--text-main)] ${FOCUS_RING_CLASSES}`}
              >
                <option value="A4">A4</option>
                <option value="A3">A3</option>
                <option value="A2">A2</option>
                <option value="A1">A1</option>
                <option value="A0">A0</option>
              </select>
            </label>

            <div className="flex flex-col gap-1" data-testid="poster-orientation-control">
              <span className="text-[10px] font-semibold text-[var(--text-muted)]">
                {isAr ? ar.orientation : 'Orientation'}
              </span>
              <div className="grid grid-cols-2 gap-1">
                {(['portrait', 'landscape'] as VisualStudioPosterOrientation[]).map((orientation) => (
                  <button
                    key={orientation}
                    type="button"
                    aria-pressed={posterOptions.orientation === orientation}
                    onClick={() => updatePosterOptions({ orientation })}
                    className={`min-h-8 rounded-lg border px-2 text-[10px] font-bold transition-colors ${FOCUS_RING_CLASSES} ${
                      posterOptions.orientation === orientation
                        ? 'border-[var(--primary-500)] bg-[var(--primary-500)]/10 text-[var(--primary-700)]'
                        : 'border-[var(--border-soft)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                    }`}
                  >
                    {orientation === 'portrait'
                      ? (isAr ? ar.portrait : 'Portrait')
                      : (isAr ? ar.landscape : 'Landscape')}
                  </button>
                ))}
              </div>
            </div>
          </fieldset>

          <fieldset
            role="group"
            aria-label={isAr ? 'الهوامش والكثافة' : 'Margins and spacing'}
            className="min-w-0 flex flex-col gap-2 border-0 p-0 m-0"
            data-testid="poster-margins-spacing-group"
          >
            <legend className="text-[10px] font-semibold text-[var(--text-muted)]">
              {isAr ? 'الهوامش والكثافة' : 'Margins and spacing'}
            </legend>
            <div className="flex flex-col gap-1" data-testid="poster-margin-controls">
              <span className="text-[10px] font-semibold text-[var(--text-muted)]">
                {isAr ? ar.printMargins : 'Print margins'}
              </span>
              <div className="grid grid-cols-3 gap-1">
                {(['compact', 'balanced', 'generous'] as VisualStudioPosterMargin[]).map((marginPreset) => (
                  <button
                    key={marginPreset}
                    type="button"
                    aria-pressed={posterOptions.marginPreset === marginPreset}
                    onClick={() => updatePosterOptions({ marginPreset })}
                    className={`min-h-8 rounded-lg border px-1 text-[9px] font-bold transition-colors ${FOCUS_RING_CLASSES} ${
                      posterOptions.marginPreset === marginPreset
                        ? 'border-[var(--primary-500)] bg-[var(--primary-500)]/10 text-[var(--primary-700)]'
                        : 'border-[var(--border-soft)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                    }`}
                  >
                    {marginPreset === 'compact'
                      ? (isAr ? ar.compactMargins : 'Compact')
                      : marginPreset === 'generous'
                        ? (isAr ? ar.generousMargins : 'Generous')
                        : (isAr ? ar.balancedMargins : 'Balanced')}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1" data-testid="poster-spacing-controls">
              <span className="text-[10px] font-semibold text-[var(--text-muted)]">
                {isAr ? ar.treeSpacing : 'Tree spacing density'}
              </span>
              <div className="grid grid-cols-2 gap-1">
                {([
                  ['style-default', isAr ? ar.styleDefaultSpacing : 'Style default'],
                  ['compact', isAr ? ar.compactSpacing : 'Compact'],
                  ['balanced', isAr ? ar.balancedSpacing : 'Balanced'],
                  ['airy', isAr ? ar.airySpacing : 'Airy'],
                ] as readonly [VisualStudioPosterSpacing, string][]).map(([spacing, label]) => (
                  <button
                    key={spacing}
                    type="button"
                    aria-pressed={posterOptions.spacing === spacing}
                    onClick={() => updatePosterOptions({ spacing })}
                    className={`min-h-8 rounded-lg border px-1 text-[9px] font-bold transition-colors ${FOCUS_RING_CLASSES} ${
                      posterOptions.spacing === spacing
                        ? 'border-[var(--primary-500)] bg-[var(--primary-500)]/10 text-[var(--primary-700)]'
                        : 'border-[var(--border-soft)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </fieldset>

          <fieldset
            role="group"
            aria-label={isAr ? 'الخصوصية والصور' : 'Privacy and photos'}
            className="min-w-0 flex flex-col gap-2 border-0 p-0 m-0"
            data-testid="poster-privacy-photos-group"
          >
            <legend className="text-[10px] font-semibold text-[var(--text-muted)]">
              {isAr ? 'الخصوصية والصور' : 'Privacy and photos'}
            </legend>
            <label className="flex cursor-pointer items-start gap-2 text-[10px] font-semibold leading-relaxed text-[var(--text-secondary)]">
              <input
                type="checkbox"
                checked={posterOptions.privacyMode === 'masked'}
                onChange={(event) => updatePosterOptions({ privacyMode: event.target.checked ? 'masked' : 'owner-full' })}
                className={`mt-0.5 h-4 w-4 accent-[var(--primary-600)] ${FOCUS_RING_CLASSES}`}
              />
              <span>{isAr ? ar.maskLiving : 'Hide living and private people'}</span>
            </label>

            <label className="flex cursor-pointer items-start gap-2 text-[10px] font-semibold leading-relaxed text-[var(--text-secondary)]">
              <input
                type="checkbox"
                checked={posterOptions.includePhotos}
                onChange={(event) => updatePosterOptions({ includePhotos: event.target.checked })}
                className={`mt-0.5 h-4 w-4 accent-[var(--primary-600)] ${FOCUS_RING_CLASSES}`}
              />
              <span>{isAr ? ar.showPhotos : 'Show person photos'}</span>
            </label>

            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold text-[var(--text-muted)]">
                {isAr ? ar.photoShape : 'Photo shape'}
              </span>
              <div className="grid grid-cols-3 gap-1" data-testid="poster-photo-shape-control">
                {(['circle', 'square', 'rounded'] as PosterPhotoShape[]).map((shape) => {
                  const label = shape === 'circle'
                    ? (isAr ? ar.circularPhoto : 'Circular')
                    : shape === 'square'
                      ? (isAr ? ar.squarePhoto : 'Square')
                      : (isAr ? ar.roundedPhoto : 'Soft corners');
                  const swatchRadius = shape === 'circle'
                    ? 'rounded-full'
                    : shape === 'rounded'
                      ? 'rounded-[4px]'
                      : 'rounded-none';
                  return (
                    <button
                      key={shape}
                      type="button"
                      aria-label={label}
                      aria-pressed={posterOptions.photoShape === shape}
                      onClick={() => updatePosterOptions({ photoShape: shape })}
                      className={`flex min-h-10 items-center justify-center gap-1.5 rounded-lg border px-1.5 text-[9px] font-bold transition-colors ${FOCUS_RING_CLASSES} ${
                        posterOptions.photoShape === shape
                          ? 'border-[var(--primary-500)] bg-[var(--primary-500)]/10 text-[var(--primary-700)]'
                          : 'border-[var(--border-soft)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                      }`}
                    >
                      <span className={`h-3.5 w-3.5 border border-current bg-current/10 ${swatchRadius}`} aria-hidden="true" />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <label className={`flex items-start gap-2 text-[10px] font-semibold leading-relaxed ${
              posterOptions.includePhotos
                ? 'cursor-pointer text-[var(--text-secondary)]'
                : 'cursor-not-allowed text-[var(--text-muted)] opacity-60'
            }`}>
              <input
                type="checkbox"
                checked={posterOptions.hideLivingPhotos}
                disabled={!posterOptions.includePhotos}
                onChange={(event) => updatePosterOptions({ hideLivingPhotos: event.target.checked })}
                className={`mt-0.5 h-4 w-4 accent-[var(--primary-600)] ${FOCUS_RING_CLASSES}`}
              />
              <span>{isAr ? ar.hideLivingPhotos : 'Hide photos of living people'}</span>
            </label>
          </fieldset>

          <fieldset
            role="group"
            aria-label={isAr ? 'تنسيق ومحتوى البطاقة' : 'Card layout and content'}
            className="min-w-0 flex flex-col gap-2 border-0 p-0 m-0"
            data-testid="poster-card-layout-content-group"
          >
            <legend className="text-[10px] font-semibold text-[var(--text-muted)]">
              {isAr ? 'تنسيق ومحتوى البطاقة' : 'Card layout and content'}
            </legend>
            <div className="flex flex-col gap-2 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-2" data-testid="poster-card-layout-controls">
              <span className="text-[10px] font-bold text-[var(--text-muted)]">
                {isAr ? ar.cardLayout : 'Card content layout'}
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {([
                  ['style-default', isAr ? ar.styleDefaultCardLayout : 'Style default'],
                  ['standard', isAr ? ar.standardCardLayout : 'Standard'],
                  ['photo-focused', isAr ? ar.photoFocusedCardLayout : 'Photo-focused'],
                  ['text-minimal', isAr ? ar.textMinimalCardLayout : 'Text-minimal'],
                ] as readonly [VisualStudioPosterCardLayout, string][]).map(([cardLayout, label]) => (
                  <button
                    key={cardLayout}
                    type="button"
                    aria-pressed={posterOptions.cardLayout === cardLayout}
                    onClick={() => updatePosterOptions({ cardLayout })}
                    className={`min-h-9 rounded-md border px-1.5 py-1 text-start text-[9px] font-bold ${FOCUS_RING_CLASSES} ${posterOptions.cardLayout === cardLayout
                      ? 'border-[var(--primary-500)] bg-[var(--surface-panel)] text-[var(--primary-700)]'
                      : 'border-[var(--border-soft)] bg-transparent text-[var(--text-secondary)]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-2" data-testid="poster-card-content-controls">
              <span className="text-[10px] font-bold text-[var(--text-muted)]">
                {isAr ? ar.cardContent : 'Card content'}
              </span>
              <label className="flex cursor-pointer items-start gap-2 text-[10px] font-semibold leading-relaxed text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={posterOptions.showYears}
                  onChange={(event) => updatePosterOptions({ showYears: event.target.checked })}
                  className={`mt-0.5 h-4 w-4 accent-[var(--primary-600)] ${FOCUS_RING_CLASSES}`}
                />
                <span>{isAr ? ar.showYears : 'Show birth and death years'}</span>
              </label>
              <label className="flex cursor-pointer items-start gap-2 text-[10px] font-semibold leading-relaxed text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={posterOptions.showRelationship}
                  onChange={(event) => updatePosterOptions({ showRelationship: event.target.checked })}
                  className={`mt-0.5 h-4 w-4 accent-[var(--primary-600)] ${FOCUS_RING_CLASSES}`}
                />
                <span>{isAr ? ar.showRelationship : 'Show relationship to the tree'}</span>
              </label>
              <label className="flex cursor-pointer items-start gap-2 text-[10px] font-semibold leading-relaxed text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={posterOptions.showBirthPlace}
                  onChange={(event) => updatePosterOptions({ showBirthPlace: event.target.checked })}
                  className={`mt-0.5 h-4 w-4 accent-[var(--primary-600)] ${FOCUS_RING_CLASSES}`}
                />
                <span>{isAr ? ar.showBirthPlace : 'Show birth place'}</span>
              </label>
              <label className="flex cursor-pointer items-start gap-2 text-[10px] font-semibold leading-relaxed text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={posterOptions.showOccupation}
                  onChange={(event) => updatePosterOptions({ showOccupation: event.target.checked })}
                  className={`mt-0.5 h-4 w-4 accent-[var(--primary-600)] ${FOCUS_RING_CLASSES}`}
                />
                <span>{isAr ? ar.showOccupation : 'Show occupation'}</span>
              </label>
              <label className="flex cursor-pointer items-start gap-2 text-[10px] font-semibold leading-relaxed text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={posterOptions.showDescription}
                  onChange={(event) => updatePosterOptions({ showDescription: event.target.checked })}
                  className={`mt-0.5 h-4 w-4 accent-[var(--primary-600)] ${FOCUS_RING_CLASSES}`}
                />
                <span>{isAr ? ar.showDescription : 'Show short descriptive line'}</span>
              </label>
            </div>

            <div className="flex flex-col gap-2 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-2" data-testid="poster-card-scale-controls">
              <span className="text-[10px] font-bold text-[var(--text-muted)]">
                {isAr ? ar.cardSize : 'Person card size'}
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {([
                  ['compact', isAr ? ar.compactCard : 'Small'],
                  ['standard', isAr ? ar.standardCard : 'Standard'],
                  ['large', isAr ? ar.largeCard : 'Large'],
                ] as readonly [VisualStudioPosterCardScale, string][]).map(([cardScale, label]) => (
                  <button
                    key={cardScale}
                    type="button"
                    aria-pressed={posterOptions.cardScale === cardScale}
                    onClick={() => updatePosterOptions({ cardScale })}
                    className={`min-h-9 rounded-md border px-1.5 py-1 text-center text-[9px] font-bold ${FOCUS_RING_CLASSES} ${posterOptions.cardScale === cardScale
                      ? 'border-[var(--primary-500)] bg-[var(--surface-panel)] text-[var(--primary-700)]'
                      : 'border-[var(--border-soft)] bg-transparent text-[var(--text-secondary)]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-2" data-testid="poster-card-effect-controls">
              <span className="text-[10px] font-bold text-[var(--text-muted)]">
                {isAr ? ar.cardEffect : 'Card depth'}
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {([
                  ['style-default', isAr ? ar.styleDefaultCardEffect : 'Style default'],
                  ['flat', isAr ? ar.flatCardEffect : 'Flat'],
                  ['soft', isAr ? ar.softCardEffect : 'Soft shadow'],
                  ['elevated', isAr ? ar.elevatedCardEffect : 'Elevated'],
                ] as readonly [VisualStudioPosterCardEffect, string][]).map(([cardEffect, label]) => (
                  <button
                    key={cardEffect}
                    type="button"
                    aria-pressed={posterOptions.cardEffect === cardEffect}
                    onClick={() => updatePosterOptions({ cardEffect })}
                    className={`min-h-9 rounded-md border px-1.5 py-1 text-start text-[9px] font-bold ${FOCUS_RING_CLASSES} ${posterOptions.cardEffect === cardEffect
                      ? 'border-[var(--primary-500)] bg-[var(--surface-panel)] text-[var(--primary-700)]'
                      : 'border-[var(--border-soft)] bg-transparent text-[var(--text-secondary)]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-2" data-testid="poster-card-frame-controls">
              <span className="text-[10px] font-bold text-[var(--text-muted)]">
                {isAr ? ar.cardFrame : 'Card frame'}
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {([
                  ['style-default', isAr ? ar.styleDefaultCardFrame : 'Style default'],
                  ['minimal', isAr ? ar.minimalCardFrame : 'Minimal'],
                  ['classic', isAr ? ar.classicCardFrame : 'Classic'],
                  ['ornate', isAr ? ar.ornateCardFrame : 'Lightly ornate'],
                ] as readonly [VisualStudioPosterCardFrame, string][]).map(([cardFrame, label]) => (
                  <button
                    key={cardFrame}
                    type="button"
                    aria-pressed={posterOptions.cardFrame === cardFrame}
                    onClick={() => updatePosterOptions({ cardFrame })}
                    className={`min-h-9 rounded-md border px-1.5 py-1 text-start text-[9px] font-bold ${FOCUS_RING_CLASSES} ${posterOptions.cardFrame === cardFrame
                      ? 'border-[var(--primary-500)] bg-[var(--surface-panel)] text-[var(--primary-700)]'
                      : 'border-[var(--border-soft)] bg-transparent text-[var(--text-secondary)]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-2" data-testid="poster-card-corner-controls">
              <span className="text-[10px] font-bold text-[var(--text-muted)]">
                {isAr ? ar.cardCorner : 'Card corners'}
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {([
                  ['style-default', isAr ? ar.styleDefaultCardCorner : 'Style default'],
                  ['square', isAr ? ar.squareCardCorner : 'Square'],
                  ['soft', isAr ? ar.softCardCorner : 'Soft'],
                  ['rounded', isAr ? ar.roundedCardCorner : 'Rounded'],
                ] as readonly [VisualStudioPosterCardCorner, string][]).map(([cardCorner, label]) => (
                  <button
                    key={cardCorner}
                    type="button"
                    aria-pressed={posterOptions.cardCorner === cardCorner}
                    onClick={() => updatePosterOptions({ cardCorner })}
                    className={`min-h-9 rounded-md border px-1.5 py-1 text-start text-[9px] font-bold ${FOCUS_RING_CLASSES} ${posterOptions.cardCorner === cardCorner
                      ? 'border-[var(--primary-500)] bg-[var(--surface-panel)] text-[var(--primary-700)]'
                      : 'border-[var(--border-soft)] bg-transparent text-[var(--text-secondary)]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </fieldset>

          <fieldset
            role="group"
            aria-label={isAr ? 'خطوط الربط والمسارات' : 'Connector paths and lines'}
            className="min-w-0 flex flex-col gap-2 border-0 p-0 m-0"
            data-testid="poster-connector-style-group"
          >
            <legend className="text-[10px] font-semibold text-[var(--text-muted)]">
              {isAr ? 'خطوط الربط والمسارات' : 'Connector paths and lines'}
            </legend>
            <div className="flex flex-col gap-2 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-2" data-testid="poster-connector-style-controls">
              <span className="text-[10px] font-bold text-[var(--text-muted)]">
                {isAr ? ar.connectorStyle : 'Relationship line style'}
              </span>
              <div className="grid grid-cols-3 gap-1">
                {(['subtle', 'classic', 'bold'] as const).map((style) => {
                  const label = style === 'subtle'
                    ? (isAr ? ar.subtleConnectors : 'Subtle')
                    : style === 'bold'
                      ? (isAr ? ar.boldConnectors : 'Bold')
                      : (isAr ? ar.classicConnectors : 'Classic');
                  return (
                    <button
                      key={style}
                      type="button"
                      aria-pressed={posterOptions.connectorStyle === style}
                      onClick={() => updatePosterOptions({ connectorStyle: style })}
                      className={`min-h-8 rounded-md border px-1.5 py-1 text-[9px] font-bold ${FOCUS_RING_CLASSES} ${posterOptions.connectorStyle === style
                        ? 'border-[var(--primary-500)] bg-[var(--surface-panel)] text-[var(--primary-700)]'
                        : 'border-[var(--border-soft)] bg-transparent text-[var(--text-secondary)]'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-2" data-testid="poster-connector-path-controls">
              <span className="text-[10px] font-bold text-[var(--text-muted)]">
                {isAr ? ar.connectorPath : 'Generation line path'}
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {([
                  ['style-default', isAr ? ar.styleDefaultConnectorPath : 'Style default'],
                  ['straight', isAr ? ar.straightConnectorPath : 'Straight'],
                  ['orthogonal', isAr ? ar.orthogonalConnectorPath : 'Stepped corners'],
                  ['curved', isAr ? ar.curvedConnectorPath : 'Curved'],
                ] as readonly [VisualStudioPosterConnectorPath, string][]).map(([connectorPath, label]) => (
                  <button
                    key={connectorPath}
                    type="button"
                    aria-pressed={posterOptions.connectorPath === connectorPath}
                    onClick={() => updatePosterOptions({ connectorPath })}
                    className={`min-h-9 rounded-md border px-1.5 py-1 text-start text-[9px] font-bold ${FOCUS_RING_CLASSES} ${posterOptions.connectorPath === connectorPath
                      ? 'border-[var(--primary-500)] bg-[var(--surface-panel)] text-[var(--primary-700)]'
                      : 'border-[var(--border-soft)] bg-transparent text-[var(--text-secondary)]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </fieldset>

          <fieldset
            role="group"
            aria-label={isAr ? ar.colorPalette : 'Color palette'}
            className="min-w-0 flex flex-col gap-2 border-0 p-0 m-0"
            data-testid="poster-color-palette-group"
          >
            <legend className="text-[10px] font-semibold text-[var(--text-muted)]">
              {isAr ? ar.colorPalette : 'Color palette'}
            </legend>
            <div className="flex flex-col gap-2 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-2" data-testid="poster-color-palette-controls">
              <div className="grid grid-cols-2 gap-1.5">
                {([
                  ['style-default', '#a86f35', '#f4ead8'],
                  ['heritage-warm', '#a86f35', '#f4ead8'],
                  ['gallery-dark', '#d8a85f', '#151918'],
                  ['evergreen', '#527b64', '#edf1ec'],
                  ['monochrome-print', '#171717', '#f7f7f5'],
                ] as const).map(([palette, accent, background]) => {
                  const labels: Record<VisualStudioPosterPalette, string> = {
                    'style-default': isAr ? ar.styleDefaultPalette : 'Style default',
                    'heritage-warm': isAr ? ar.heritageWarmPalette : 'Warm heritage',
                    'gallery-dark': isAr ? '\u0645\u0639\u0631\u0636 \u062f\u0627\u0643\u0646' : 'Dark gallery',
                    evergreen: isAr ? ar.evergreenPalette : 'Family evergreen',
                    'monochrome-print': isAr ? ar.monochromePalette : 'Print monochrome',
                  };
                  return (
                    <button
                      key={palette}
                      type="button"
                      aria-pressed={posterOptions.colorPalette === palette}
                      onClick={() => updatePosterOptions({ colorPalette: palette, colorOverrides: undefined })}
                      className={`flex min-h-9 items-center gap-1.5 rounded-md border px-2 py-1 text-start text-[9px] font-bold ${FOCUS_RING_CLASSES} ${posterOptions.colorPalette === palette
                        ? 'border-[var(--primary-500)] bg-[var(--surface-panel)] text-[var(--primary-700)]'
                        : 'border-[var(--border-soft)] bg-transparent text-[var(--text-secondary)]'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className="h-4 w-4 shrink-0 rounded-full border border-black/15"
                        style={{ background: `linear-gradient(135deg, ${background} 50%, ${accent} 50%)` }}
                      />
                      <span>{labels[palette]}</span>
                    </button>
                  );
                })}
              </div>
              <label className="flex cursor-pointer items-center gap-2 border-t border-[var(--border-soft)] pt-2 text-[10px] font-semibold text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={Boolean(posterOptions.colorOverrides)}
                  onChange={(event) => updatePosterOptions({
                    colorOverrides: event.target.checked
                      ? getVisualStudioPosterColorDefaults(posterOptions.colorPalette, selectedDefinitionId)
                      : undefined,
                  })}
                  className={`h-4 w-4 accent-[var(--primary-600)] ${FOCUS_RING_CLASSES}`}
                />
                <span>{isAr ? ar.customizeColors : 'Customize poster colors'}</span>
              </label>
              {posterOptions.colorOverrides && (
                <div className="grid grid-cols-2 gap-2" data-testid="poster-custom-color-controls">
                  {([
                    ['background', isAr ? ar.posterBackground : 'Poster background'],
                    ['cardBackground', isAr ? ar.cardBackground : 'Card color'],
                    ['accent', isAr ? ar.accentColor : 'Accent and frame'],
                    ['connector', isAr ? ar.connectorColor : 'Relationship lines'],
                  ] as const).map(([field, label]) => (
                    <label
                      key={field}
                      className="flex min-w-0 items-center gap-2 rounded-md border border-[var(--border-soft)] bg-[var(--surface-panel)] p-1.5 text-[9px] font-semibold text-[var(--text-secondary)]"
                    >
                      <input
                        type="color"
                        aria-label={label}
                        value={posterOptions.colorOverrides?.[field]
                          ?? getVisualStudioPosterColorDefaults(posterOptions.colorPalette, selectedDefinitionId)[field]}
                        onChange={(event) => updatePosterOptions({
                          colorOverrides: {
                            ...getVisualStudioPosterColorDefaults(posterOptions.colorPalette, selectedDefinitionId),
                            ...posterOptions.colorOverrides,
                            [field]: event.target.value,
                          } satisfies PosterColorOverrides,
                        })}
                        className={`h-7 w-8 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0 ${FOCUS_RING_CLASSES}`}
                      />
                      <span className="min-w-0 leading-tight">{label}</span>
                    </label>
                  ))}
                  <button
                    type="button"
                    onClick={() => updatePosterOptions({ colorOverrides: undefined })}
                    className={`col-span-2 inline-flex min-h-8 items-center justify-center gap-1.5 rounded-md border border-[var(--border-soft)] bg-[var(--surface-panel)] px-2 text-[9px] font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] ${FOCUS_RING_CLASSES}`}
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    {isAr ? ar.resetColors : 'Restore palette colors'}
                  </button>
                </div>
              )}
            </div>
          </fieldset>

          <fieldset
            role="group"
            aria-label={isAr ? 'الخطوط والكثافة النصية' : 'Typography and fonts'}
            className="min-w-0 flex flex-col gap-2 border-0 p-0 m-0"
            data-testid="poster-typography-fonts-group"
          >
            <legend className="text-[10px] font-semibold text-[var(--text-muted)]">
              {isAr ? 'الخطوط والكثافة النصية' : 'Typography and fonts'}
            </legend>
            <div className="flex flex-col gap-2 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-2" data-testid="poster-typography-controls">
              <span className="text-[10px] font-bold text-[var(--text-muted)]">
                {isAr ? ar.typographyDensity : 'Typography density'}
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {([
                  ['balanced', isAr ? ar.balancedTypography : 'Balanced'],
                  ['prominent', isAr ? ar.prominentTypography : 'Larger names'],
                  ['compact', isAr ? ar.compactTypography : 'Compact'],
                ] as readonly [VisualStudioPosterTypography, string][]).map(([typography, label]) => (
                  <button
                    key={typography}
                    type="button"
                    aria-pressed={posterOptions.typography === typography}
                    onClick={() => updatePosterOptions({ typography })}
                    className={`min-h-9 rounded-md border px-1.5 py-1 text-center text-[9px] font-bold ${FOCUS_RING_CLASSES} ${posterOptions.typography === typography
                      ? 'border-[var(--primary-500)] bg-[var(--surface-panel)] text-[var(--primary-700)]'
                      : 'border-[var(--border-soft)] bg-transparent text-[var(--text-secondary)]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-2" data-testid="poster-font-family-controls">
              <span className="text-[10px] font-bold text-[var(--text-muted)]">
                {isAr ? ar.posterFont : 'Poster font'}
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {([
                  ['style-default', isAr ? ar.styleDefaultFont : 'Style default'],
                  ['amiri', isAr ? ar.amiriFont : 'Amiri Heritage'],
                  ['noto-sans-arabic', isAr ? ar.notoSansArabicFont : 'Noto Sans Arabic'],
                  ['noto-kufi-arabic', isAr ? ar.notoKufiArabicFont : 'Noto Kufi Arabic'],
                ] as readonly [VisualStudioPosterFontFamily, string][]).map(([fontFamily, label]) => (
                  <button
                    key={fontFamily}
                    type="button"
                    aria-pressed={posterOptions.fontFamily === fontFamily}
                    onClick={() => updatePosterOptions({ fontFamily })}
                    className={`min-h-9 rounded-md border px-1.5 py-1 text-start text-[9px] font-bold ${FOCUS_RING_CLASSES} ${posterOptions.fontFamily === fontFamily
                      ? 'border-[var(--primary-500)] bg-[var(--surface-panel)] text-[var(--primary-700)]'
                      : 'border-[var(--border-soft)] bg-transparent text-[var(--text-secondary)]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </fieldset>

          <div className="flex flex-col gap-2 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-2" data-testid="poster-decoration-controls">
            <span className="text-[10px] font-bold text-[var(--text-muted)]">
              {isAr ? ar.backgroundTreatment : 'Background treatment'}
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {([
                ['style-default', isAr ? ar.styleDefaultDecoration : 'Style default'],
                ['clean', isAr ? ar.cleanDecoration : 'Clean'],
                ['paper-grain', isAr ? ar.paperDecoration : 'Heritage paper'],
                ['lineage-grid', isAr ? ar.gridDecoration : 'Subtle lineage grid'],
              ] as readonly [VisualStudioPosterDecoration, string][]).map(([decoration, label]) => (
                <button
                  key={decoration}
                  type="button"
                  aria-pressed={posterOptions.decoration === decoration}
                  onClick={() => updatePosterOptions({ decoration })}
                  className={`min-h-9 rounded-md border px-2 py-1 text-start text-[9px] font-bold ${FOCUS_RING_CLASSES} ${posterOptions.decoration === decoration
                    ? 'border-[var(--primary-500)] bg-[var(--surface-panel)] text-[var(--primary-700)]'
                    : 'border-[var(--border-soft)] bg-transparent text-[var(--text-secondary)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-2" data-testid="poster-ornament-controls">
            <span className="text-[10px] font-bold text-[var(--text-muted)]">
              {isAr ? ar.posterOrnament : 'Poster ornament'}
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {([
                ['style-default', isAr ? ar.styleDefaultOrnament : 'Style default'],
                ['none', isAr ? ar.noOrnament : 'No ornament'],
                ['lineage-medallion', isAr ? ar.lineageMedallionOrnament : 'Lineage medallion'],
                ['gallery-marks', isAr ? ar.galleryMarksOrnament : 'Modern gallery marks'],
                ['corner-branches', isAr ? ar.cornerBranchesOrnament : 'Corner branches'],
              ] as readonly [VisualStudioPosterOrnament, string][]).map(([ornament, label]) => (
                <button
                  key={ornament}
                  type="button"
                  aria-pressed={posterOptions.ornament === ornament}
                  onClick={() => updatePosterOptions({ ornament })}
                  className={`min-h-9 rounded-md border px-1.5 py-1 text-start text-[9px] font-bold ${FOCUS_RING_CLASSES} ${posterOptions.ornament === ornament
                    ? 'border-[var(--primary-500)] bg-[var(--surface-panel)] text-[var(--primary-700)]'
                    : 'border-[var(--border-soft)] bg-transparent text-[var(--text-secondary)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-2" data-testid="poster-page-frame-controls">
            <span className="text-[10px] font-bold text-[var(--text-muted)]">
              {isAr ? ar.pageFrame : 'Poster frame'}
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {([
                ['style-default', isAr ? ar.styleDefaultPageFrame : 'Style default'],
                ['none', isAr ? ar.noPageFrame : 'No frame'],
                ['minimal', isAr ? ar.minimalPageFrame : 'Minimal'],
                ['heritage', isAr ? ar.heritagePageFrame : 'Heritage'],
                ['gallery', isAr ? ar.galleryPageFrame : 'Modern gallery'],
              ] as readonly [VisualStudioPosterPageFrame, string][]).map(([pageFrame, label]) => (
                <button
                  key={pageFrame}
                  type="button"
                  aria-pressed={posterOptions.pageFrame === pageFrame}
                  onClick={() => updatePosterOptions({ pageFrame })}
                  className={`min-h-9 rounded-md border px-1.5 py-1 text-start text-[9px] font-bold ${FOCUS_RING_CLASSES} ${posterOptions.pageFrame === pageFrame
                    ? 'border-[var(--primary-500)] bg-[var(--surface-panel)] text-[var(--primary-700)]'
                    : 'border-[var(--border-soft)] bg-transparent text-[var(--text-secondary)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
