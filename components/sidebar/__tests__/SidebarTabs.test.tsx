import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SidebarTabs } from '../SidebarTabs';

vi.mock('../../../context/TranslationContext', () => ({
  useTranslation: () => ({
    t: {
      profile: 'Profile',
      common: {
        close: 'Close',
      },
    },
  }),
}));

describe('SidebarTabs', () => {
  it('renders tab semantics correctly', () => {
    render(
      <SidebarTabs
        activeTab="info"
        setActiveTab={vi.fn()}
        onClose={vi.fn()}
        tabs={[
          { id: 'info', label: 'Info', show: true },
          { id: 'bio', label: 'Bio', show: true },
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
      <SidebarTabs
        activeTab="info"
        setActiveTab={setActiveTab}
        onClose={vi.fn()}
        tabs={[
          { id: 'info', label: 'Info', show: true },
          { id: 'partners', label: 'Partners', show: true },
          { id: 'bio', label: 'Bio', show: true },
        ]}
      />
    );

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Info' }), { key: 'ArrowRight' });
    expect(setActiveTab).toHaveBeenCalledWith('partners');

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Info' }), { key: 'ArrowLeft' });
    expect(setActiveTab).toHaveBeenCalledWith('bio');
  });
});
