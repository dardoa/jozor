import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ImageLightbox } from '../ImageLightbox';

describe('ImageLightbox', () => {
  afterEach(() => {
    document.body.style.overflow = '';
  });

  it('exposes dialog semantics, localized actions, and restores page state on close', () => {
    const onClose = vi.fn();
    const returnTarget = document.createElement('button');
    document.body.appendChild(returnTarget);
    returnTarget.focus();
    document.body.style.overflow = 'auto';

    const { unmount } = render(
      <ImageLightbox
        images={['https://images.example.test/photo.webp']}
        currentIndex={0}
        altPrefix="Mariam gallery"
        onClose={onClose}
        onNavigate={vi.fn()}
        labels={{
          download: 'Download localized',
          close: 'Close localized',
          previous: 'Previous localized',
          next: 'Next localized',
          closeHint: 'Escape localized',
        }}
      />
    );

    expect(screen.getByRole('dialog', { name: 'Mariam gallery' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close localized' })).toHaveFocus();
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();

    unmount();
    expect(document.body.style.overflow).toBe('auto');
    expect(returnTarget).toHaveFocus();
    returnTarget.remove();
  });

  it('does not render an invalid image index', () => {
    render(
      <ImageLightbox
        images={[]}
        currentIndex={0}
        onClose={vi.fn()}
        onNavigate={vi.fn()}
      />
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps keyboard focus inside the open gallery', () => {
    render(
      <ImageLightbox
        images={[
          'https://images.example.test/one.webp',
          'https://images.example.test/two.webp',
        ]}
        currentIndex={0}
        onClose={vi.fn()}
        onNavigate={vi.fn()}
      />
    );

    const download = screen.getByRole('button', { name: 'Download image' });
    const next = screen.getByRole('button', { name: 'Next image' });

    next.focus();
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(download).toHaveFocus();

    download.focus();
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(next).toHaveFocus();
  });
});
