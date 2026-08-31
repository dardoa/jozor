import React, { useState, useMemo } from 'react';
import {
  RotateCcw,
  RotateCw,
  RefreshCw,
  Sparkles,
  CreditCard,
  Palette,
  Network,
} from 'lucide-react';
import type {
  PosterDesignState,
  PosterTreeScope,
  SharedPosterSettings,
  TieredSettingsBucket,
  FocusSettingsBucket,
  RadialSettingsBucket,
  VisualOutputDefinition,
} from '../../../publishing';
import { createInitialPosterDesignState } from '../../../publishing';
import type {
  VisualStudioPosterRootOption,
} from './visualStudioPosterOptions';
import { VisualOutputAppearanceSection } from './VisualOutputAppearanceSection';
import { VisualOutputCardsSection } from './VisualOutputCardsSection';
import { VisualOutputQuickSetupSection } from './VisualOutputQuickSetupSection';
import { VisualOutputTreeLayoutSection } from './VisualOutputTreeLayoutSection';

export type StudioWorkspaceSectionId = 'quick-setup' | 'tree-layout' | 'cards' | 'appearance';

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
  onUpdateFocus?: (updates: Partial<FocusSettingsBucket>) => void;
  onUpdateRadial?: (updates: Partial<RadialSettingsBucket>) => void;
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
  activeSection?: StudioWorkspaceSectionId;
  onActiveSectionChange?: (section: StudioWorkspaceSectionId) => void;
}

const ar = {
  selectedBranch: 'فرع محدد',
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
  diagramType: 'كيف تريد عرض عائلتك؟',
  tieredDiagram: 'شجرة أجيال',
  focusDiagram: 'حول شخص',
  radialDiagram: 'دائري / مروحي',
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
  cardEffectNone: 'مسطح',
  cardEffectSoft: 'ظل ناعم',
  cardEffectHard: 'بارز',
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
  selectedBranch: 'Selected Branch',
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
  diagramType: 'How do you want to show your family?',
  tieredDiagram: 'Generation Tree',
  focusDiagram: 'Around a Person',
  radialDiagram: 'Radial / Fan',
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
  cardEffectNone: 'Flat',
  cardEffectSoft: 'Soft Drop Shadow',
  cardEffectHard: 'Elevated',
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

export type VisualOutputConfigCopy = { readonly [Key in keyof typeof en]: string };

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
  onUpdateFocus,
  onUpdateRadial,
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
  onActiveSectionChange,
}) => {
  const isAr = language === 'ar';
  const t = isAr ? ar : en;

  const currentState = useMemo(() => {
    return state ?? createInitialPosterDesignState('classic-heritage');
  }, [state]);

  const [internalActiveSection, setInternalActiveSection] = useState<StudioWorkspaceSectionId>('quick-setup');
  const activeSection = propActiveSection ?? internalActiveSection;
  const setActiveSection = (section: StudioWorkspaceSectionId) => {
    if (propActiveSection === undefined) {
      setInternalActiveSection(section);
    }
    onActiveSectionChange?.(section);
  };

  const sections: Array<{ id: StudioWorkspaceSectionId; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'quick-setup', label: t.quickSetup, icon: Sparkles },
    { id: 'tree-layout', label: isAr ? 'الشجرة والتخطيط' : 'Tree & Layout', icon: Network },
    { id: 'cards', label: t.cards, icon: CreditCard },
    { id: 'appearance', label: t.appearance, icon: Palette },
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
      className="flex w-full flex-col overflow-hidden rounded-xl border border-stone-800 bg-stone-900 text-stone-100 shadow-xl lg:max-h-[72vh]"
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
        className="grid grid-cols-2 border-b border-stone-800 bg-stone-950/60 px-2"
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
              className={`flex min-h-11 min-w-0 items-center gap-2 border-b-2 px-3 py-2.5 text-start text-xs font-medium leading-tight transition-colors focus:ring-2 focus:ring-amber-500 focus-visible:ring-2 focus-visible:ring-amber-500 ${
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
        className={`min-h-0 flex-1 overflow-y-auto p-4 ${
          activeSection === 'tree-layout' ? 'flex flex-col gap-5' : 'space-y-5'
        }`}
      >
        {activeSection === 'quick-setup' && (
          <VisualOutputQuickSetupSection
            language={language}
            state={currentState}
            copy={t}
            posterTitle={posterTitle}
            posterSubtitle={posterSubtitle}
            onSelectPreset={onSelectPreset}
            onPosterTitleChange={onPosterTitleChange}
            onPosterSubtitleChange={onPosterSubtitleChange}
            onUpdateContent={onUpdateContent}
          />
        )}

        {activeSection === 'tree-layout' && (
          <VisualOutputTreeLayoutSection
            language={language}
            state={currentState}
            copy={t}
            posterRootOptions={posterRootOptions}
            selectedPosterRootToken={selectedPosterRootToken}
            selectedFocalPersonToken={selectedFocalPersonToken}
            onSelectPosterRoot={onSelectPosterRoot}
            onUpdateContent={onUpdateContent}
            onUpdateLayout={onUpdateLayout}
            onUpdateFocus={onUpdateFocus}
            onUpdateRadial={onUpdateRadial}
            onResetLayout={() => onResetSection?.('layout')}
          />
        )}

        {activeSection === 'cards' && (
          <VisualOutputCardsSection
            language={language}
            state={currentState}
            copy={t}
            onUpdate={onUpdateCards}
            onUpdateContent={onUpdateContent}
            onReset={() => onResetSection?.('cards')}
          />
        )}

        {activeSection === 'appearance' && (
          <VisualOutputAppearanceSection
            language={language}
            state={currentState}
            copy={t}
            onUpdate={onUpdateAppearance}
            onReset={() => onResetSection?.('appearance')}
          />
        )}

      </div>
    </div>
  );
};
