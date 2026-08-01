import React, { useState, useMemo } from 'react';
import {
  RotateCcw,
  RotateCw,
  RefreshCw,
  Sparkles,
  Sliders,
  FileText,
  CreditCard,
  Palette,
  Printer,
  AlertTriangle,
} from 'lucide-react';
import type {
  PosterDesignState,
  PosterProductMode,
  PosterLayoutMode,
  PosterTreeScope,
  SharedPosterSettings,
  TieredSettingsBucket,
  FocusSettingsBucket,
  TiledWallPosterPlan,
  VisualOutputDefinition,
} from '../../../publishing';
import {
  getPosterPresetDefinition,
  requiresPrintQualityGate,
  requiresDedicatedTileQualityEvaluation,
  INITIAL_POSTER_PRESETS,
  createInitialPosterDesignState,
} from '../../../publishing';
import type {
  VisualStudioPosterRootOption,
} from './visualStudioPosterOptions';

export type StudioWorkspaceSectionId = 'quick-setup' | 'content' | 'layout' | 'cards' | 'appearance' | 'print';

export interface VisualOutputConfigPanelProps {
  language: 'ar' | 'en';
  state?: PosterDesignState;
  isModified?: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  onSelectPreset?: (presetId: string) => void;
  onUpdateContent?: (updates: Partial<SharedPosterSettings> & { scope?: PosterTreeScope }) => void;
  onUpdateLayout?: (updates: Partial<SharedPosterSettings> & Partial<TieredSettingsBucket>) => void;
  onUpdateCards?: (updates: Partial<SharedPosterSettings>) => void;
  onUpdateAppearance?: (updates: Partial<SharedPosterSettings>) => void;
  onUpdatePrint?: (updates: Partial<SharedPosterSettings> & Record<string, unknown>) => void;
  onSwitchProductMode?: (mode: PosterProductMode) => void;
  onSwitchLayoutMode?: (mode: PosterLayoutMode) => void;
  onSwitchScope?: (scope: PosterTreeScope) => void;
  onUpdateFocus?: (updates: Partial<FocusSettingsBucket>) => void;
  onResetSection?: (sectionId: 'content' | 'layout' | 'cards' | 'appearance' | 'print') => void;
  onResetPoster?: (presetId?: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  definitions?: VisualOutputDefinition[];
  selectedDefinitionId?: string;
  onSelectDefinition?: (id: string) => void;
  selectedDefinition?: VisualOutputDefinition;
  posterRootOptions?: readonly VisualStudioPosterRootOption[];
  selectedPosterRootToken?: string;
  selectedFocalPersonToken?: string;
  onSelectPosterRoot?: (token: string) => void;
  posterTitle?: string;
  posterSubtitle?: string;
  onPosterTitleChange?: (value: string) => void;
  onPosterSubtitleChange?: (value: string) => void;
  tiledWallPlan?: TiledWallPosterPlan;
  activeSection?: StudioWorkspaceSectionId;
}

const ar = {
  presetFirstWorkspace: 'إعدادات البوستر',
  quickSetup: 'إعداد سريع',
  contentAndScope: 'المحتوى والنطاق',
  layout: 'التخطيط',
  cards: 'البطاقات',
  appearance: 'المظهر',
  print: 'الطباعة',
  presetsTitle: 'النمط المسبق',
  classicHeritage: 'التراث الكلاسيكي',
  modernGallery: 'المعرض العصري',
  modifiedBadge: 'معدّل',
  undo: 'تراجع',
  redo: 'إعادة',
  resetSection: 'إعادة ضبط القسم',
  resetPoster: 'إعادة ضبط البوستر',
  productMode: 'اختر نوع المخرج',
  detailedPoster: 'بوستر تفصيلي',
  fullTreeOverview: 'لوحة الشجرة الكاملة',
  branchCollection: 'مجموعة الفروع',
  tiledWall: 'لوحة جدارية مقسمة',
  treeScope: 'نطاق الشجرة',
  ancestors: 'الأسلاف',
  descendants: 'الأحفاد',
  fullTree: 'الشجرة الكاملة',
  selectedRoot: 'الشخص الرئيسي (الجذر)',
  privacyMode: 'خصوصية الأحياء',
  maskedLiving: 'إخفاء الأحياء والمعلومات الخاصة',
  ownerFull: 'عرض جميع البيانات والمعلومات',
  personDetails: 'تفاصيل الأشخاص',
  showYears: 'عرض سنوات الميلاد والوفاة',
  showRelationship: 'عرض صلة القرابة',
  showBirthPlace: 'عرض مكان الميلاد',
  showOccupation: 'عرض المهنة',
  showDescription: 'عرض السطر الوصفي المختصر',
  posterTitle: 'عنوان البوستر',
  posterSubtitle: 'العنوان الفرعي',
  footerText: 'نص الهامش السفلي',
  showJozorAttribution: 'إظهار شعار جذور',
  treeDirection: 'اتجاه الشجرة',
  horizontal: 'أفقي (يمين - يسار)',
  vertical: 'رأسي (أعلى - أسفل)',
  generationsDepth: 'عدد الأجيال',
  allGenerations: 'كل الأجيال المتاحة',
  treeSpacing: 'كثافة التوزيع',
  spacingDefault: 'حسب التصميم',
  spacingCompact: 'مدمجة',
  spacingBalanced: 'متوازنة',
  spacingAiry: 'رحبة',
  showPhotos: 'عرض صور الأشخاص',
  hideLivingPhotos: 'إخفاء صور الأحياء',
  photoShape: 'شكل الصورة',
  photoCircle: 'دائرية',
  photoSquare: 'مربعة',
  photoRounded: 'حواف ناعمة',
  cardScale: 'حجم البطاقات',
  cardScaleCompact: 'صغير',
  cardScaleStandard: 'قياسي',
  cardScaleLarge: 'كبير',
  cardLayout: 'تخطيط البطاقة',
  cardLayoutStandard: 'قياسي',
  cardLayoutPhotoHero: 'صورة بارزة',
  cardLayoutTextMinimal: 'نص مختصر',
  cardEffect: 'تأثير البطاقة',
  cardEffectDefault: 'حسب التصميم',
  cardEffectNone: 'بدون',
  cardEffectSoft: 'ظل ناعم',
  cardEffectHard: 'ظل حاد',
  cardFrame: 'إطار البطاقة',
  cardFrameDefault: 'حسب التصميم',
  cardFrameMinimal: 'بسيط',
  cardFrameClassic: 'كلاسيكي مدمج',
  cardFrameOrnate: 'زخرفي',
  cardCorner: 'حواف البطاقة',
  cardCornerDefault: 'حسب التصميم',
  cardCornerSquare: 'حادة',
  cardCornerSoft: 'ناعمة',
  cardCornerRounded: 'دائرية',
  colorPalette: 'لوحة الألوان',
  paletteDefault: 'حسب التصميم',
  paletteWarm: 'تراثي دافئ',
  paletteGallery: 'معرض داكن',
  paletteEvergreen: 'أخضر عائلي',
  paletteMonochrome: 'أبيض وأسود للطباعة',
  typography: 'نمط الخطوط',
  typoBalanced: 'متوازن',
  typoProminent: 'بارز',
  typoCompact: 'مدمج',
  fontFamily: 'نوع الخط العربي',
  fontAmiri: 'الأميري (كلاسيكي)',
  fontNotoSans: 'نوتو كوفي (عصري)',
  connectors: 'أسلوب خطوط العلاقات',
  connSubtle: 'ناعم',
  connClassic: 'كلاسيكي',
  connBold: 'بارز',
  connectorPath: 'مسار خطوط العلاقات',
  connPathCurved: 'منحني',
  connPathStraight: 'مستقيم',
  connPathAngular: 'زاوي',
  decoration: 'زخرفة خلفية الصفحة',
  decorWarmPaper: 'ورق دافئ',
  decorLineageGrid: 'شبكة الأنساب',
  ornament: 'زخارف الأركان',
  ornCornerFiligree: 'زخرفة ركنية',
  ornCornerBranches: 'أغصان ركنية',
  pageFrame: 'إطار الصفحة',
  ornHeritage: 'تراثي',
  ornGallery: 'معرض',
  ornMinimal: 'بسيط',
  ornOrnateCornerFiligree: 'زخرفة ركنية مزخرفة',
  headerStyle: 'نمط العنوان الرئيسي',
  headerCeremonial: 'احتفالي',
  headerModernBanner: 'شريط عصري',
  headerMinimal: 'بسيط',
  pageSize: 'حجم الورق',
  orientation: 'اتجاه الصفحة',
  portrait: 'عمودي',
  landscape: 'أفقي',
  margins: 'هوامش الطباعة',
  marginCompact: 'مدمجة',
  marginBalanced: 'متوازنة',
  marginGenerous: 'واسعة',
  printQualityGateTitle: 'تنبيه جودة الطباعة',
  printQualityGateWarning: 'نطاق الشجرة الكاملة على ورق صغير قد يؤدي لتقليل وضوح الأسماء. يوصى باستخدام ورق A2 أو A1 للطباعة الاحترافية.',
  tiledWallGuidance: 'تتطلب اللوحة المقسمة فحص تقطيع الأوراق والجدران. استخدم خيار التصدير المقسم لتوليد ملحقات الأوراق.',
  tiledRows: 'عدد الصفوف (الأوراق)',
  tiledColumns: 'عدد الأعمدة (الأوراق)',
  tiledSheetSize: 'حجم ورقة التقسيم',
  tiledOverlap: 'مقدار التداخل (ملم)',
  branchCollectionTitle: 'عنوان فهرس الأرشيف',
};

const en = {
  presetFirstWorkspace: 'Poster Settings',
  quickSetup: 'Quick Setup',
  contentAndScope: 'Content & Scope',
  layout: 'Layout',
  cards: 'Cards',
  appearance: 'Appearance',
  print: 'Print Quality',
  presetsTitle: 'Preset Style',
  classicHeritage: 'Classic Heritage',
  modernGallery: 'Modern Gallery',
  modifiedBadge: 'Modified',
  undo: 'Undo',
  redo: 'Redo',
  resetSection: 'Reset Section',
  resetPoster: 'Reset Poster',
  productMode: 'Visual Output Mode',
  detailedPoster: 'Detailed Poster',
  fullTreeOverview: 'Full-tree Overview',
  branchCollection: 'Branch Collection Archive',
  tiledWall: 'Tiled Wall Poster',
  treeScope: 'Tree Scope',
  ancestors: 'Ancestors',
  descendants: 'Descendants',
  fullTree: 'Full Family Tree',
  selectedRoot: 'Focal Person (Root)',
  privacyMode: 'Privacy Filter',
  maskedLiving: 'Mask Living & Private Data',
  ownerFull: 'Show Full Recorded Data',
  personDetails: 'Person Card Fields',
  showYears: 'Show Birth & Death Years',
  showRelationship: 'Show Relationship Hint',
  showBirthPlace: 'Show Birth Place',
  showOccupation: 'Show Occupation',
  showDescription: 'Show Short Bio',
  posterTitle: 'Poster Title',
  posterSubtitle: 'Poster Subtitle',
  footerText: 'Footer Note',
  showJozorAttribution: 'Show Jozor Branding',
  treeDirection: 'Tree Flow Direction',
  horizontal: 'Horizontal (Right to Left)',
  vertical: 'Vertical (Top to Bottom)',
  generationsDepth: 'Generations Depth',
  allGenerations: 'All Recorded Generations',
  treeSpacing: 'Node Spacing Density',
  spacingDefault: 'Preset Default',
  spacingCompact: 'Compact',
  spacingBalanced: 'Balanced',
  spacingAiry: 'Airy',
  showPhotos: 'Show Profile Photos',
  hideLivingPhotos: 'Hide Photos of Living People',
  photoShape: 'Photo Frame Shape',
  photoCircle: 'Circle',
  photoSquare: 'Square',
  photoRounded: 'Soft Rounded',
  cardScale: 'Card Scale',
  cardScaleCompact: 'Compact',
  cardScaleStandard: 'Standard',
  cardScaleLarge: 'Large',
  cardLayout: 'Card Content Layout',
  cardLayoutStandard: 'Standard',
  cardLayoutPhotoHero: 'Photo Hero',
  cardLayoutTextMinimal: 'Text Minimal',
  cardEffect: 'Card Depth Effect',
  cardEffectDefault: 'Preset Default',
  cardEffectNone: 'None',
  cardEffectSoft: 'Soft Drop Shadow',
  cardEffectHard: 'Hard Shadow',
  cardFrame: 'Card Border Frame',
  cardFrameDefault: 'Preset Default',
  cardFrameMinimal: 'Minimal',
  cardFrameClassic: 'Classic Inset',
  cardFrameOrnate: 'Ornate',
  cardCorner: 'Card Corner Style',
  cardCornerDefault: 'Preset Default',
  cardCornerSquare: 'Sharp',
  cardCornerSoft: 'Soft',
  cardCornerRounded: 'Rounded',
  colorPalette: 'Color Palette',
  paletteDefault: 'Preset Default',
  paletteWarm: 'Heritage Warm',
  paletteGallery: 'Gallery Dark',
  paletteEvergreen: 'Evergreen',
  paletteMonochrome: 'Monochrome Print',
  typography: 'Typography Scale',
  typoBalanced: 'Balanced',
  typoProminent: 'Prominent',
  typoCompact: 'Compact',
  fontFamily: 'Arabic Font',
  fontAmiri: 'Amiri (Serif)',
  fontNotoSans: 'Noto Kufi (Sans)',
  connectors: 'Relationship Connectors',
  connSubtle: 'Subtle',
  connClassic: 'Classic',
  connBold: 'Bold',
  connectorPath: 'Connector Line Path',
  connPathCurved: 'Curved',
  connPathStraight: 'Straight',
  connPathAngular: 'Angular',
  decoration: 'Background Texture',
  decorWarmPaper: 'Warm Paper',
  decorLineageGrid: 'Lineage Grid',
  ornament: 'Corner Ornaments',
  ornCornerFiligree: 'Corner Filigree',
  ornCornerBranches: 'Corner Branches',
  pageFrame: 'Page Border Frame',
  ornHeritage: 'Heritage',
  ornGallery: 'Gallery',
  ornMinimal: 'Minimal',
  ornOrnateCornerFiligree: 'Ornate Corner Filigree',
  headerStyle: 'Header Layout Style',
  headerCeremonial: 'Ceremonial',
  headerModernBanner: 'Modern Banner',
  headerMinimal: 'Minimal',
  pageSize: 'Paper Size',
  orientation: 'Orientation',
  portrait: 'Portrait',
  landscape: 'Landscape',
  margins: 'Print Margins',
  marginCompact: 'Compact',
  marginBalanced: 'Balanced',
  marginGenerous: 'Generous',
  printQualityGateTitle: 'Print Quality Guidance',
  printQualityGateWarning: 'Full tree rendering on small paper (A4/A3) reduces text legibility. We recommend A2 or A1 paper sizes for high-density trees.',
  tiledWallGuidance: 'Tiled wall output splits your tree across multiple sheets for large wall display.',
  tiledRows: 'Grid Rows (Sheets)',
  tiledColumns: 'Grid Columns (Sheets)',
  tiledSheetSize: 'Tile Sheet Size',
  tiledOverlap: 'Tile Overlap (mm)',
  branchCollectionTitle: 'Index Title',
};

export const VisualOutputConfigPanel: React.FC<VisualOutputConfigPanelProps> = ({
  language,
  state,
  isModified = false,
  canUndo = false,
  canRedo = false,
  onSelectPreset,
  onUpdateContent,
  onUpdateLayout,
  onUpdateCards,
  onUpdateAppearance,
  onUpdatePrint,
  onSwitchProductMode,
  onSwitchLayoutMode,
  onSwitchScope,
  onUpdateFocus,
  onResetSection,
  onResetPoster,
  onUndo,
  onRedo,
  posterRootOptions = [],
  selectedPosterRootToken,
  selectedFocalPersonToken,
  onSelectPosterRoot,
  posterTitle = '',
  posterSubtitle = '',
  onPosterTitleChange,
  onPosterSubtitleChange,
  activeSection: propActiveSection,
}) => {
  const isAr = language === 'ar';
  const t = isAr ? ar : en;

  const currentState = useMemo(() => {
    return state ?? createInitialPosterDesignState('classic-heritage');
  }, [state]);

  const effectivePosterRootToken = selectedPosterRootToken || currentState.shared.selectedPosterRootToken;

  const [activeSection, setActiveSection] = useState<StudioWorkspaceSectionId>(propActiveSection || 'quick-setup');

  const currentPresetDef = getPosterPresetDefinition(currentState.activePresetId);
  const showQualityWarning = requiresPrintQualityGate(
    currentState.productMode,
    currentState.layoutMode,
    currentState.scope,
    currentState.shared.size,
    120
  );
  const showTiledWallTileNotice = requiresDedicatedTileQualityEvaluation(
    currentState.productMode,
    currentState.layoutMode,
    currentState.scope
  );

  const sections: Array<{ id: StudioWorkspaceSectionId; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'quick-setup', label: t.quickSetup, icon: Sparkles },
    { id: 'content', label: t.contentAndScope, icon: FileText },
    { id: 'layout', label: t.layout, icon: Sliders },
    { id: 'cards', label: t.cards, icon: CreditCard },
    { id: 'appearance', label: t.appearance, icon: Palette },
    { id: 'print', label: t.print, icon: Printer },
  ];

