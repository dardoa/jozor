
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SearchResults } from '../SearchResults';
import type { Person } from '../../../types';

vi.mock('../../../context/TranslationContext', () => ({
  useTranslation: () => ({
    t: {
      searchPlaceholder: 'Search people',
      noResults: 'No results',
    },
  }),
}));

describe('SearchResults', () => {
  it('renders a listbox with option rows and focuses a person on click', () => {
    const onFocus = vi.fn();
    const onClose = vi.fn();
    const result: any = {
      id: 'p-1',
      firstName: 'Root',
      lastName: 'Person',
      gender: 'male',
      birthDate: '1980-01-01',
      spouses: [],
      children: [],
      parents: [],
    };

    render(
      <SearchResults
        query="root"
        results={[result]}
        onFocus={onFocus}
        onClose={onClose}
        activeResultId='p-1'
      />
    );

    expect(screen.getByRole('listbox')).toBeInTheDocument();

    const option = screen.getByRole('option', { name: /root person/i });
    expect(option).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(option);

    expect(onFocus).toHaveBeenCalledWith('p-1');
    expect(onClose).toHaveBeenCalled();
  });

  it('shows the empty state when there are no results', () => {
    render(<SearchResults query="test" results={[]} onFocus={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('No results');
    expect(screen.getAllByText('No results')).toHaveLength(2);
  });
});

