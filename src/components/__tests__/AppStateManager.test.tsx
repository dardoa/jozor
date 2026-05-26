
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppStateManager } from '../AppStateManager';
import { useAppStore } from '../../store/useAppStore';

vi.mock('../../hooks/auth/useSessionBootstrap', () => ({
  useSessionBootstrap: vi.fn(),
}));

vi.mock('../../hooks/sync/useConsistency', () => ({
  useConsistency: vi.fn(),
}));

vi.mock('../../features/geography/hooks/useGeocodingSync', () => ({
  useGeocodingSync: vi.fn(),
}));

vi.mock('../../hooks/sync/useNotifications', () => ({
  useNotifications: vi.fn(),
}));

vi.mock('../../hooks/sync/useRealtimeNotifications', () => ({
  useRealtimeNotifications: vi.fn(),
}));

vi.mock('../../hooks/sync/useWebPush', () => ({
  useWebPush: vi.fn(),
}));

vi.mock('../AppUIManager', () => ({
  AppUIManager: () => <div>App UI</div>,
}));

describe('AppStateManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState((state) => ({
      ...state,
      user: null,
      currentTreeId: null,
      authLoading: true,
      syncStatus: {
        ...state.syncStatus,
        state: 'checking',
      },
    }));
  });

  it('shows a user-facing bootstrap message while restoring auth', () => {
    render(<AppStateManager />);

    expect(screen.getByText('جذور')).toBeInTheDocument();
    expect(screen.getByText('جاري تجهيز شجرتك...')).toBeInTheDocument();
    expect(screen.queryByText('SESSION BOOTSTRAP')).not.toBeInTheDocument();
  });

  it('renders the app once the bootstrap gate is released', () => {
    useAppStore.setState((state) => ({
      ...state,
      authLoading: false,
    }));

    render(<AppStateManager />);

    expect(screen.getByText('App UI')).toBeInTheDocument();
  });
});
