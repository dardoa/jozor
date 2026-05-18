
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
        activeTab={"info" as any}
        setActiveTab={vi.fn()}
        onClose={vi.fn()}
        tabs={[
          { id: 'info', label: 'Info', show: true },
          { id: 'bio', label: 'Bio', show: true },
          { id: 'media', label: 'Media', show: false },
        ] as any}
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
        activeTab={"info" as any}
        setActiveTab={setActiveTab}
        onClose={vi.fn()}
        tabs={[
          { id: 'info', label: 'Info', show: true },
          { id: 'partners', label: 'Partners', show: true },
          { id: 'bio', label: 'Bio', show: true },
        ] as any}
      />
    );

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Info' }), { key: 'ArrowRight' });
    expect(setActiveTab).toHaveBeenCalledWith('partners');

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Info' }), { key: 'ArrowLeft' });
    expect(setActiveTab).toHaveBeenCalledWith('bio');
  });
});

