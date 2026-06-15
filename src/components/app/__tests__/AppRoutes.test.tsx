import { Suspense } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { AuthProps } from '../../../types';
import { AppRoutes } from '../AppRoutes';

vi.mock('../../HelpCenter', () => ({
  HelpCenter: () => <div>Help surface</div>,
}));

vi.mock('../../InvitePage', () => ({
  InvitePage: () => <div>Invite surface</div>,
}));

vi.mock('../../../features/tree-manager', () => ({
  SharedTreeLoader: ({
    ownerUid,
    fileId,
  }: {
    ownerUid: string;
    fileId: string;
  }) => <div>{`Shared loader ${ownerUid}/${fileId}`}</div>,
}));

const auth = {
  user: null,
} as AuthProps;

const renderRoutes = (initialEntry: string) =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Suspense fallback={<div>Loading route</div>}>
        <AppRoutes
          auth={auth}
          mainSurface={<div>Main surface</div>}
          onSharedTreeLoaded={vi.fn()}
        />
      </Suspense>
    </MemoryRouter>
  );

describe('AppRoutes', () => {
  it('redirects the legacy support route to help', async () => {
    renderRoutes('/support');

    expect(await screen.findByText('Help surface')).toBeInTheDocument();
  });

  it('redirects database share links carrying an invite token', async () => {
    renderRoutes('/tree/db/owner-1/tree-1?invite=invite-token');

    expect(await screen.findByText('Invite surface')).toBeInTheDocument();
  });

  it('passes canonical database route parameters to the shared loader', () => {
    renderRoutes('/tree/db/owner-1/tree-1');

    expect(screen.getByText('Shared loader owner-1/tree-1')).toBeInTheDocument();
  });
});
