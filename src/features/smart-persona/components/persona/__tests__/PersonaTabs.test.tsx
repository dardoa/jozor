
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PersonaTabs } from '../PersonaTabs';

vi.mock('../../../../../context/TranslationContext', () => ({
  useTranslation: () => ({
    t: {
      profile: 'Profile',
      common: {
        close: 'Close',
      },
    },
  }),
}));

describe('PersonaTabs', () => {
  it('renders tab semantics correctly', () => {
    render(
      <PersonaTabs
        activeTab="about"
        setActiveTab={vi.fn()}
        onClose={vi.fn()}
        tabs={[
          { id: 'about', label: 'Info', show: true },
          { id: 'links', label: 'Bio', show: true },
          { id: 'media', label: 'Media', show: false },
        ]}
      />
    );

    expect(screen.getByRole('tablist', { name: 'Profile' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Info' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Bio' })).toHaveAttribute('aria-selected', 'false');
  });

  it('moves between visible tabs with arrow keys', () => {
    const setActiveTab = vi.fn();

    render(
      <PersonaTabs
        activeTab="about"
        setActiveTab={setActiveTab}
        onClose={vi.fn()}
        tabs={[
          { id: 'about', label: 'Info', show: true },
          { id: 'links', label: 'Partners', show: true },
          { id: 'media', label: 'Bio', show: true },
        ]}
      />
    );

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Info' }), { key: 'ArrowRight' });
    expect(setActiveTab).toHaveBeenCalledWith('links');

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Info' }), { key: 'ArrowLeft' });
    expect(setActiveTab).toHaveBeenCalledWith('media');
  });
});

