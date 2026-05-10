// @ts-nocheck
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ZoomControls } from '../ZoomControls';

vi.mock('../../../context/TranslationContext', () => ({
  useTranslation: () => ({
    t: {
      help: {
        advancedSettings: 'Preferences',
        zoomIn: 'Zoom In',
        zoomOut: 'Zoom Out',
        resetZoom: 'Reset Zoom',
        fitToScreen: 'Fit to Screen',
      },
    },
  }),
}));

describe('ZoomControls', () => {
  it('renders a preferences trigger and delegates its click', () => {
    const onOpenPreferences = vi.fn();

    render(
      <ZoomControls
        onOpenPreferences={onOpenPreferences}
        onZoomIn={vi.fn()}
        onZoomOut={vi.fn()}
        onReset={vi.fn()}
        onFitToScreen={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Preferences' }));

    expect(onOpenPreferences).toHaveBeenCalledTimes(1);
  });

  it('renders its controls in a non-absolute stack so TreeHUD owns mobile positioning', () => {
    const { container } = render(
      <ZoomControls
        onOpenPreferences={vi.fn()}
        onZoomIn={vi.fn()}
        onZoomOut={vi.fn()}
        onReset={vi.fn()}
        onFitToScreen={vi.fn()}
      />
    );

    expect(container.firstChild).not.toHaveClass('absolute');
  });
});

