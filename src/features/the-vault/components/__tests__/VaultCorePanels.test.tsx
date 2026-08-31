import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { TreeSettings } from '../../../../types';
import { en } from '../../../../utils/translations/en';
import { ActiveTreeCard } from '../ActiveTreeCard';
import { PrivacySettingsPanel } from '../PrivacySettingsPanel';
import { VaultTabLoader } from '../VaultTabLoader';

describe('Vault core panels', () => {
  it('keeps tree actions visible and exposes refresh as an icon command', () => {
    const onCreate = vi.fn();
    const onImport = vi.fn();
    const onRefresh = vi.fn();

    render(
      <ActiveTreeCard
        treeName="Family Tree"
        treeId="tree-1"
        roleLabel="Owner"
        ownedCount={2}
        sharedCount={1}
        labels={{ refreshTrees: 'Refresh trees' }}
        onCreate={onCreate}
        onImport={onImport}
        onRefresh={onRefresh}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'New' }));
    fireEvent.click(screen.getByRole('button', { name: 'Import as new tree' }));
    fireEvent.click(screen.getByRole('button', { name: 'Refresh trees' }));

    expect(onCreate).toHaveBeenCalledOnce();
    expect(onImport).toHaveBeenCalledOnce();
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it('keeps privacy focused on masking and excludes destructive maintenance', () => {
    const onUpdateSetting = vi.fn();
    render(
      <PrivacySettingsPanel
        currentTreeId="tree-1"
        treeSettings={{ privacyMode: false } as TreeSettings}
        treeIsPrivate
        canManageSecurity
        onUpdateSetting={onUpdateSetting}
        t={en}
      />
    );

    expect(screen.getByRole('heading', { name: 'Tree Privacy' })).toBeInTheDocument();
    expect(screen.queryByText('Reset options')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Privacy Mode' }));
    expect(onUpdateSetting).toHaveBeenCalledWith('privacyMode', true);
  });

  it('announces lazy section loading instead of rendering a blank panel', () => {
    render(<VaultTabLoader label="Loading Vault section" />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading Vault section');
  });
});
