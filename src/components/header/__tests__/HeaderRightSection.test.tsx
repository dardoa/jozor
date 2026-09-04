import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HeaderRightSection } from '../HeaderRightSection';
import type { HeaderRightSectionProps } from '../../../types';
import { useAppStore } from '../../../store/useAppStore';

vi.mock('../../../context/TranslationContext', () => ({
  useTranslation: () => ({
    t: {
      mainNavigation: 'Main navigation',
      search: 'Search',
      loginGoogle: 'Login with Google',
      avatarAlt: 'Avatar',
      accountProfile: 'Account',
      treeMenu: 'Tree',
      treeControlCenterTitle: 'Tree Control Center',
      saveAs: 'Save As',
      printMenu: 'Print',
      print: 'Print',
      syncStatus: {
        openBackupSettings: 'Open backup settings',
      },
    },
  }),
}));

vi.mock('../../../features/kindi', () => ({
  KindiSearchTrigger: () => <input data-testid="kindi-search-trigger" aria-label="Kindi session" />,
}));

vi.mock('../../SyncStatusIndicator', () => ({
  SyncStatusIndicator: ({ onOpenVault }: { onOpenVault?: () => void }) => (
    <button type="button" data-testid="sync-status" onClick={onOpenVault}>Sync</button>
  ),
}));

vi.mock('../NotificationBell', () => ({
  NotificationBell: () => <div data-testid="notification-bell" />,
}));

vi.mock('../AccountMenu', () => ({
  AccountMenu: () => <div>Account menu content</div>,
}));

const buildProps = (): HeaderRightSectionProps => ({
  themeLanguage: {
    language: 'en',
    setLanguage: vi.fn(),
    darkMode: false,
    setDarkMode: vi.fn(),
    theme: 'modern',
    setTheme: vi.fn(),
  },
  auth: {
    user: {
      uid: 'user-1',
      email: 'owner@example.com',
      displayName: 'Owner User',
      photoURL: '',
      supabaseToken: 'token-1',
    },
    onOpenLoginModal: vi.fn(async () => {}),
    onLogout: vi.fn(async () => {}),
    onSaveToGoogleDrive: vi.fn(async () => {}),
  },
  viewSettings: {
    currentUserRole: 'owner',
  },
  exportActions: {
    handleExport: vi.fn(async () => {}),
  },
  searchProps: {
    people: [],
    onFocusPerson: vi.fn(),
  },
  globalActions: {
    onOpenTreeControlCenter: vi.fn(),
    onOpenDiagnostics: vi.fn(),
    onOpenShare: vi.fn(),
    onOpenTreeManager: vi.fn(),
    onOpenCloudBackups: vi.fn(),
    onOpenActivityLog: vi.fn(),
    onOpenCleanTree: vi.fn(),
    onOpenGlobalSettings: vi.fn(),
  },
} as unknown as HeaderRightSectionProps);

describe('HeaderRightSection', () => {
  beforeEach(() => {
    useAppStore.setState({
      isVaultOpen: false,
      vaultTab: 'trees',
      vaultExportSection: 'family-book',
      currentTreeId: 'tree-1',
      currentUserRole: 'owner',
    });
  });

  it('exposes an ultra-clean authenticated header surface', () => {
    render(<HeaderRightSection {...buildProps()} />);

    expect(screen.queryByTestId('tools-menu-trigger')).not.toBeInTheDocument();
    expect(screen.getByTestId('notification-bell')).toBeInTheDocument();
    expect(screen.getByTestId('account-menu-trigger')).toBeInTheDocument();
  });

  it('keeps sync status indicator available for management actions', () => {
    render(<HeaderRightSection {...buildProps()} />);

    expect(screen.getByTestId('sync-status')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('sync-status'));
    expect(useAppStore.getState().isVaultOpen).toBe(true);
    expect(useAppStore.getState().vaultTab).toBe('cloud');
    expect(useAppStore.getState().vaultExportSection).toBe('cloud-backup');
  });

  it('opens the account menu for authenticated users', () => {
    render(<HeaderRightSection {...buildProps()} />);

    fireEvent.click(screen.getByTestId('account-menu-trigger'));

    expect(screen.getByText('Account menu content')).toBeInTheDocument();
  });

  it('resets the Kindi session at tree, permission, and account boundaries', () => {
    const props = buildProps();
    const { rerender } = render(<HeaderRightSection {...props} />);
    const session = screen.getByTestId('kindi-search-trigger');
    fireEvent.change(session, { target: { value: 'pending conversation' } });

    act(() => {
      useAppStore.setState({ currentTreeId: 'tree-2' });
    });
    expect(screen.getByTestId('kindi-search-trigger')).toHaveValue('');

    fireEvent.change(screen.getByTestId('kindi-search-trigger'), {
      target: { value: 'owner-only result' },
    });
    act(() => {
      useAppStore.setState({ currentUserRole: 'viewer' });
    });
    expect(screen.getByTestId('kindi-search-trigger')).toHaveValue('');

    fireEvent.change(screen.getByTestId('kindi-search-trigger'), {
      target: { value: 'viewer conversation' },
    });
    rerender(
      <HeaderRightSection
        {...props}
        auth={{
          ...props.auth,
          user: {
            ...props.auth.user!,
            uid: 'user-2',
            email: 'viewer@example.com',
          },
        }}
      />
    );
    expect(screen.getByTestId('kindi-search-trigger')).toHaveValue('');
  });

  it('preserves the Kindi session during ordinary updates within one tree', () => {
    const props = buildProps();
    const { rerender } = render(<HeaderRightSection {...props} />);
    fireEvent.change(screen.getByTestId('kindi-search-trigger'), {
      target: { value: 'current conversation' },
    });

    rerender(
      <HeaderRightSection
        {...props}
        searchProps={{
          ...props.searchProps,
          people: {} as HeaderRightSectionProps['searchProps']['people'],
        }}
      />
    );

    expect(screen.getByTestId('kindi-search-trigger')).toHaveValue('current conversation');
  });
});