  const handleTabKeyDown = (e: React.KeyboardEvent, idx: number) => {
    let nextIdx = idx;
    if (e.key === 'ArrowRight') {
      nextIdx = isAr ? (idx - 1 + sections.length) % sections.length : (idx + 1) % sections.length;
    } else if (e.key === 'ArrowLeft') {
      nextIdx = isAr ? (idx + 1) % sections.length : (idx - 1 + sections.length) % sections.length;
    } else if (e.key === 'Home') {
      nextIdx = 0;
    } else if (e.key === 'End') {
      nextIdx = sections.length - 1;
    } else {
      return;
    }
    e.preventDefault();
    const nextSec = sections[nextIdx];
    setActiveSection(nextSec.id);
    setTimeout(() => {
      document.getElementById(`tab-${nextSec.id}`)?.focus();
    }, 0);
  };

  return (
    <div
      className="w-full flex flex-col h-full bg-stone-900 border border-stone-800 text-stone-100 rounded-xl shadow-xl overflow-hidden"
      dir={isAr ? 'rtl' : 'ltr'}
      data-testid="visual-studio-config-panel"
    >
      {/* Top Workspace Header */}
      <div className="px-4 py-3 bg-stone-950 border-b border-stone-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-stone-200">{t.presetFirstWorkspace}</span>
          {isModified && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {t.modifiedBadge}
            </span>
          )}
        </div>

