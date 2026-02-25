import { useState, useCallback } from 'react';
import { Person } from '../types';
import { getAncestors } from '../utils/familyLogic';

export const useAncestryPath = (people: Record<string, Person>) => {
    const [highlightedPath, setHighlightedPath] = useState<Set<string>>(new Set());

    const highlightAncestors = useCallback((personId: string) => {
        const ancestors = getAncestors(personId, people);
        setHighlightedPath(ancestors);
    }, [people]);

    const clearHighlight = useCallback(() => {
        setHighlightedPath(new Set());
    }, []);

    return {
        highlightedPath,
        highlightAncestors,
        clearHighlight
    };
};
