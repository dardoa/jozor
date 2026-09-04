
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import { MobileAccountSheet } from '../MobileAccountSheet';

const useKindiReportsAdminAccessMock = vi.hoisted(() => vi.fn(() => false));
const openAdminBillingDiagnosticsMock = vi.hoisted(() => vi.fn());
const navigateMock = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

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
      adminDashboard: 'Admin Dashboard',
      adminDashboardHint: 'Manage reports, defaults, diagnostics, and future admin tools.',
      adminBillingDiagnostics: 'Billing diagnostics',
      adminBillingDiagnosticsHint: 'Inspect Paddle webhook processing and subscription update events.',
      globalSettings: {
        title: 'Global Settings',
      },
      help: { title: 'Help & Knowledge Base', description: 'Guides for using Jozor.' },
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
  openAdminDashboard: vi.fn(),
  openAdminBillingDiagnostics: openAdminBillingDiagnosticsMock,
}));

vi.mock('../../../services/supabaseAuthService', () => ({
  supabaseAuthService: {
    getSession: vi.fn(async () => ({
      data: { session: { user: { app_metadata: { provider: 'email', providers: ['email'] } } } },
    })),
    sendPasswordReset: vi.fn(async () => {}),
  },
}));

describe('MobileAccountSheet', () => {
  it('opens the Help Center from the mobile account sheet', () => {
    render(
      <MobileAccountSheet
        isOpen
        onClose={vi.fn()}
        themeLanguage={{ language: 'en', setLanguage: vi.fn(), darkMode: false, setDarkMode: vi.fn() }}
        user={null}
        onLogin={vi.fn(async () => {})}
        onLogout={vi.fn(async () => {})}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Help & Knowledge Base/i }));
    expect(navigateMock).toHaveBeenCalledWith('/help');
  });

  it('renders account actions in a mobile sheet and opens global settings', async () => {
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
    expect(screen.queryByRole('button', { name: /Admin Dashboard/i })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: /Reset password/i })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Global Settings/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onOpenGlobalSettings).toHaveBeenCalledTimes(1);
  });

  it('shows admin tools for app admins', async () => {
    useKindiReportsAdminAccessMock.mockReturnValue(true);
    openAdminBillingDiagnosticsMock.mockClear();
    const onClose = vi.fn();

    render(
      <MobileAccountSheet
        isOpen
        onClose={onClose}
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

    expect(screen.getByRole('button', { name: /Admin Dashboard/i })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: /Reset password/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Billing diagnostics/i }));
    expect(openAdminBillingDiagnosticsMock).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: /Kindi learning reports/i })).not.toBeInTheDocument();
  });
});

