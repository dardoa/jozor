
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import { MobileAccountSheet } from '../MobileAccountSheet';

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

describe('MobileAccountSheet', () => {
  it('renders account actions in a mobile sheet and opens global settings', () => {
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

    fireEvent.click(screen.getByRole('button', { name: /Global Settings/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onOpenGlobalSettings).toHaveBeenCalledTimes(1);
  });
});

