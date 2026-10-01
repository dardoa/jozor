import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountDeletionStatusItem } from '../AccountDeletionStatusItem';

let language = 'en';
vi.mock('../../../context/TranslationContext', () => ({ useTranslation: () => ({ language }) }));

describe('read-only deletion receipt in account menu', () => {
  const receipt = 'ab'.repeat(32);
  beforeEach(() => { sessionStorage.clear(); language = 'en'; });
  afterEach(() => vi.unstubAllGlobals());
  const seed = () => sessionStorage.setItem('jozor-account-deletion-receipt', JSON.stringify({ value: receipt }));

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
