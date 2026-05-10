// @ts-nocheck
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';

import { HeaderRightSection } from '../HeaderRightSection';
import type { HeaderRightSectionProps } from '../../../types';

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
    },
  }),
}));

vi.mock('../SearchInputWithResults', () => ({
  SearchInputWithResults: () => <div data-testid="search-input" />,
}));

vi.mock('../../SyncStatusIndicator', () => ({
  SyncStatusIndicator: () => <div data-testid="sync-status" />,
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
  } as never,
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
  } as never,
  viewSettings: {
    currentUserRole: 'owner',
  } as never,
  toolsActions: {
    onOpenModal: vi.fn(),
  } as never,
  exportActions: {
    handleExport: vi.fn(async () => {}),
  } as never,
  searchProps: {
    people: [],
    onFocusPerson: vi.fn(),
  } as never,
  globalActions: {
    onOpenTreeControlCenter: vi.fn(),
    onOpenDiagnostics: vi.fn(),
    onOpenShare: vi.fn(),
    onOpenTreeManager: vi.fn(),
    onOpenDriveFileManager: vi.fn(),
    onOpenSnapshotHistory: vi.fn(),
    onOpenActivityLog: vi.fn(),
    onOpenCleanTree: vi.fn(),
    onOpenGlobalSettings: vi.fn(),
  } as never,
});

describe('HeaderRightSection', () => {
  it('exposes an ultra-clean authenticated header surface', () => {
    render(<HeaderRightSection {...buildProps()} />);

    expect(screen.queryByTestId('tools-menu-trigger')).not.toBeInTheDocument();
    expect(screen.getByTestId('notification-bell')).toBeInTheDocument();
    expect(screen.getByTestId('account-menu-trigger')).toBeInTheDocument();
  });

  it('keeps sync status indicator available for management actions', () => {
    render(<HeaderRightSection {...buildProps()} />);

    expect(screen.getByTestId('sync-status')).toBeInTheDocument();
  });

  it('opens the account menu for authenticated users', () => {
    render(<HeaderRightSection {...buildProps()} />);

    fireEvent.click(screen.getByTestId('account-menu-trigger'));

    expect(screen.getByText('Account menu content')).toBeInTheDocument();
  });
});

