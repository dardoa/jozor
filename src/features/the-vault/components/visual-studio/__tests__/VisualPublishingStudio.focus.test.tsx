import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within, cleanup } from '@testing-library/react';
import { VisualOutputConfigPanel } from '../VisualOutputConfigPanel';
import { VisualPublishingStudio } from '../VisualPublishingStudio';
import {
  createInitialPosterDesignState,
  switchLayoutMode,
  updateFocusBucket,
} from '../../../../publishing/visualOutputs/posterDesignState';

vi.mock('../../../hooks/useVisualStudioStorePreviewSource', () => ({
  useVisualStudioStorePreviewSource: () => null,
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const embeddedResources = {
  embeddedArabicFontDataUri: 'data:font/ttf;base64,AAEAAEFCQ0Q=',
  embeddedArabicFontFormat: 'truetype' as const,
  embeddedImages: {},
};

describe('VisualPublishingStudio Focus Family integration', () => {
  beforeEach(() => {
    cleanup();
  });
  it('renders Focus controls while keeping Radial unavailable', () => {
    const state = switchLayoutMode(createInitialPosterDesignState('classic-heritage'), 'focus-family');
    render(<VisualOutputConfigPanel language="en" state={state} activeSection="tree-layout" />);

    expect(screen.getByRole('button', { name: 'Focus Family' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('focus-family-controls')).toBeInTheDocument();
    expect(screen.getByTestId('focal-person-select')).toBeInTheDocument();
    expect(screen.getByTestId('focus-ancestor-depth')).toBeInTheDocument();
    expect(screen.getByTestId('focus-descendant-depth')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Radial/i })).toBeInTheDocument();
  });

  it('renders localized Arabic Focus controls', () => {
    const state = switchLayoutMode(createInitialPosterDesignState('classic-heritage'), 'focus-family');
    render(<VisualOutputConfigPanel language="ar" state={state} activeSection="tree-layout" />);

    expect(screen.getByTestId('focus-family-controls')).toBeInTheDocument();
    expect(screen.getByTestId('focal-person-select')).toHaveAccessibleName();
    expect(screen.getByTestId('focus-include-spouses')).toBeInTheDocument();
    expect(screen.getByTestId('focus-include-siblings')).toBeInTheDocument();
  });

  it.each([
    { language: 'en' as const, title: 'Family Focus', scope: 'Scope: family around focal person' },
    { language: 'ar' as const, title: 'لوحة العائلة حول شخص', scope: 'النطاق: حول الشخص المحوري' },
  ])('uses Focus-specific default poster semantics in $language', async ({ language, title, scope }) => {
    render(<VisualPublishingStudio language={language} posterSvgResources={embeddedResources} />);

    fireEvent.click(screen.getByRole('tab', { name: language === 'ar' ? 'الشجرة والتخطيط' : 'Tree & Layout' }));
    fireEvent.click(screen.getByRole('button', { name: language === 'ar' ? 'حول شخص' : 'Focus Family' }));

    const preview = screen.getByTestId('studio-poster-renderer-preview');
    await waitFor(() => expect(preview.querySelector('svg title')).toHaveTextContent(title));
    expect(within(screen.getByTestId('visual-studio-preview-pane')).getByRole('heading', { name: title })).toBeInTheDocument();
    expect(preview.querySelector('.poster-scope')).toHaveTextContent(scope);
    expect(preview.querySelector('g[aria-label]')).toHaveAttribute(
      'aria-label',
      language === 'ar' ? 'العائلة حول الشخص المحوري' : 'Family around the focal person'
    );
  });

  it('preserves Focus values and restores the previous Tiered scope in pure state', () => {
    let state = createInitialPosterDesignState('classic-heritage');
    state = switchLayoutMode(state, 'focus-family');
    state = updateFocusBucket(state, { ancestorDepth: 2, includeSpouses: false });

    expect(state.scope).toBe('around-person');
    expect(state.tiered.lastTieredScope).toBe('ancestors');
    expect(state.focus.ancestorDepth).toBe(2);
    expect(state.focus.includeSpouses).toBe(false);

    state = switchLayoutMode(state, 'tiered');
    expect(state.layoutMode).toBe('tiered');
    expect(state.scope).toBe('ancestors');
  });

  it('clicks Focus, selects a focal person, changes controls, updates the scene, and restores Tiered', async () => {
    render(<VisualPublishingStudio language="en" posterSvgResources={embeddedResources} />);

    fireEvent.click(screen.getByRole('tab', { name: 'Tree & Layout' }));
    fireEvent.click(screen.getByRole('button', { name: 'Focus Family' }));
    expect(screen.getByTestId('focus-family-controls')).toBeInTheDocument();

    const preview = screen.getByTestId('studio-poster-renderer-preview');
    await waitFor(() => expect(preview.querySelectorAll('g.poster-node').length).toBeGreaterThan(1));
    const initialNodeCount = preview.querySelectorAll('g.poster-node').length;

    const focalSelect = screen.getByTestId('focal-person-select') as HTMLSelectElement;
    expect(focalSelect.options.length).toBeGreaterThan(1);
    const nextFocalToken = focalSelect.options[focalSelect.options.length - 1].value;
    fireEvent.change(focalSelect, { target: { value: nextFocalToken } });
    expect(focalSelect.value).toBe(nextFocalToken);

    fireEvent.click(within(screen.getByTestId('focus-ancestor-depth')).getByRole('button', { name: '1' }));
    fireEvent.click(within(screen.getByTestId('focus-descendant-depth')).getByRole('button', { name: '1' }));

    const spouses = screen.getByTestId('focus-include-spouses') as HTMLInputElement;
    if (spouses.checked) fireEvent.click(spouses);
    const siblings = screen.getByTestId('focus-include-siblings') as HTMLInputElement;
    if (siblings.checked) fireEvent.click(siblings);

    await waitFor(() => {
      const changedNodeCount = preview.querySelectorAll('g.poster-node').length;
      expect(changedNodeCount).toBeGreaterThan(0);
      expect(changedNodeCount).not.toBe(initialNodeCount);
    });
    expect(preview.querySelectorAll('g.poster-node.is-root')).toHaveLength(1);

    const tiered = screen.getByRole('button', { name: 'Tiered Generations' });
    fireEvent.click(tiered);
    expect(screen.queryByTestId('focus-family-controls')).not.toBeInTheDocument();
    expect(tiered).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('tab', { name: 'Quick Setup' }));
    expect(screen.getByRole('button', { name: 'Ancestors' })).toHaveAttribute('aria-pressed', 'true');
  });
});