        {/* Undo / Redo / Reset Action Bar */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            aria-label={t.undo}
            title={t.undo}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            aria-label={t.redo}
            title={t.redo}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onResetPoster?.(currentState.activePresetId)}
            aria-label={t.resetPoster}
            title={t.resetPoster}
            className="p-1.5 rounded-lg text-stone-400 hover:text-rose-300 hover:bg-rose-950/40 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Section Navigator (Tabs) */}
      <div
        className="flex items-center border-b border-stone-800 bg-stone-950/60 overflow-x-auto no-scrollbar px-2"
        role="tablist"
        aria-label={t.presetFirstWorkspace}
      >
        {sections.map((sec, idx) => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              id={`tab-${sec.id}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${sec.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveSection(sec.id)}
              onKeyDown={(e) => handleTabKeyDown(e, idx)}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors focus:ring-2 focus:ring-amber-500 focus-visible:ring-2 focus-visible:ring-amber-500 ${
                isActive
                  ? 'border-amber-500 text-amber-400 bg-amber-500/10'
                  : 'border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-800/40'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{sec.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Section Workspace Body */}
      <div
        id={`panel-${activeSection}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeSection}`}
        className="flex-1 overflow-y-auto p-4 space-y-5"
      >
        {activeSection === 'quick-setup' && (
          <div className="space-y-5">
            {/* Presets Selection Grid */}
            <fieldset className="space-y-2">
              <legend className="text-xs font-medium text-stone-400 mb-1">{t.presetsTitle}</legend>
              <div className="grid grid-cols-2 gap-3">
                {INITIAL_POSTER_PRESETS.map((preset) => {
                  const isSelected = currentState.activePresetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => onSelectPreset?.(preset.id)}
                      className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-amber-500 bg-amber-500/10 text-white ring-1 ring-amber-500/50'
                          : 'border-stone-800 bg-stone-950/40 text-stone-300 hover:border-stone-700 hover:bg-stone-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="font-semibold text-xs">{preset.displayName[isAr ? 'ar' : 'en']}</span>
                        {isSelected && <span className="w-2 h-2 rounded-full bg-amber-400" />}
                      </div>
                      <span className="text-[11px] text-stone-400 leading-relaxed line-clamp-2">
                        {preset.description[isAr ? 'ar' : 'en']}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/* Product Mode Selection */}
            <fieldset
              className="space-y-2"
              role="group"
              aria-label={t.productMode}
              data-testid="visual-studio-template-group"
            >
              <legend className="text-xs font-medium text-stone-400 mb-1">{t.productMode}</legend>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { mode: 'detailed-poster' as const, label: t.detailedPoster },
                  { mode: 'full-tree-overview' as const, label: t.fullTreeOverview },
                  { mode: 'branch-collection' as const, label: t.branchCollection },
                  { mode: 'tiled-wall' as const, label: t.tiledWall },
                ].map(({ mode, label }) => {
                  const isSelected = currentState.productMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => onSwitchProductMode?.(mode)}
                      className={`px-3 py-2 rounded-lg border text-xs font-medium text-center transition-colors ${
                        isSelected
                          ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                          : 'border-stone-800 bg-stone-950/40 text-stone-400 hover:border-stone-700 hover:text-stone-200'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/* Tree Scope Selection */}
            <fieldset
              className="space-y-2"
              role="group"
              aria-label={t.treeScope}
              data-testid="poster-scope-group"
            >
              <legend className="text-xs font-medium text-stone-400 mb-1">{t.treeScope}</legend>
              <div className="grid grid-cols-3 gap-2" data-testid="poster-scope-control">
                {[
                  { scope: 'ancestors' as const, label: t.ancestors },
                  { scope: 'descendants' as const, label: t.descendants },
                  { scope: 'full-tree' as const, label: t.fullTree },
                ].map(({ scope, label }) => {
                  const isSelected = currentState.scope === scope;
                  return (
                    <button
                      key={scope}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => onSwitchScope?.(scope)}
                      className={`px-2.5 py-2 rounded-lg border text-xs font-medium text-center transition-colors ${
                        isSelected
                          ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                          : 'border-stone-800 bg-stone-950/40 text-stone-400 hover:border-stone-700 hover:text-stone-200'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/* Active Preset Summary */}
            <div className="p-3 rounded-xl border border-stone-800 bg-stone-950/40 flex items-center justify-between text-xs">
              <span className="text-stone-400">
                {isAr ? 'النمط الحالي:' : 'Active Preset:'} <strong className="text-amber-300 font-medium">{currentPresetDef?.displayName[isAr ? 'ar' : 'en']}</strong>
              </span>
              <button
                type="button"
                onClick={() => onResetPoster?.(currentState.activePresetId)}
                className="text-amber-400 hover:underline font-medium text-xs"
              >
                {t.resetPoster}
              </button>
            </div>
          </div>
        )}

        {activeSection === 'content' && (
          <div className="space-y-4">
            {/* Focal Root Selection */}
            {posterRootOptions.length > 0 && currentState.scope !== 'full-tree' && (
              <div>
                <label htmlFor="poster-root-select" className="block text-xs font-medium text-stone-400 mb-1.5">{t.selectedRoot}</label>
                <select
                  id="poster-root-select"
                  aria-label={t.selectedRoot}
                  value={effectivePosterRootToken || posterRootOptions[0]?.token}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (onSelectPosterRoot) {
                      onSelectPosterRoot(val);
                    } else {
                      onUpdateContent?.({ selectedPosterRootToken: val });
                    }
                  }}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-xs text-stone-200 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500"
                >
                  {posterRootOptions.map((opt) => (
                    <option key={opt.token} value={opt.token}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Privacy Mode */}
            <fieldset className="space-y-1.5" role="group" aria-label={t.privacyMode}>
              <legend className="text-xs font-medium text-stone-400 mb-1">{t.privacyMode}</legend>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { mode: 'masked' as const, label: t.maskedLiving },
                  { mode: 'owner-full' as const, label: t.ownerFull },
                ].map(({ mode, label }) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => onUpdateContent?.({ privacyMode: mode })}
                    className={`px-3 py-2 rounded-lg border text-xs text-center transition-colors ${
                      currentState.shared.privacyMode === mode
                        ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-medium'
                        : 'border-stone-800 bg-stone-950/40 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Person Card Details Toggle */}
            <fieldset className="space-y-2 border-t border-stone-800 pt-3" role="group" aria-label={t.personDetails}>
              <legend className="text-xs font-medium text-stone-400 mb-1">{t.personDetails}</legend>
              <div className="space-y-2 text-xs">
                {[
                  { key: 'showYears' as const, label: t.showYears },
                  { key: 'showRelationship' as const, label: t.showRelationship },
                  { key: 'showBirthPlace' as const, label: t.showBirthPlace },
                  { key: 'showOccupation' as const, label: t.showOccupation },
                  { key: 'showDescription' as const, label: t.showDescription },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 text-stone-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(currentState.shared[key])}
                      onChange={(e) => onUpdateContent?.({ [key]: e.target.checked })}
                      className="rounded border-stone-700 bg-stone-950 text-amber-500 focus:ring-amber-500/40"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Titles & Footer */}
            <div className="space-y-3 border-t border-stone-800 pt-3">
              <div>
                <label htmlFor="poster-title-input" className="block text-xs font-medium text-stone-400 mb-1">{t.posterTitle}</label>
                <input
                  id="poster-title-input"
                  aria-label={t.posterTitle}
                  type="text"
                  value={posterTitle}
                  onChange={(e) => {
                    onPosterTitleChange?.(e.target.value);
                  }}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label htmlFor="poster-subtitle-input" className="block text-xs font-medium text-stone-400 mb-1">{t.posterSubtitle}</label>
                <input
                  id="poster-subtitle-input"
                  aria-label={t.posterSubtitle}
                  type="text"
                  value={posterSubtitle}
                  onChange={(e) => {
                    onPosterSubtitleChange?.(e.target.value);
                  }}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label htmlFor="poster-footer-input" className="block text-xs font-medium text-stone-400 mb-1">{t.footerText}</label>
                <input
                  id="poster-footer-input"
                  aria-label={t.footerText}
                  type="text"
                  value={currentState.shared.footerText}
                  onChange={(e) => onUpdateContent?.({ footerText: e.target.value })}
                  maxLength={80}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Jozor Branding */}
            <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-stone-800 bg-stone-950/30 hover:border-stone-700 transition-colors cursor-pointer">
              <input
                type="checkbox"
                role="checkbox"
                aria-label={t.showJozorAttribution}
                checked={currentState.shared.showJozorAttribution}
                onChange={(e) => onUpdateContent?.({ showJozorAttribution: e.target.checked })}
                className="w-4 h-4 rounded accent-amber-500"
              />
              <span className="text-xs text-stone-300">{t.showJozorAttribution}</span>
            </label>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => onResetSection?.('content')}
                className="text-xs text-stone-400 hover:text-amber-400 transition-colors"
              >
                {t.resetSection}
              </button>
            </div>
          </div>
        )}

        {activeSection === 'layout' && (
          <div className="space-y-4">
            {/* Layout Mode Selector (Tiered vs Focus Family) */}
            {currentState.productMode === 'detailed-poster' && (
              <fieldset className="space-y-1.5" role="group" aria-label="Layout Engine">
                <legend className="text-xs font-medium text-stone-400 mb-1">
                  {isAr ? 'نمط التخطيط' : 'Layout Engine'}
                </legend>
                <div className="grid grid-cols-2 gap-2" data-testid="poster-layout-engine-control">
                  <button
                    type="button"
                    aria-pressed={currentState.layoutMode === 'tiered'}
                    onClick={() => onSwitchLayoutMode?.('tiered')}
                    className={`px-3 py-2 rounded-lg border text-xs text-center transition-colors ${
                      currentState.layoutMode === 'tiered'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-medium'
                        : 'border-stone-800 bg-stone-950/40 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    {isAr ? 'متدرج' : 'Tiered Generations'}
                  </button>
                  <button
                    type="button"
                    aria-pressed={currentState.layoutMode === 'focus-family'}
                    onClick={() => onSwitchLayoutMode?.('focus-family')}
                    className={`px-3 py-2 rounded-lg border text-xs text-center transition-colors ${
                      currentState.layoutMode === 'focus-family'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-medium'
                        : 'border-stone-800 bg-stone-950/40 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    {isAr ? 'حول شخص' : 'Focus Family'}
                  </button>
                </div>
              </fieldset>
            )}

            {/* Direction */}
            <fieldset className="space-y-1.5" role="group" aria-label={t.treeDirection}>
              <legend className="text-xs font-medium text-stone-400 mb-1">{t.treeDirection}</legend>
              <div className="grid grid-cols-2 gap-2" data-testid="poster-direction-control">
                {[
                  { dir: 'horizontal' as const, label: t.horizontal },
                  { dir: 'vertical' as const, label: t.vertical },
                ].map(({ dir, label }) => (
                  <button
                    key={dir}
                    type="button"
                    aria-pressed={currentState.shared.direction === dir}
                    onClick={() => onUpdateLayout?.({ direction: dir })}
                    className={`px-3 py-2 rounded-lg border text-xs text-center transition-colors ${
                      currentState.shared.direction === dir
                        ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-medium'
                        : 'border-stone-800 bg-stone-950/40 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Depth (Tiered Ancestors/Descendants) */}
            {currentState.layoutMode === 'tiered' && currentState.scope !== 'full-tree' && (
              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1.5">{t.generationsDepth}</label>
                <div className="grid grid-cols-5 gap-1.5" data-testid="poster-depth-control">
                  {[1, 2, 3, 4, 'all' as const].map((depth) => (
                    <button
                      key={String(depth)}
                      type="button"
                      aria-pressed={currentState.tiered.generationDepth === depth}
                      onClick={() => onUpdateLayout?.({ generationDepth: depth as 1 | 2 | 3 | 4 | 'all' })}
                      className={`py-2 rounded-lg border text-xs text-center font-medium transition-colors ${
                        currentState.tiered.generationDepth === depth
                          ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                          : 'border-stone-800 bg-stone-950/40 text-stone-400 hover:border-stone-700'
                      }`}
                    >
                      {depth === 'all' ? (isAr ? 'الكل' : 'All') : depth}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Focus Family Contextual Controls */}
            {currentState.layoutMode === 'focus-family' && (
              <div className="space-y-3 border-t border-stone-800/80 pt-3" data-testid="focus-family-controls">
                {/* Focal Person Token Selector */}
                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-1.5">
                    {isAr ? 'الشخص المحوري' : 'Focal Person'}
                  </label>
                  <select
                    aria-label={isAr ? '\u0627\u0644\u0634\u062e\u0635 \u0627\u0644\u0645\u062d\u0648\u0631\u064a' : 'Focal Person'}
                    value={selectedFocalPersonToken ?? currentState.focus.focalPersonToken}
                    onChange={(e) => onUpdateFocus?.({ focalPersonToken: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                    data-testid="focal-person-select"
                  >
                    {posterRootOptions.length > 0 ? (
                      posterRootOptions.map((opt) => (
                        <option key={opt.token} value={opt.token}>
                          {opt.label}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="focal-token-1">{isAr ? 'الجد الأول (افتراضي)' : 'Ancestor Root 1 (Default)'}</option>
                        <option value="focal-token-2">{isAr ? 'الأب عبد الله' : 'Father Abdullah'}</option>
                        <option value="focal-token-3">{isAr ? 'الابن محمد' : 'Son Mohammed'}</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Ancestor Depth */}
                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-1.5">
                    {isAr ? 'عمق الأسلاف (للأعلى)' : 'Ancestor Depth (Up)'}
                  </label>
                  <div className="grid grid-cols-5 gap-1.5" data-testid="focus-ancestor-depth">
                    {[1, 2, 3, 4, 'all' as const].map((depth) => (
                      <button
                        key={`anc-${depth}`}
                        type="button"
                        aria-pressed={currentState.focus.ancestorDepth === depth}
                        onClick={() => onUpdateFocus?.({ ancestorDepth: depth as 1 | 2 | 3 | 4 | 'all' })}
                        className={`py-2 rounded-lg border text-xs text-center font-medium transition-colors ${
                          currentState.focus.ancestorDepth === depth
                            ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                            : 'border-stone-800 bg-stone-950/40 text-stone-400 hover:border-stone-700'
                        }`}
                      >
                        {depth === 'all' ? (isAr ? 'الكل' : 'All') : depth}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Descendant Depth */}
                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-1.5">
                    {isAr ? 'عمق الأحفاد (للأسفل)' : 'Descendant Depth (Down)'}
                  </label>
                  <div className="grid grid-cols-5 gap-1.5" data-testid="focus-descendant-depth">
                    {[1, 2, 3, 4, 'all' as const].map((depth) => (
                      <button
                        key={`desc-${depth}`}
                        type="button"
                        aria-pressed={currentState.focus.descendantDepth === depth}
                        onClick={() => onUpdateFocus?.({ descendantDepth: depth as 1 | 2 | 3 | 4 | 'all' })}
                        className={`py-2 rounded-lg border text-xs text-center font-medium transition-colors ${
                          currentState.focus.descendantDepth === depth
                            ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                            : 'border-stone-800 bg-stone-950/40 text-stone-400 hover:border-stone-700'
                        }`}
                      >
                        {depth === 'all' ? (isAr ? 'الكل' : 'All') : depth}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Include Spouses & Siblings Checkboxes */}
                <div className="space-y-2 text-xs pt-1">
                  <label className="flex items-center gap-2 text-stone-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentState.focus.includeSpouses}
                      onChange={(e) => onUpdateFocus?.({ includeSpouses: e.target.checked })}
                      className="rounded border-stone-700 bg-stone-950 text-amber-500 focus:ring-amber-500/40"
                      data-testid="focus-include-spouses"
                    />
                    <span>{isAr ? 'تضمين الأزواج والزوجات' : 'Include Spouses'}</span>
                  </label>

                  <label className="flex items-center gap-2 text-stone-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentState.focus.includeSiblings}
                      onChange={(e) => onUpdateFocus?.({ includeSiblings: e.target.checked })}
                      className="rounded border-stone-700 bg-stone-950 text-amber-500 focus:ring-amber-500/40"
                      data-testid="focus-include-siblings"
                    />
                    <span>{isAr ? 'تضمين الإخوة والأخوات' : 'Include Siblings'}</span>
                  </label>
                </div>
              </div>
            )}

            {/* Spacing Density */}
            <fieldset className="space-y-1.5" role="group" aria-label={t.treeSpacing}>
              <legend className="text-xs font-medium text-stone-400 mb-1">{t.treeSpacing}</legend>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { sp: 'style-default' as const, label: t.spacingDefault },
                  { sp: 'compact' as const, label: t.spacingCompact },
                  { sp: 'balanced' as const, label: t.spacingBalanced },
                  { sp: 'airy' as const, label: t.spacingAiry },
                ].map(({ sp, label }) => (
                  <button
                    key={sp}
                    type="button"
                    onClick={() => onUpdateLayout?.({ spacing: sp === 'style-default' ? 'balanced' : sp })}
                    className={`px-3 py-2 rounded-lg border text-xs text-center transition-colors ${
                      currentState.shared.spacing === sp
                        ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-medium'
                        : 'border-stone-800 bg-stone-950/40 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => onResetSection?.('layout')}
                className="text-xs text-stone-400 hover:text-amber-400 transition-colors"
              >
                {t.resetSection}
              </button>
            </div>
          </div>
        )}

        {activeSection === 'cards' && (
          <div className="space-y-4">
            {/* Photo Visibility */}
            <div className="space-y-2 text-xs">
              <label className="flex items-center gap-2 text-stone-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentState.shared.includePhotos}
                  onChange={(e) => onUpdateCards?.({ includePhotos: e.target.checked })}
                  className="rounded border-stone-700 bg-stone-950 text-amber-500 focus:ring-amber-500/40"
                />
                <span>{t.showPhotos}</span>
              </label>

              {currentState.shared.includePhotos && (
                <label className="flex items-center gap-2 text-stone-300 cursor-pointer mr-4">
                  <input
                    type="checkbox"
                    checked={currentState.shared.hideLivingPhotos}
                    onChange={(e) => onUpdateCards?.({ hideLivingPhotos: e.target.checked })}
                    className="rounded border-stone-700 bg-stone-950 text-amber-500 focus:ring-amber-500/40"
                  />
                  <span>{t.hideLivingPhotos}</span>
                </label>
              )}
            </div>

            {/* Photo Shape */}
            {currentState.shared.includePhotos && (
              <fieldset className="space-y-1.5 border-t border-stone-800 pt-3" role="group" aria-label={t.photoShape}>
                <legend className="text-xs font-medium text-stone-400 mb-1">{t.photoShape}</legend>
                <div className="grid grid-cols-3 gap-2" data-testid="poster-photo-shape-control">
                  {[
                    { shape: 'circle' as const, label: t.photoCircle },
                    { shape: 'square' as const, label: t.photoSquare },
                    { shape: 'rounded' as const, label: t.photoRounded },
                  ].map(({ shape, label }) => (
                    <button
                      key={shape}
                      type="button"
                      aria-pressed={currentState.shared.photoShape === shape}
                      onClick={() => onUpdateCards?.({ photoShape: shape })}
                      className={`px-2.5 py-2 rounded-lg border text-xs text-center transition-colors ${
                        currentState.shared.photoShape === shape
                          ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-medium'
                          : 'border-stone-800 bg-stone-950/40 text-stone-400 hover:border-stone-700'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            {/* Card Scale */}
            <fieldset className="space-y-1.5 border-t border-stone-800 pt-3" role="group" aria-label={t.cardScale}>
              <legend className="text-xs font-medium text-stone-400 mb-1">{t.cardScale}</legend>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { sc: 'compact' as const, label: t.cardScaleCompact },
                  { sc: 'standard' as const, label: t.cardScaleStandard },
                  { sc: 'large' as const, label: t.cardScaleLarge },
                ].map(({ sc, label }) => (
                  <button
                    key={sc}
                    type="button"
                    onClick={() => onUpdateCards?.({ cardScale: sc })}
                    className={`px-2.5 py-2 rounded-lg border text-xs text-center transition-colors ${
                      currentState.shared.cardScale === sc
                        ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-medium'
                        : 'border-stone-800 bg-stone-950/40 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Card Layout */}
            <fieldset className="space-y-1.5 border-t border-stone-800 pt-3" role="group" aria-label={t.cardLayout}>
              <legend className="text-xs font-medium text-stone-400 mb-1">{t.cardLayout}</legend>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { cl: 'standard' as const, label: t.cardLayoutStandard },
                  { cl: 'photo-hero' as const, label: t.cardLayoutPhotoHero },
                  { cl: 'text-minimal' as const, label: t.cardLayoutTextMinimal },
                ].map(({ cl, label }) => (
                  <button
                    key={cl}
                    type="button"
                    aria-pressed={currentState.shared.cardLayout === cl}
                    onClick={() => onUpdateCards?.({ cardLayout: cl as unknown as SharedPosterSettings['cardLayout'] })}
                    className={`px-2.5 py-2 rounded-lg border text-xs text-center transition-colors ${
                      String(currentState.shared.cardLayout) === String(cl)
                        ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-medium'
                        : 'border-stone-800 bg-stone-950/40 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Card Effect */}
            <fieldset className="space-y-1.5 border-t border-stone-800 pt-3" role="group" aria-label={t.cardEffect}>
              <legend className="text-xs font-medium text-stone-400 mb-1">{t.cardEffect}</legend>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { ce: 'style-default' as const, label: t.cardEffectDefault },
                  { ce: 'none' as const, label: t.cardEffectNone },
                  { ce: 'soft' as const, label: t.cardEffectSoft },
                  { ce: 'hard' as const, label: t.cardEffectHard },
                ].map(({ ce, label }) => (
                  <button
                    key={ce}
                    type="button"
                    aria-pressed={String(currentState.shared.cardEffect) === String(ce)}
                    onClick={() => onUpdateCards?.({ cardEffect: ce as unknown as SharedPosterSettings['cardEffect'] })}
                    className={`px-2.5 py-2 rounded-lg border text-xs text-center transition-colors ${
                      String(currentState.shared.cardEffect) === String(ce)
                        ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-medium'
                        : 'border-stone-800 bg-stone-950/40 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Card Border Frame */}
            <fieldset className="space-y-1.5 border-t border-stone-800 pt-3" role="group" aria-label={t.cardFrame}>
              <legend className="text-xs font-medium text-stone-400 mb-1">{t.cardFrame}</legend>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { cf: 'style-default' as const, label: t.cardFrameDefault },
                  { cf: 'minimal' as const, label: t.cardFrameMinimal },
                  { cf: 'classic' as const, label: t.cardFrameClassic },
                  { cf: 'ornate' as const, label: t.cardFrameOrnate },
                ].map(({ cf, label }) => (
                  <button
                    key={cf}
                    type="button"
                    aria-pressed={currentState.shared.cardFrame === cf}
                    onClick={() => onUpdateCards?.({ cardFrame: cf })}
                    className={`px-2.5 py-2 rounded-lg border text-xs text-center transition-colors ${
                      currentState.shared.cardFrame === cf
                        ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-medium'
                        : 'border-stone-800 bg-stone-950/40 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Card Corner Style */}
            <fieldset className="space-y-1.5 border-t border-stone-800 pt-3" role="group" aria-label={t.cardCorner}>
              <legend className="text-xs font-medium text-stone-400 mb-1">{t.cardCorner}</legend>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { cc: 'style-default' as const, label: t.cardCornerDefault },
                  { cc: 'square' as const, label: t.cardCornerSquare },
                  { cc: 'soft' as const, label: t.cardCornerSoft },
                  { cc: 'rounded' as const, label: t.cardCornerRounded },
                ].map(({ cc, label }) => (
                  <button
                    key={cc}
                    type="button"
                    aria-pressed={currentState.shared.cardCorner === cc}
                    onClick={() => onUpdateCards?.({ cardCorner: cc })}
                    className={`px-2.5 py-2 rounded-lg border text-xs text-center transition-colors ${
                      currentState.shared.cardCorner === cc
                        ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-medium'
                        : 'border-stone-800 bg-stone-950/40 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => onResetSection?.('cards')}
                className="text-xs text-stone-400 hover:text-amber-400 transition-colors"
              >
                {t.resetSection}
              </button>
            </div>
          </div>
        )}

        {activeSection === 'appearance' && (
          <div className="space-y-4">
            {/* Color Palette */}
            <fieldset className="space-y-1.5" role="group" aria-label={t.colorPalette} data-testid="poster-color-palette-controls">
              <legend className="text-xs font-medium text-stone-400 mb-1">{t.colorPalette}</legend>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { cp: 'style-default' as const, label: t.paletteDefault },
                  { cp: 'heritage-warm' as const, label: t.paletteWarm },
                  { cp: 'gallery-dark' as const, label: t.paletteGallery },
                  { cp: 'evergreen' as const, label: t.paletteEvergreen },
                  { cp: 'monochrome-print' as const, label: t.paletteMonochrome },
                ].map(({ cp, label }) => (
                  <button
                    key={cp}
                    type="button"
                    aria-pressed={currentState.shared.colorPalette === cp}
                    onClick={() => onUpdateAppearance?.({ colorPalette: cp as SharedPosterSettings['colorPalette'] })}
                    className={`px-2.5 py-2 rounded-lg border text-xs text-center transition-colors ${
                      currentState.shared.colorPalette === cp
                        ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-medium'
                        : 'border-stone-800 bg-stone-950/40 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Connector Style */}
            <fieldset className="space-y-1.5 border-t border-stone-800 pt-3" role="group" aria-label={t.connectors} data-testid="poster-connector-style-controls">
              <legend className="text-xs font-medium text-stone-400 mb-1">{t.connectors}</legend>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { cs: 'subtle' as const, label: t.connSubtle },
                  { cs: 'classic' as const, label: t.connClassic },
                  { cs: 'bold' as const, label: t.connBold },
                ].map(({ cs, label }) => (
                  <button
                    key={cs}
                    type="button"
                    aria-pressed={currentState.shared.connectorStyle === cs}
                    onClick={() => onUpdateAppearance?.({ connectorStyle: cs as SharedPosterSettings['connectorStyle'] })}
                    className={`px-2.5 py-2 rounded-lg border text-xs text-center transition-colors ${
                      currentState.shared.connectorStyle === cs
                        ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-medium'
                        : 'border-stone-800 bg-stone-950/40 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Connector Path */}
            <fieldset className="space-y-1.5 border-t border-stone-800 pt-3" role="group" aria-label={t.connectorPath} data-testid="poster-connector-path-controls">
              <legend className="text-xs font-medium text-stone-400 mb-1">{t.connectorPath}</legend>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { cp: 'curved' as const, label: t.connPathCurved },
                  { cp: 'straight' as const, label: t.connPathStraight },
                  { cp: 'angular' as const, label: t.connPathAngular },
                ].map(({ cp, label }) => (
                  <button
                    key={cp}
                    type="button"
                    aria-pressed={currentState.shared.connectorPath === cp}
                    onClick={() => onUpdateAppearance?.({ connectorPath: cp as SharedPosterSettings['connectorPath'] })}
                    className={`px-2.5 py-2 rounded-lg border text-xs text-center transition-colors ${
                      currentState.shared.connectorPath === cp
                        ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-medium'
                        : 'border-stone-800 bg-stone-950/40 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Background Texture / Decoration */}
            <fieldset className="space-y-1.5 border-t border-stone-800 pt-3" role="group" aria-label={t.decoration}>
              <legend className="text-xs font-medium text-stone-400 mb-1">{t.decoration}</legend>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { dec: 'style-default' as const, label: t.spacingDefault },
                  { dec: 'none' as const, label: t.cardEffectNone },
                  { dec: 'warm-paper' as const, label: t.decorWarmPaper },
                  { dec: 'lineage-grid' as const, label: t.decorLineageGrid },
                ].map(({ dec, label }) => (
                  <button
                    key={dec}
                    type="button"
                    aria-pressed={currentState.shared.decoration === dec}
                    onClick={() => onUpdateAppearance?.({ decoration: dec as SharedPosterSettings['decoration'] })}
                    className={`px-2.5 py-2 rounded-lg border text-xs text-center transition-colors ${
                      currentState.shared.decoration === dec
                        ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-medium'
                        : 'border-stone-800 bg-stone-950/40 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Corner Ornaments */}
            <fieldset className="space-y-1.5 border-t border-stone-800 pt-3" role="group" aria-label={t.ornament}>
              <legend className="text-xs font-medium text-stone-400 mb-1">{t.ornament}</legend>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { orn: 'style-default' as const, label: t.spacingDefault },
                  { orn: 'none' as const, label: t.cardEffectNone },
                  { orn: 'corner-filigree' as const, label: t.ornCornerFiligree },
                  { orn: 'corner-branches' as const, label: t.ornCornerBranches },
                ].map(({ orn, label }) => (
                  <button
                    key={orn}
                    type="button"
                    aria-pressed={currentState.shared.ornament === orn}
                    onClick={() => onUpdateAppearance?.({ ornament: orn as SharedPosterSettings['ornament'] })}
                    className={`px-2.5 py-2 rounded-lg border text-xs text-center transition-colors ${
                      currentState.shared.ornament === orn
                        ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-medium'
                        : 'border-stone-800 bg-stone-950/40 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Typography Scale */}
            <fieldset className="space-y-1.5 border-t border-stone-800 pt-3" role="group" aria-label={t.typography}>
              <legend className="text-xs font-medium text-stone-400 mb-1">{t.typography}</legend>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { ty: 'balanced' as const, label: t.typoBalanced },
                  { ty: 'prominent' as const, label: t.typoProminent },
                  { ty: 'compact' as const, label: t.typoCompact },
                ].map(({ ty, label }) => (
                  <button
                    key={ty}
                    type="button"
                    aria-pressed={currentState.shared.typography === ty}
                    onClick={() => onUpdateAppearance?.({ typography: ty as SharedPosterSettings['typography'] })}
                    className={`px-2.5 py-2 rounded-lg border text-xs text-center transition-colors ${
                      currentState.shared.typography === ty
                        ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-medium'
                        : 'border-stone-800 bg-stone-950/40 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Arabic Font */}
            <fieldset className="space-y-1.5 border-t border-stone-800 pt-3" role="group" aria-label={t.fontFamily}>
              <legend className="text-xs font-medium text-stone-400 mb-1">{t.fontFamily}</legend>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { ff: 'amiri' as const, label: t.fontAmiri },
                  { ff: 'noto-sans-arabic' as const, label: t.fontNotoSans },
                ].map(({ ff, label }) => (
                  <button
                    key={ff}
                    type="button"
                    aria-pressed={currentState.shared.fontFamily === ff}
                    onClick={() => onUpdateAppearance?.({ fontFamily: ff as SharedPosterSettings['fontFamily'] })}
                    className={`px-2.5 py-2 rounded-lg border text-xs text-center transition-colors ${
                      currentState.shared.fontFamily === ff
                        ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-medium'
                        : 'border-stone-800 bg-stone-950/40 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Page Border Frame */}
            <fieldset className="space-y-1.5 border-t border-stone-800 pt-3" role="group" aria-label={t.pageFrame}>
              <legend className="text-xs font-medium text-stone-400 mb-1">{t.pageFrame}</legend>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { pf: 'style-default' as const, label: t.spacingDefault },
                  { pf: 'heritage' as const, label: t.ornHeritage },
                  { pf: 'gallery' as const, label: t.ornGallery },
                  { pf: 'minimal' as const, label: t.ornMinimal },
                  { pf: 'ornate-corner-filigree' as const, label: t.ornOrnateCornerFiligree },
                ].map(({ pf, label }) => (
                  <button
                    key={pf}
                    type="button"
                    aria-pressed={currentState.shared.pageFrame === pf}
                    onClick={() => onUpdateAppearance?.({ pageFrame: pf as SharedPosterSettings['pageFrame'] })}
                    className={`px-2.5 py-2 rounded-lg border text-xs text-center transition-colors ${
                      currentState.shared.pageFrame === pf
                        ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-medium'
                        : 'border-stone-800 bg-stone-950/40 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Header Layout Style */}
            <fieldset className="space-y-1.5 border-t border-stone-800 pt-3" role="group" aria-label={t.headerStyle}>
              <legend className="text-xs font-medium text-stone-400 mb-1">{t.headerStyle}</legend>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { hs: 'style-default' as const, label: t.spacingDefault },
                  { hs: 'ceremonial' as const, label: t.headerCeremonial },
                  { hs: 'modern-banner' as const, label: t.headerModernBanner },
                  { hs: 'minimal' as const, label: t.headerMinimal },
                ].map(({ hs, label }) => (
                  <button
                    key={hs}
                    type="button"
                    aria-pressed={currentState.shared.header === hs}
                    onClick={() => onUpdateAppearance?.({ header: hs as SharedPosterSettings['header'] })}
                    className={`px-2.5 py-2 rounded-lg border text-xs text-center transition-colors ${
                      currentState.shared.header === hs
                        ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-medium'
                        : 'border-stone-800 bg-stone-950/40 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => onResetSection?.('appearance')}
                className="text-xs text-stone-400 hover:text-amber-400 transition-colors"
              >
                {t.resetSection}
              </button>
            </div>
          </div>
        )}

        {activeSection === 'print' && (
          <div className="space-y-4">
            {/* Paper Size */}
            <fieldset className="space-y-1.5" role="group" aria-label={t.pageSize}>
              <legend className="text-xs font-medium text-stone-400 mb-1">{t.pageSize}</legend>
              <div className="grid grid-cols-5 gap-1.5">
                {(['A4', 'A3', 'A2', 'A1', 'A0'] as const).map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    aria-pressed={currentState.shared.size === sz}
                    onClick={() => onUpdatePrint?.({ size: sz })}
                    className={`px-2.5 py-2 rounded-lg border text-xs text-center transition-colors ${
                      currentState.shared.size === sz
                        ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-medium'
                        : 'border-stone-800 bg-stone-950/40 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Orientation */}
            <fieldset className="space-y-1.5 border-t border-stone-800 pt-3" role="group" aria-label={t.orientation}>
              <legend className="text-xs font-medium text-stone-400 mb-1">{t.orientation}</legend>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { val: 'landscape' as const, label: t.landscape },
                  { val: 'portrait' as const, label: t.portrait },
                ].map(({ val, label }) => (
                  <button
                    key={val}
                    type="button"
                    aria-pressed={currentState.shared.orientation === val}
                    onClick={() => onUpdatePrint?.({ orientation: val })}
                    className={`px-2.5 py-2 rounded-lg border text-xs text-center transition-colors ${
                      currentState.shared.orientation === val
                        ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-medium'
                        : 'border-stone-800 bg-stone-950/40 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Print Margins */}
            <fieldset className="space-y-1.5 border-t border-stone-800 pt-3">
              <legend className="text-xs font-medium text-stone-400 mb-1">{t.margins}</legend>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { mp: 'compact' as const, label: t.marginCompact },
                  { mp: 'balanced' as const, label: t.marginBalanced },
                  { mp: 'generous' as const, label: t.marginGenerous },
                ].map(({ mp, label }) => (
                  <button
                    key={mp}
                    type="button"
                    aria-pressed={currentState.shared.marginPreset === mp}
                    onClick={() => onUpdatePrint?.({ marginPreset: mp })}
                    className={`px-2.5 py-2 rounded-lg border text-xs text-center transition-colors ${
                      currentState.shared.marginPreset === mp
                        ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-medium'
                        : 'border-stone-800 bg-stone-950/40 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Tiled Wall Options */}
            {currentState.productMode === 'tiled-wall' && (
              <div className="space-y-3 border-t border-stone-800 pt-3">
                <div>
                  <label htmlFor="tiled-rows-select" className="block text-xs font-medium text-stone-400 mb-1">{t.tiledRows}</label>
                  <select
                    id="tiled-rows-select"
                    aria-label={t.tiledRows}
                    value={currentState.productBucket?.tiledRows ?? 3}
                    onChange={(e) => onUpdatePrint?.({ tiledRows: Number(e.target.value) })}
                    className="w-full px-2.5 py-2 bg-stone-950 border border-stone-800 rounded-lg text-xs text-stone-200"
                  >
                    {[2, 3, 4, 5, 6, 7, 8].map((num) => (
                      <option key={num} value={num}>{num}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="tiled-cols-select" className="block text-xs font-medium text-stone-400 mb-1">{t.tiledColumns}</label>
                  <select
                    id="tiled-cols-select"
                    aria-label={t.tiledColumns}
                    value={currentState.productBucket?.tiledColumns ?? 3}
                    onChange={(e) => onUpdatePrint?.({ tiledColumns: Number(e.target.value) })}
                    className="w-full px-2.5 py-2 bg-stone-950 border border-stone-800 rounded-lg text-xs text-stone-200"
                  >
                    {[2, 3, 4, 5, 6, 7, 8].map((num) => (
                      <option key={num} value={num}>{num}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Print Quality Gate Alert Notice */}
            {showQualityWarning && (
              <div className="p-3.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-200 text-xs flex gap-2.5 items-start">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <strong className="font-semibold block text-amber-300">{t.printQualityGateTitle}</strong>
                  <p className="text-[11px] text-amber-200/90 leading-relaxed">{t.printQualityGateWarning}</p>
                </div>
              </div>
            )}

            {/* Tiled Wall Notice */}
            {showTiledWallTileNotice && (
              <div className="p-3.5 rounded-xl border border-blue-500/40 bg-blue-500/10 text-blue-200 text-xs flex gap-2.5 items-start">
                <AlertTriangle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <strong className="font-semibold block text-blue-300">{t.tiledWall}</strong>
                  <p className="text-[11px] text-blue-200/90 leading-relaxed">{t.tiledWallGuidance}</p>
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => onResetSection?.('print')}
                className="text-xs text-stone-400 hover:text-amber-400 transition-colors"
              >
                {t.resetSection}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
