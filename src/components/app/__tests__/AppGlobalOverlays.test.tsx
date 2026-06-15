import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  AppStateAndActions,
  AuthProps,
  ExportActionsProps,
  FamilyActionsProps,
  GoogleSyncStateAndActions,
  ModalStateAndActions,
  ThemeLanguageProps,
  ToolsActionsProps,
  WelcomeScreenLogicProps,
} from '../../../types';
import { AppGlobalOverlays } from '../AppGlobalOverlays';

const store = vi.hoisted(() => ({
  state: {
    isVaultOpen: false,
    isDiagnosticsDrawerOpen: false,
    setActivityLogOpen: vi.fn(),
    setDiagnosticsDrawerOpen: vi.fn(),
  },
}));

vi.mock('../../../store/useAppStore', () => {
  const useAppStore = Object.assign(
    <Selected,>(selector: (state: typeof store.state) => Selected) =>
      selector(store.state),
    { getState: () => store.state }
  );

  return { useAppStore };
});

vi.mock('../../../features/the-vault', () => ({
  TheVaultDrawer: () => <div>Vault drawer</div>,
}));

vi.mock('../../../features/diagnostics', () => ({
  DiagnosticsDrawer: () => <div>Diagnostics drawer</div>,
}));

vi.mock('../../ModalManagerContainer', () => ({
  ModalManagerContainer: () => <div>Modal manager</div>,
}));

const props = {
  appState: {} as AppStateAndActions,
  modals: {} as ModalStateAndActions,
  googleSync: {} as GoogleSyncStateAndActions,
  welcomeScreen: {} as WelcomeScreenLogicProps,
  familyActions: {} as FamilyActionsProps,
  themeLanguage: {} as ThemeLanguageProps,
  auth: {} as AuthProps,
  exportActions: {} as ExportActionsProps,
  toolsActions: {} as ToolsActionsProps,
};

describe('AppGlobalOverlays', () => {
  beforeEach(() => {
    store.state.isVaultOpen = false;
    store.state.isDiagnosticsDrawerOpen = false;
  });

  it('always mounts the modal manager while drawers remain closed', () => {
    render(<AppGlobalOverlays {...props} />);

    expect(screen.getByText('Modal manager')).toBeInTheDocument();
    expect(screen.queryByText('Vault drawer')).not.toBeInTheDocument();
    expect(screen.queryByText('Diagnostics drawer')).not.toBeInTheDocument();
  });

  it('loads only the drawers selected by global UI state', async () => {
    store.state.isVaultOpen = true;
    store.state.isDiagnosticsDrawerOpen = true;

    render(<AppGlobalOverlays {...props} />);

    expect(await screen.findByText('Vault drawer')).toBeInTheDocument();
    expect(await screen.findByText('Diagnostics drawer')).toBeInTheDocument();
  });
});
