
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import { AccountMenu } from '../AccountMenu';

vi.mock('../../../context/TranslationContext', () => ({
  useTranslation: () => ({
    t: {
      accountProfile: 'Account',
      accountMenu: 'Account',
      accountPreferences: 'Preferences',
      sessionLabel: 'Session',
      languagePreferenceHint: 'Choose the interface language.',
      appearancePreferenceHint: 'Adjust the interface appearance mode.',
      switchToArabic: 'Switch to Arabic',
      switchToEnglish: 'Switch to English',
      switchToLightMode: 'Switch to light mode',
      switchToDarkMode: 'Switch to dark mode',
      signIn: 'Sign in',
      signOut: 'Sign out',
      globalSettings: { title: 'Global Settings' },
      userMenu: {
        welcome: 'Welcome',
        backupNow: 'Backup now',
      },
    },
  }),
}));

describe('AccountMenu', () => {
  it('renders authenticated actions and toggles language', () => {
    const setLanguage = vi.fn();
    const setDarkMode = vi.fn();
    const onLogout = vi.fn(async () => {});
    render(
      <AccountMenu
        themeLanguage={{
          language: 'en',
          setLanguage,
          darkMode: false,
          setDarkMode,
          theme: 'modern',
          setTheme: vi.fn(),
        } as never}
        user={{
          uid: 'user-1',
          email: 'owner@example.com',
          displayName: 'Owner User',
          photoURL: '',
          supabaseToken: 'token-1',
        }}
        onLogin={vi.fn(async () => {})}
        onLogout={onLogout}
      />
    );

    expect(screen.getByText('Preferences')).toBeInTheDocument();
    expect(screen.getByText('Session')).toBeInTheDocument();
    expect(screen.getByText('Welcome Owner')).toBeInTheDocument();
    expect(screen.getByText('owner@example.com')).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /Backup now/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /Global Settings/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('menuitem', { name: /Switch to Arabic/i }));
    expect(setLanguage).toHaveBeenCalledWith('ar');

    fireEvent.click(screen.getByRole('menuitem', { name: /Switch to dark mode/i }));
    expect(setDarkMode).toHaveBeenCalledWith(true);

    fireEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('renders guest actions and sign in path', () => {
    const onLogin = vi.fn(async () => {});

    render(
      <AccountMenu
        themeLanguage={{
          language: 'ar',
          setLanguage: vi.fn(),
          darkMode: true,
          setDarkMode: vi.fn(),
          theme: 'modern',
          setTheme: vi.fn(),
        } as never}
        user={null}
        onLogin={onLogin}
        onLogout={vi.fn(async () => {})}
      />
    );

    expect(screen.getByText('Preferences')).toBeInTheDocument();
    expect(screen.getByText('Session')).toBeInTheDocument();
    expect(screen.queryByText('Welcome')).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Backup now' })).not.toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Switch to English/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('menuitem', { name: 'Sign in' }));
    expect(onLogin).toHaveBeenCalledTimes(1);
  });
});

