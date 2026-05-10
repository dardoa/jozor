// @ts-nocheck
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsDrawer } from '../SettingsDrawer';
import { DEFAULT_TREE_SETTINGS } from '../../../constants';

const mockState = {
  isSettingsDrawerOpen: true,
  setSettingsDrawerOpen: vi.fn(),
  focusId: 'person-1',
  people: {
    'person-1': { id: 'person-1', firstName: 'Amina', middleName: '', lastName: 'Saleh' },
    'person-2': { id: 'person-2', firstName: 'Omar', middleName: '', lastName: 'Hassan' },
  },
  treeSettings: DEFAULT_TREE_SETTINGS,
  setTreeSettings: vi.fn(),
};

vi.mock('../../../store/useAppStore', () => ({
  useAppStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}));

vi.mock('../../../context/TranslationContext', () => ({
  useTranslation: () => ({
    t: {
      close: 'Close',
      cancel: 'Cancel',
      confirm: 'Confirm',
      unnamedPerson: 'Unnamed person',
      settings: {
        title: 'Tree Settings',
        subtitle: 'Customize view & performance',
        resetAll: 'Global Reset',
        resetConfirm: 'Reset all settings to defaults?',
        close: 'Close Settings',
        appearance: 'Appearance',
        visibility: 'Visibility',
        performance: 'Performance',
        advancedGraph: 'Advanced Controls',
        resetSection: 'Reset Section',
        lowGraphics: 'Low Graphics Mode',
        lowGraphicsDesc: 'Disables blurs & heavy animations',
        presets: 'Presets',
        appearanceLab: 'Appearance Lab',
        appearanceLabSubtitle: 'Presets first, visibility next, advanced tuning only when you need it.',
        appearanceLabHero: 'Shape the tree in two steps',
        appearanceLabHeroHint: 'Choose a preset for the overall feel, then decide how much identity and privacy detail should remain visible.',
        appearanceOverview: 'Start with a preset, then adjust chart mode, theme, and accent color.',
        visibilityOverview: 'Choose which names, dates, places, and details appear on the chart.',
        advancedOverview: 'Use these controls only when the presets are close but you still need precise branch or rendering behavior.',
        performanceOverview: 'Reduce heavy visual effects on slower devices and lower-powered screens.',
        advancedRevealHint: 'Reveal spacing, connector, branch highlight, and performance controls.',
        coreSection: 'Core Engine',
        treeMode: 'Tree Mode',
        orientation: 'Orientation',
        themeStyle: 'Theme Style',
        heritage: 'Heritage',
        modernPure: 'Modern Pure',
        fontPicker: 'Typography',
        cornerRadius: 'Corner Radius',
        densitySpacing: 'Density',
        layout: 'Layout & Spacing',
        zoomLevel: 'Zoom',
        spacing: 'Spacing',
        horizontalSpread: 'Horizontal Spread',
        verticalSpread: 'Vertical Spread',
        visibleContent: 'Visible Content',
        names: 'Names',
        places: 'Places',
        advancedSettings: 'Advanced Settings',
        engine: 'Engine',
        details: 'Details',
        focusOptions: 'Focus Options',
        classic: 'Classic',
        compact: 'Compact',
        artistic: 'Artistic',
        classicHint: 'Balanced focus view with readable names, dates, and clean spacing.',
        compactHint: 'Dense layout for very large trees with tighter spacing and fewer details.',
        artisticHint: 'Radial storytelling mode with more visual personality and softer hierarchy.',
        chartMode: 'Chart Mode',
        chartModeHint: 'Focus Mode keeps the main lineage readable, while Radial Mode favors presentation and exploration.',
        visualTheme: 'Visual Theme',
        themeColor: 'Theme Color',
        themeColorHint: 'Accent color becomes more visible when lineage styling or artistic presentation is active.',
        themeOptions: {
          modern: 'Modern',
          vintage: 'Vintage',
          blueprint: 'Blueprint',
          dark: 'Night',
        },
        nameFields: 'Name',
        coreFacts: 'Core Facts',
        placeFields: 'Places',
        detailFields: 'Details',
        privacyAndAids: 'Privacy & Aids',
        securityAndPrivacy: 'Security & Privacy',
        privacyMode: 'Privacy Mode',
        privacyModeHint: 'Privacy mode reduces sensitive detail density in shared or public viewing situations without changing the underlying records.',
        deceasedVisibilityHint: 'Deceased visibility changes who stays in the chart, not just which badge is shown.',
        selectAll: 'Select all',
        deselectAll: 'Deselect all',
        layoutOverview: 'Fine-tune spacing, density, and connector behavior after choosing a preset.',
        layoutEngine: 'Layout Engine',
        visualMetrics: 'Visual Metrics',
        boxWidth: 'Box Width',
        textSize: 'Text Size',
        hSpacing: 'Horizontal Spacing',
        vSpacing: 'Vertical Spacing',
        nodesLines: 'Nodes & Lines',
        compactNodes: 'Compact Nodes',
        visibleGenerations: 'Visible Generations',
        lineStyle: 'Line Style',
        lineThickness: 'Line Thickness',
        nodeColorLogic: 'Node Color Logic',
        highlightFocus: 'Highlight Focus Branch',
        highlightFocusHint: 'Branch highlighting currently follows the focused person unless a dedicated branch root is chosen elsewhere.',
        branchRoot: 'Branch Root',
        currentFocusRoot: 'Current focus person',
        branchRootHint: 'Choose a different person only when you want to keep highlighting the same branch while moving focus elsewhere.',
        diagnosticsMovedHint: 'Diagnostics and maintenance tools are now available from the Tree menu.',
      },
      focus: 'Focus',
      radial: 'Radial',
      vertical: 'Vertical',
      horizontal: 'Horizontal',
      firstName: 'First name',
      middleName: 'Middle name',
      lastName: 'Last name',
      nickName: 'Nickname',
      birthName: 'Birth Name',
      title: 'Title',
      suffix: 'Suffix',
      dates: 'Dates',
      birthDate: 'Birth Date',
      marriageDate: 'Marriage Date',
      deathDate: 'Death Date',
      birthPlace: 'Birth Place',
      marriagePlace: 'Marriage Place',
      burialPlace: 'Burial Place',
      address: 'Residence',
      photos: 'Photos',
      gender: 'Gender',
      profession: 'Occupation',
      deceased: 'Deceased',
      minimap: 'Minimap',
    },
  }),
}));

