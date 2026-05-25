
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import { MobileAccountSheet } from '../MobileAccountSheet';

const useKindiReportsAdminAccessMock = vi.hoisted(() => vi.fn(() => false));

vi.mock('../../../context/TranslationContext', () => ({
  useTranslation: () => ({
    t: {
      accountProfile: 'Account',
      signIn: 'Sign in',
      signOut: 'Sign out',
      switchToArabic: 'Switch to Arabic',
      switchToEnglish: 'Switch to English',
      switchToDarkMode: 'Switch to dark mode',
      switchToLightMode: 'Switch to light mode',
      avatarAlt: 'Avatar',
      adminTools: 'Admin',
      kindiLearningReports: 'Kindi learning reports',
      kindiLearningReportsHint: 'Review redacted Kindi learning telemetry.',
      defaultTreeSettings: 'Default tree settings',
      defaultTreeSettingsHint: 'Set visual defaults for newly created trees.',
      globalSettings: {
        title: 'Global Settings',
      },
      userMenu: {
        backupNow: 'Backup now',
      },
      settings: {
        close: 'Close',
      },
    },
  }),
}));

vi.mock('../../../features/admin', () => ({
  useKindiReportsAdminAccess: useKindiReportsAdminAccessMock,
  openKindiLearningReports: vi.fn(),
  openAdminTreeDefaults: vi.fn(),
}));

describe('MobileAccountSheet', () => {
  it('renders account actions in a mobile sheet and opens global settings', () => {
    useKindiReportsAdminAccessMock.mockReturnValue(false);
    const onClose = vi.fn();
    const setLanguage = vi.fn();
    const setDarkMode = vi.fn();
    const onOpenGlobalSettings = vi.fn();

    render(
      <MobileAccountSheet
        isOpen
        onClose={onClose}
        themeLanguage={{
          language: 'en',
          setLanguage,
          darkMode: false,
          setDarkMode,
        }}
        user={{
          uid: 'user-1',
          email: 'owner@example.com',
          displayName: 'Owner User',
          photoURL: '',
          supabaseToken: 'token-1',
        }}
        onLogin={vi.fn(async () => {})}
        onLogout={vi.fn(async () => {})}
        onBackupNow={vi.fn(async () => {})}
        onOpenGlobalSettings={onOpenGlobalSettings}
      />
    );

    expect(screen.getByRole('heading', { name: 'Account' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Global Settings/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Kindi learning reports/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Default tree settings/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Global Settings/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onOpenGlobalSettings).toHaveBeenCalledTimes(1);
  });

  it('shows admin tools for app admins', () => {
    useKindiReportsAdminAccessMock.mockReturnValue(true);

    render(
      <MobileAccountSheet
        isOpen
        onClose={vi.fn()}
        themeLanguage={{
          language: 'en',
          setLanguage: vi.fn(),
          darkMode: false,
          setDarkMode: vi.fn(),
        }}
        user={{
          uid: 'admin-1',
          email: 'owner@example.com',
          displayName: 'Owner User',
          photoURL: '',
          supabaseToken: 'token-1',
        }}
        onLogin={vi.fn(async () => {})}
        onLogout={vi.fn(async () => {})}
      />
    );

    expect(screen.getByRole('button', { name: /Kindi learning reports/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Default tree settings/i })).toBeInTheDocument();
  });
});

