import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SearchBar } from '../SearchBar';
import { searchService } from '../../../services/searchService';
import type { SearchResult } from '../../../services/searchService';
import type { Person } from '../../../types';

vi.mock('../../../services/searchService', () => ({
    searchService: {
        updateSearchIndex: vi.fn(),
        search: vi.fn(),
    },
}));

vi.mock('../../../context/TranslationContext', () => ({
    useTranslation: () => ({
        language: 'ar',
        t: {
            onboarding: {
                search: 'Search description',
            },
        },
    }),
}));

const buildPerson = (overrides: Partial<Person>): Person => ({
    id: 'person-1',
    title: '',
    firstName: '',
    middleName: '',
    lastName: '',
    birthName: '',
    nickName: '',
    suffix: '',
    gender: 'male',
    birthDate: '',
    birthPlace: '',
    birthSource: '',
    deathDate: '',
    deathPlace: '',
    deathSource: '',
    burialPlace: '',
    residence: '',
    isDeceased: false,
    profession: '',
    company: '',
    interests: '',
    bio: '',
    gallery: [],
    voiceNotes: [],
    sources: [],
    events: [],
    email: '',
    website: '',
    blog: '',
    address: '',
    parents: [],
    spouses: [],
    children: [],
    ...overrides,
});

const mockPeople: Record<string, Person> = {
    'person-1': buildPerson({ id: 'person-1', firstName: 'Ahmad', lastName: 'Ali' }),
    'person-2': buildPerson({ id: 'person-2', firstName: 'Fatima', lastName: 'Omar', gender: 'female' }),
};

describe('SearchBar', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('performs search and displays results only when query matches current query', async () => {
        const onFocusPerson = vi.fn();

        // Mock search to return Ahmad
        vi.mocked(searchService.search).mockResolvedValue([
            { person: mockPeople['person-1'], score: 1, matchType: 'exact' }
        ]);

        render(<SearchBar people={mockPeople} onFocusPerson={onFocusPerson} />);

        const input = screen.getByRole('textbox');
        fireEvent.change(input, { target: { value: 'Ahmad' } });

        // Wait for debounce and search resolution
        await waitFor(() => {
            expect(searchService.search).toHaveBeenCalledWith('Ahmad', 10);
        });

        const resultCard = await screen.findByRole('button', { name: /Ahmad Ali/i });
        expect(resultCard).toBeInTheDocument();

        // Click on search result
        fireEvent.click(resultCard);
        expect(onFocusPerson).toHaveBeenCalledWith('person-1');
    });

    it('does not display stale async results when query is cleared', async () => {
        const onFocusPerson = vi.fn();
        let resolveSearch: (value: SearchResult[]) => void = () => {};

        vi.mocked(searchService.search).mockImplementation(() => {
            return new Promise((resolve) => {
                resolveSearch = resolve;
            });
        });

        render(<SearchBar people={mockPeople} onFocusPerson={onFocusPerson} />);

        const input = screen.getByRole('textbox');
        fireEvent.change(input, { target: { value: 'Ahmed' } });

        // Change query to empty before search resolves
        fireEvent.change(input, { target: { value: '' } });

        // Now resolve the search for 'Ahmed'
        resolveSearch([{ person: mockPeople['person-1'], score: 1, matchType: 'exact' }]);

        // Wait a bit to ensure it doesn't render Ahmad Ali since query is empty
        await new Promise((resolve) => setTimeout(resolve, 200));
        expect(screen.queryByText('Ahmad Ali')).not.toBeInTheDocument();
    });
});
