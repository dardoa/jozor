
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import { SyncStatusRibbon } from '../SyncStatusRibbon';

vi.mock('../../../context/TranslationContext', () => ({
  useTranslation: () => ({
    t: {
      syncStatus: {
        savingLocally: 'Saving locally...',
        syncing: 'Syncing...',
      },
    },
  }),
}));

describe('SyncStatusRibbon', () => {
  it('renders nothing when syncing is inactive', () => {
    const { container } = render(<SyncStatusRibbon isSyncing={false} isDemoMode={false} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('shows the syncing message for normal cloud sync', () => {
    render(<SyncStatusRibbon isSyncing={true} isDemoMode={false} />);

    const ribbon = screen.getByText('Syncing...');
    expect(ribbon).toBeInTheDocument();
    expect(ribbon.closest('div')?.className).toContain('bg-[var(--primary-600)]');
  });

  it('shows the local-saving message in demo mode', () => {
    render(<SyncStatusRibbon isSyncing={true} isDemoMode={true} />);

    const ribbon = screen.getByText('Saving locally...');
    expect(ribbon).toBeInTheDocument();
    expect(ribbon.closest('div')?.className).toContain('bg-orange-500');
  });
});