vi.mock('../../../context/OverlayContext', () => ({
  OverlayPrimitive: ({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) =>
    isOpen ? <div>{children}</div> : null,
}));

vi.mock('../../ConfirmationModal', () => ({
  ConfirmationModal: () => null,
}));

describe('SettingsDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.treeSettings = DEFAULT_TREE_SETTINGS;
  });

  it('renders the appearance lab surface without the old tab navigation', async () => {
    render(<SettingsDrawer />);

    expect(screen.getByRole('heading', { name: 'Appearance Lab' })).toBeInTheDocument();
    expect(screen.getByText('Core Engine')).toBeInTheDocument();
    expect(await screen.findByText('Theme Style')).toBeInTheDocument();
    expect(screen.getAllByText('Heritage').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Modern Pure').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Artistic').length).toBeGreaterThan(0);
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('shows focus and radial chart mode options plus orientation choices', () => {
    render(<SettingsDrawer />);

    expect(screen.getByText('Tree Mode')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Focus' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Radial' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Vertical' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Horizontal' })).toBeInTheDocument();
  });

  it('shows visible content controls and removes legacy time-offset copy', async () => {
    render(<SettingsDrawer />);

    fireEvent.click(await screen.findByRole('button', { name: /Visible Content/i }));

    expect(screen.getByText('Photos')).toBeInTheDocument();
    expect(screen.getByText('Names')).toBeInTheDocument();
    expect(screen.getByText('Dates')).toBeInTheDocument();
    expect(screen.getByText('Places')).toBeInTheDocument();
    expect(screen.queryByText('Enable Time Offset')).not.toBeInTheDocument();
  });

  it('reveals advanced branch controls from the advanced section', async () => {
    mockState.treeSettings = { ...DEFAULT_TREE_SETTINGS, highlightBranch: true };

    render(<SettingsDrawer />);

    fireEvent.click(await screen.findByRole('button', { name: /Advanced Settings/i }));
    fireEvent.click(await screen.findByRole('button', { name: 'Performance' }));

    expect(screen.getByText('Focus Options')).toBeInTheDocument();
    expect(screen.getByText('Highlight Focus Branch')).toBeInTheDocument();
  });
});

