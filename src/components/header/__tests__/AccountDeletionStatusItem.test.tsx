import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountDeletionStatusItem } from '../AccountDeletionStatusItem';
import { Dropdown } from '../../ui/Dropdown';
import { DropdownContent, DropdownMenuItem } from '../../ui/DropdownMenu';

let language = 'en';
vi.mock('../../../context/TranslationContext', () => ({ useTranslation: () => ({ language }) }));

describe('read-only deletion receipt in account menu', () => {
  const receipt = 'ab'.repeat(32);
  beforeEach(() => { sessionStorage.clear(); language = 'en'; });
  afterEach(() => vi.unstubAllGlobals());
  const seed = () => sessionStorage.setItem('jozor-account-deletion-receipt', JSON.stringify({ value: receipt }));

  it.each(['pending', 'complete', 'error'])('keeps keyboard status %s visible in the actual dropdown', async status => {
    seed();
    const fetchMock = vi.fn().mockImplementation(async () => {
      if (status === 'error') throw new Error('offline');
      return new Response(JSON.stringify({ status }));
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<Dropdown trigger={<button>Account</button>}>
      <DropdownContent><AccountDeletionStatusItem /></DropdownContent>
    </Dropdown>);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Account' }), { key: 'ArrowDown' });
    fireEvent.keyDown(screen.getByRole('menuitem'), { key: 'Enter' });
    expect(await screen.findByRole('status')).toHaveTextContent(
      status === 'complete' ? 'is complete' : status === 'error' ? 'Status is unavailable' : 'Deletion was accepted'
    );
    expect(screen.getByRole('menu')).toBeVisible();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(sessionStorage.getItem('jozor-account-deletion-receipt') === null).toBe(status === 'complete');
  });

  it('does not redirect Enter from a pending disabled status item to its neighbor', async () => {
    seed();
    let finish!: (response: Response) => void;
    const fetchMock = vi.fn(() => new Promise<Response>(resolve => { finish = resolve; }));
    const neighbor = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<Dropdown trigger={<button>Pending account</button>}>
      <DropdownContent>
        <AccountDeletionStatusItem />
        <DropdownMenuItem label="Neighbor" onClick={neighbor} />
      </DropdownContent>
    </Dropdown>);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Pending account' }), { key: 'ArrowDown' });
    const item = screen.getByRole('menuitem', { name: 'Account deletion status' });
    fireEvent.keyDown(item, { key: 'Enter' });
    expect(item).toBeDisabled();
    fireEvent.keyDown(item, { key: 'Enter' });
    expect(neighbor).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledOnce();
    finish(new Response('{"status":"pending"}'));
    expect(await screen.findByRole('status')).toHaveTextContent('Deletion was accepted');
  });

  it('is absent when there is no valid local receipt', () => {
    render(<AccountDeletionStatusItem />);
    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();
  });
  it.each(['en', 'ar'])('checks a pending request without a bearer or destructive action in %s', async lang => {
    language = lang; seed();
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"status":"pending"}'));
    vi.stubGlobal('fetch', fetchMock);
    render(<AccountDeletionStatusItem />);
    fireEvent.click(screen.getByRole('menuitem'));
    expect(await screen.findByRole('status')).toHaveTextContent(lang === 'ar' ? 'قُبل طلب الحذف' : 'Deletion was accepted');
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][1].headers).not.toHaveProperty('Authorization');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ action: 'status', receipt });
    expect(sessionStorage.getItem('jozor-account-deletion-receipt')).not.toBeNull();
  });
  it('retains a failed receipt for retry and clears it only on confirmed completion', async () => {
    seed();
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(new Response('{"status":"complete"}'));
    vi.stubGlobal('fetch', fetchMock);
    render(<AccountDeletionStatusItem />);
    fireEvent.click(screen.getByRole('menuitem'));
    expect(await screen.findByRole('status')).toHaveTextContent('Status is unavailable');
    expect(sessionStorage.getItem('jozor-account-deletion-receipt')).not.toBeNull();
    fireEvent.click(screen.getByRole('menuitem'));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('is complete'));
    expect(sessionStorage.getItem('jozor-account-deletion-receipt')).toBeNull();
  });
  it('provides the same read-only check as a native button on the signed-out landing page', async () => {
    seed();
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"status":"pending"}'));
    vi.stubGlobal('fetch', fetchMock);
    render(<AccountDeletionStatusItem variant="page" />);
    fireEvent.click(screen.getByRole('button', { name: 'Account deletion status' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Deletion was accepted');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).action).toBe('status');
    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();
  });
});
