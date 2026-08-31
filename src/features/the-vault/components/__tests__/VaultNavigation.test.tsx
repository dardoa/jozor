import { fireEvent, render, screen } from '@testing-library/react';
import { BarChart3, Cloud, FolderTree } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import { VaultDesktopNavigation, VaultMobileNavigation } from '../VaultNavigation';

const items = [
  { id: 'trees' as const, icon: FolderTree, label: 'Trees' },
  { id: 'stats' as const, icon: BarChart3, label: 'Insights & Tools' },
  { id: 'cloud' as const, icon: Cloud, label: 'Publishing & Backup' },
];

describe('Vault navigation', () => {
  it('uses the same direct destinations on desktop', () => {
    const onSelect = vi.fn();
    render(
      <VaultDesktopNavigation
        items={items}
        activeTab="stats"
        onSelect={onSelect}
        label="Vault"
      />
    );

    expect(screen.getByRole('navigation', { name: 'Vault' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Insights & Tools' })).toHaveAttribute('aria-current', 'page');

    fireEvent.click(screen.getByRole('button', { name: 'Publishing & Backup' }));
    expect(onSelect).toHaveBeenCalledWith('cloud');
  });

  it('keeps every destination directly reachable on mobile', () => {
    const onSelect = vi.fn();
    render(
      <VaultMobileNavigation
        items={items}
        activeTab="cloud"
        onSelect={onSelect}
        label="Vault"
      />
    );

    expect(screen.getAllByRole('button')).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Publishing & Backup' })).toHaveAttribute('aria-current', 'page');

    fireEvent.click(screen.getByRole('button', { name: 'Trees' }));
    expect(onSelect).toHaveBeenCalledWith('trees');
  });
});
