import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OverlayPrimitive, OverlayProvider } from '../OverlayContext';

describe('OverlayPrimitive', () => {
  it('uses the latest close callback without re-registering the overlay', () => {
    const firstOnClose = vi.fn();
    const latestOnClose = vi.fn();

    const { rerender } = render(
      <OverlayProvider>
        <OverlayPrimitive id="test-overlay" isOpen onClose={firstOnClose}>
          <button type="button">Overlay content</button>
        </OverlayPrimitive>
      </OverlayProvider>
    );

    rerender(
      <OverlayProvider>
        <OverlayPrimitive id="test-overlay" isOpen onClose={latestOnClose}>
          <button type="button">Overlay content</button>
        </OverlayPrimitive>
      </OverlayProvider>
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(firstOnClose).not.toHaveBeenCalled();
    expect(latestOnClose).toHaveBeenCalledTimes(1);
  });
});
