// @ts-nocheck
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchInputWithResults } from '../SearchInputWithResults';

const setSearchTargetMock = vi.fn();
const searchMock = vi.fn();

vi.mock('../../../context/TranslationContext', () => ({
  useTranslation: () => ({
    t: {
      searchPlaceholder: 'Search people',
      clearSearch: 'Clear search',
      noResults: 'No results found',
    },
  }),
}));

vi.mock('../../../store/useAppStore', () => ({
  useAppStore: (selector: (state: { setSearchTarget: typeof setSearchTargetMock }) => unknown) =>
    selector({ setSearchTarget: setSearchTargetMock }),
}));

vi.mock('../../../services/searchService', () => ({
  searchService: {
    search: (...args: unknown[]) => searchMock(...args),
    updateSearchIndex: vi.fn(),
  },
}));

describe('SearchInputWithResults', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a matching result and focuses the selected person', async () => {
    const onFocusPerson = vi.fn();
    searchMock.mockResolvedValue([
      {
        id: 'person-1',
        firstName: 'Amina',
        lastName: 'Saleh',
        gender: 'female',
        birthDate: '1988',
        birthPlace: 'Riyadh',
      },
    ]);

    render(<SearchInputWithResults people={[]} onFocusPerson={onFocusPerson} />);

    const input = screen.getByRole('combobox', { name: 'Search people' });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'ami' } });

    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(await screen.findByText(/b\. 1988 (\||Â·) Riyadh/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('option', { name: /amina saleh/i }));

    expect(onFocusPerson).toHaveBeenCalledWith('person-1');
    expect(setSearchTargetMock).toHaveBeenCalledWith('person-1');
    expect(screen.queryByRole('option', { name: /amina saleh/i })).not.toBeInTheDocument();
  });

  it('shows an empty state when no search results are found', async () => {
    searchMock.mockResolvedValue([]);

    render(<SearchInputWithResults people={[]} onFocusPerson={vi.fn()} />);

    const input = screen.getByRole('combobox', { name: 'Search people' });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'zzz' } });

    expect(input).toHaveAttribute('aria-expanded', 'true');
    await waitFor(() => expect(searchMock).toHaveBeenCalledWith('zzz'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('No results found');
    expect(screen.getAllByText('No results found')).toHaveLength(2);
  });

  it('clears the search query from the clear button', () => {
    searchMock.mockResolvedValue([]);

    render(<SearchInputWithResults people={[]} onFocusPerson={vi.fn()} />);

    const input = screen.getByRole('combobox', { name: 'Search people' });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'reset me' } });

    fireEvent.mouseDown(screen.getByRole('button', { name: 'Clear search' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));

    expect(input).toHaveValue('');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('supports keyboard navigation and selection for search results', async () => {
    const onFocusPerson = vi.fn();
    searchMock.mockResolvedValue([
      {
        id: 'person-1',
        firstName: 'Amina',
        lastName: 'Saleh',
        gender: 'female',
        birthDate: '1988',
        birthPlace: 'Riyadh',
      },
      {
        id: 'person-2',
        firstName: 'Khalid',
        lastName: 'Saleh',
        gender: 'male',
        birthDate: '1984',
        birthPlace: 'Jeddah',
      },
    ]);

    render(<SearchInputWithResults people={[]} onFocusPerson={onFocusPerson} />);

    const input = screen.getByRole('combobox', { name: 'Search people' });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'saleh' } });
    await screen.findByRole('option', { name: /amina saleh/i });
    fireEvent.keyDown(input, { key: 'ArrowDown' });

    expect(input).toHaveAttribute('aria-activedescendant', 'search-result-option-person-1');
    expect(screen.getByRole('option', { name: /amina saleh/i })).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(input, { key: 'ArrowDown' });

    expect(input).toHaveAttribute('aria-activedescendant', 'search-result-option-person-2');
    expect(screen.getByRole('option', { name: /khalid saleh/i })).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onFocusPerson).toHaveBeenCalledWith('person-2');
    expect(setSearchTargetMock).toHaveBeenCalledWith('person-2');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});

