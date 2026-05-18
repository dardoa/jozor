import { useMemo } from 'react';
import type { Person, SearchProps } from '../../types';

export function useAppSearchBindings({
  people,
  setFocusId,
}: {
  people: Record<string, Person>;
  setFocusId: (id: string) => void;
}): SearchProps {
  return useMemo<SearchProps>(() => ({
    people,
    onFocusPerson: setFocusId,
  }), [people, setFocusId]);
}
