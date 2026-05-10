import { useCallback, useEffect, useRef, useState } from 'react';
import type React from 'react';

import type { Person } from '../../types';
import { searchService } from '../../services/searchService';

interface UsePersonSearchControllerOptions {
  people: Record<string, Person>;
  onFocusPerson: (id: string) => void;
  onSetSearchTarget: (id: string) => void;
}

export const usePersonSearchController = ({
  people,
  onFocusPerson,
  onSetSearchTarget,
}: UsePersonSearchControllerOptions) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Person[]>([]);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRequestIdRef = useRef(0);

  const clearBlurTimeout = useCallback(() => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
  }, []);

  const handleSearch = useCallback((query: string) => {
    const requestId = searchRequestIdRef.current + 1;
    searchRequestIdRef.current = requestId;
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults([]);
      setActiveIndex(-1);
      return;
    }

    void searchService.search(query).then((results) => {
      if (searchRequestIdRef.current !== requestId) return;
      setSearchResults(results);
      setActiveIndex(-1);
    });
  }, []);

  const handleClearSearch = useCallback(() => {
    clearBlurTimeout();
    setSearchQuery('');
    searchRequestIdRef.current += 1;
    setSearchResults([]);
    setIsSearchActive(false);
    setActiveIndex(-1);
  }, [clearBlurTimeout]);

  const focusResult = useCallback((personId: string) => {
    onFocusPerson(personId);
    onSetSearchTarget(personId);
    handleClearSearch();
  }, [handleClearSearch, onFocusPerson, onSetSearchTarget]);

  const handleHighlight = useCallback((id: string | null) => {
    if (!id) {
      setActiveIndex(-1);
      return;
    }

    setActiveIndex(searchResults.findIndex((person) => person.id === id));
  }, [searchResults]);

  const handleInputKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!searchQuery.trim()) {
      if (event.key === 'Escape') handleClearSearch();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsSearchActive(true);
      setActiveIndex((currentIndex) =>
        searchResults.length === 0 ? -1 : Math.min(currentIndex + 1, searchResults.length - 1)
      );
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setIsSearchActive(true);
      setActiveIndex((currentIndex) =>
        searchResults.length === 0 ? -1 : Math.max(currentIndex - 1, 0)
      );
      return;
    }

    const activeResult =
      activeIndex >= 0 && activeIndex < searchResults.length ? searchResults[activeIndex] : null;

    if (event.key === 'Enter' && activeResult) {
      event.preventDefault();
      focusResult(activeResult.id);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      handleClearSearch();
    }
  }, [activeIndex, focusResult, handleClearSearch, searchQuery, searchResults]);

  const handleInputBlur = useCallback(() => {
    blurTimeoutRef.current = setTimeout(() => setIsSearchActive(false), 160);
  }, []);

  useEffect(() => {
    void searchService.updateSearchIndex(Object.values(people));
  }, [people]);

  useEffect(() => () => {
    clearBlurTimeout();
  }, [clearBlurTimeout]);

  const activeResult =
    activeIndex >= 0 && activeIndex < searchResults.length ? searchResults[activeIndex] : null;

  return {
    searchQuery,
    searchResults,
    isSearchActive,
    activeResult,
    handleSearch,
    handleClearSearch,
    handleHighlight,
    handleInputKeyDown,
    handleInputBlur,
    focusResult,
    setIsSearchActive,
  };
};
