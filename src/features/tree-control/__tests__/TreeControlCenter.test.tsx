
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import { TreeControlCenter } from '../components/TreeControlCenter';

vi.mock('../../../context/TranslationContext', () => ({
  useTranslation: () => ({
    t: {
      treeControlCenter: {
        title: 'Tree Control Center',
        subtitle: 'subtitle',
        closeAria: 'Close Tree Control Center',
        navigationAria: 'Tree Control Center Navigation',
        tabs: {
          overview: 'Overview',
          access: 'Access',
          activity: 'Activity',
          versions: 'Versions',
          settings: 'Settings',
          diagnostics: 'Diagnostics',
          maintenance: 'Maintenance',
          danger: 'Danger Zone',
        },
        overviewCards: {
          role: 'Role',
          people: 'People',
          currentRoot: 'Current Root',
          notSet: 'Not set',
          syncState: 'Sync State',
          syncNeedsAttention: 'Needs attention',
          syncHealthy: 'Healthy',
        },
        quickActions: {
          title: 'Quick Actions',
          description: 'Quick Actions description',
          shareTree: 'Share Tree',
          openDiagnostics: 'Open Diagnostics',
        },
        migration: {
          title: 'Migration Status',
          description: 'Migration description',
          treeIdLabel: 'Tree ID:',
        },
        sections: {
          accessTitle: 'Access',
          accessDesc: 'Access description',
          activityTitle: 'Activity',
          activityDesc: 'Activity description',
          versionsTitle: 'Versions',
          versionsDesc: 'Versions description',
          settingsTitle: 'Settings',
          settingsDesc: 'Settings description',
          diagnosticsTitle: 'Diagnostics',
          diagnosticsDesc: 'Diagnostics description',
          maintenanceTitle: 'Maintenance',
          maintenanceDesc: 'Maintenance description',
          dangerTitle: 'Danger Zone',
          dangerDesc: 'Danger description',
        },
        placeholders: {
          accessTitle: 'Access needs tree ownership details first.',
          accessBody: 'Access placeholder',
          activityTitle: 'Activity needs an active tree first.',
          activityBody: 'Activity placeholder',
          versionsTitle: 'Versions need an active tree first.',
          versionsBody: 'Versions placeholder',
          settingsTitle: 'Settings need an active tree first.',
          settingsBody: 'Settings placeholder',
          dangerTitle: 'Danger Zone needs an active tree first.',
          dangerBody: 'Danger placeholder',
        },
      },
    },
    language: 'en',
  }),
}));

vi.mock('../../../context/OverlayContext', () => ({
  OverlayPrimitive: ({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) =>
    isOpen ? <div>{children}</div> : null,
}));

vi.mock('../components/panels/TreeControlAccessPanel', () => ({
  TreeControlAccessPanel: ({ treeId }: { treeId: string }) => <div>AccessControlTab:{treeId}</div>,
}));

vi.mock('../components/panels/TreeControlActivityPanel', () => ({
  TreeControlActivityPanel: ({ treeId }: { treeId: string }) => <div>ActivityHistoryTab:{treeId}</div>,
}));

vi.mock('../components/panels/TreeControlVersionsPanel', () => ({
  TreeControlVersionsPanel: ({ treeId }: { treeId: string }) => <div>VersionsTab:{treeId}</div>,
}));

vi.mock('../components/panels/TreeControlSettingsPanel', () => ({
  TreeControlSettingsPanel: ({ treeId }: { treeId: string }) => <div>TreeSettingsTab:{treeId}</div>,
}));

vi.mock('../components/panels/TreeControlDiagnosticsPanel', () => ({
  TreeControlDiagnosticsPanel: () => <div>DiagnosticsPanels</div>,
}));

vi.mock('../components/panels/TreeControlMaintenancePanel', () => ({
  TreeControlMaintenancePanel: () => <div>DiagnosticsPanels</div>,
}));

vi.mock('../components/panels/TreeControlDangerPanel', () => ({
  TreeControlDangerPanel: ({ treeId }: { treeId: string }) => <div>TreeDangerZone:{treeId}</div>,
}));

describe('TreeControlCenter', () => {
  it('renders the overview shell and lets users switch sections', async () => {
    const onOpenShare = vi.fn();
    const onOpenDiagnostics = vi.fn();

    render(
      <TreeControlCenter
        isOpen
        onClose={vi.fn()}
        treeName="Family Archive"
        treeId="tree-123"
        ownerId="owner-1"
        ownerEmail="owner@example.com"
        language="en"
        roleLabel="Tree owner"
        peopleCount={24}
        people={[{ id: 'person-1', firstName: 'Amina', lastName: 'Saleh' } as any]}
        currentRootName="Amina Saleh"
        currentRootId="person-1"
        hasPendingSync={false}
        googleSync={{
          handleCreateSnapshot: vi.fn(),
          handleRestoreSnapshot: vi.fn(),
        }}
        onRootChanged={vi.fn()}
        onTreeRenamed={vi.fn()}
        onOpenShare={onOpenShare}
        onOpenDiagnostics={onOpenDiagnostics}
      />
    );

    expect(screen.getByRole('heading', { name: 'Family Archive' })).toBeInTheDocument();
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    expect(screen.getByText('24')).toBeInTheDocument();
    expect(screen.getByText('Amina Saleh')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open Diagnostics' }));
    expect(onOpenDiagnostics).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Access' }));
    expect(await screen.findByText('AccessControlTab:tree-123')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Activity' }));
    expect(await screen.findByText('ActivityHistoryTab:tree-123')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Versions' }));
    expect(await screen.findByText('VersionsTab:tree-123')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(await screen.findByText('TreeSettingsTab:tree-123')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Diagnostics' }));
    expect(await screen.findByText('DiagnosticsPanels')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Maintenance' }));
    expect(await screen.findByText('DiagnosticsPanels')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Danger Zone' }));
    expect(await screen.findByText('TreeDangerZone:tree-123')).toBeInTheDocument();
  });
});
