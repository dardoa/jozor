
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { ProtectedRoute } from '../ProtectedRoute';
import { useAppStore } from '../../store/useAppStore';

vi.mock('../../context/TranslationContext', () => ({
  useTranslation: () => ({ t: { loading: 'Loading...' } }),
}));

const renderWithRouter = (initialEntry: string) =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path='/person/:personId'
          element={
            <ProtectedRoute>
              <div>Protected Content</div>
            </ProtectedRoute>
          }
        />
        <Route path='/login' element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>
  );

describe('ProtectedRoute', () => {
  beforeEach(() => {
    sessionStorage.clear();
    useAppStore.setState((state) => ({
      ...state,
      user: null,
      authLoading: false,
      language: 'en',
    }));
  });

  it('captures the current path and redirects unauthenticated users to login', async () => {
    renderWithRouter('/person/abc-123?tab=links');

    expect(await screen.findByText('Login Page')).toBeInTheDocument();
    expect(sessionStorage.getItem('jozor:return_to')).toBe('/person/abc-123?tab=links');
    expect(sessionStorage.getItem('jozor:post-login-redirect')).toBe('/person/abc-123?tab=links');
  });

  it('renders children for authenticated users', () => {
    useAppStore.setState((state) => ({
      ...state,
      user: {
        uid: 'user-1',
        email: 'user@example.com',
        displayName: 'User',
        photoURL: '',
      },
      authLoading: false,
      language: 'en',
    }));

    renderWithRouter('/person/abc-123');

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
});

