
import { useState, useEffect, useCallback, useRef } from 'react';
import { Person, Gender } from '../types';
import { validatePerson } from '../utils/familyLogic';
import { INITIAL_PERSON, INITIAL_ROOT_ID, SAMPLE_FAMILY } from '../constants';
import { importFromGEDCOM } from '../utils/gedcomLogic';
import { importFromJozorArchive } from '../utils/archiveLogic';
import { 
    performAddChild, 
    performAddParent, 
    performAddSpouse, 
    performDeletePerson, 
    performLinkPerson, 
    performRemoveRelationship 
} from '../utils/treeOperations';

export const useFamilyTree = () => {
  // --- State Initialization ---
  const [people, setPeople] = useState<Record<string, Person>>(() => {
     try {
       const saved = localStorage.getItem('echo-family-data');
       if (saved) {
         const parsed = JSON.parse(saved);
         const validated: Record<string, Person> = {};
         Object.keys(parsed).forEach(key => { validated[key] = validatePerson(parsed[key]); });
         return validated;
       }
     } catch (e) {
       console.error("Data load error", e);
     }
     // Use Sample Family by default for better UX
     return SAMPLE_FAMILY; 
  });

  const [focusId, setFocusId] = useState<string>(INITIAL_ROOT_ID);
  
  // --- History Management ---
  const [history, setHistory] = useState<Record<string, Person>[]>([]);
  const [future, setFuture] = useState<Record<string, Person>[]>([]);
  const saveTimeoutRef = useRef<any>(null);

  // Auto-save with debounce
  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
        localStorage.setItem('echo-family-data', JSON.stringify(people));
    }, 1000);
    return () => clearTimeout(saveTimeoutRef.current);
  }, [people]);

  // Unified State Updater with History
  const setPeopleWithHistory = useCallback((updateFn: (prev: Record<string, Person>) => Record<string, Person>) => {
    setPeople((prev) => {
      const next = updateFn(prev);
      if (next === prev) return prev; 
      
      setHistory((h) => {
        const newHist = [...h, prev];
        return newHist.length > 50 ? newHist.slice(1) : newHist;
      });
      setFuture([]);
      return next;
    });
  }, []);

  // --- External Data Handlers ---
  const loadCloudData = useCallback((cloudPeople: Record<string, Person>) => {
      const validated: Record<string, Person> = {};
      Object.keys(cloudPeople).forEach(key => { validated[key] = validatePerson(cloudPeople[key]); });
      setPeople(validated);
      setHistory([]);
      setFuture([]);
      if (!validated[focusId]) setFocusId(Object.keys(validated)[0] || INITIAL_ROOT_ID);
  }, [focusId]);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    setPeople((curr) => {
        const prev = history[history.length - 1];
        setHistory(h => h.slice(0, -1));
        setFuture(f => [curr, ...f]);
        if (!prev[focusId]) setFocusId(Object.keys(prev)[0] || INITIAL_ROOT_ID);
        return prev;
    });
  }, [history, focusId]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    setPeople((curr) => {
        const next = future[0];
        setFuture(f => f.slice(1));
        setHistory(h => [...h, curr]);
        if (!next[focusId]) setFocusId(Object.keys(next)[0] || INITIAL_ROOT_ID);
        return next;
    });
  }, [future, focusId]);

  // --- Actions ---

  const updatePerson = useCallback((id: string, updates: Partial<Person>) => {
    setPeopleWithHistory(prev => ({ ...prev, [id]: { ...prev[id], ...updates } }));
  }, [setPeopleWithHistory]);

  const deletePerson = useCallback((idToDelete: string) => {
    // 1. Guard against deleting the last person
    const ids = Object.keys(people);
    if (ids.length <= 1) {
        alert("Cannot delete the last person in the tree.");
        return;
    }

    // 2. Find a safe person to focus on if we are deleting the current focus
    let nextFocusId = focusId;
    if (focusId === idToDelete) {
        const p = people[idToDelete];
        // Try to find a relative
        if (p && p.parents.length > 0 && people[p.parents[0]]) nextFocusId = p.parents[0];
        else if (p && p.spouses.length > 0 && people[p.spouses[0]]) nextFocusId = p.spouses[0];
        else if (p && p.children.length > 0 && people[p.children[0]]) nextFocusId = p.children[0];
        else {
            // Fallback to any other person
            nextFocusId = ids.find(id => id !== idToDelete) || ids[0];
        }
    }

    // 3. Update focus FIRST
    if (nextFocusId !== focusId) {
        setFocusId(nextFocusId);
    }

    // 4. Perform deletion (setTimeout ensures state batching doesn't cause a render of the deleted person)
    setTimeout(() => {
        setPeopleWithHistory(prev => performDeletePerson(prev, idToDelete));
    }, 0);
    
  }, [people, focusId, setPeopleWithHistory]);

  const performAddAction = useCallback((action: Function, gender: Gender) => {
      setPeopleWithHistory(prev => {
          const res = action(prev, focusId, gender);
          if (!res) return prev;
          setFocusId(res.newId); 
          return res.updatedPeople;
      });
  }, [focusId, setPeopleWithHistory]);

  const addParent = useCallback((g: Gender) => performAddAction(performAddParent, g), [performAddAction]);
  const addSpouse = useCallback((g: Gender) => performAddAction(performAddSpouse, g), [performAddAction]);
  const addChild = useCallback((g: Gender) => performAddAction(performAddChild, g), [performAddAction]);

  const removeRelationship = useCallback((targetId: string, relativeId: string, type: 'parent' | 'spouse' | 'child') => {
    setPeopleWithHistory(prev => performRemoveRelationship(prev, targetId, relativeId, type));
  }, [setPeopleWithHistory]);

  const linkPerson = useCallback((existingId: string, type: 'parent' | 'spouse' | 'child' | null) => {
    if (!type) return;
    setPeopleWithHistory(prev => performLinkPerson(prev, focusId, existingId, type));
  }, [focusId, setPeopleWithHistory]);

  const handleImport = async (file: File) => {
      try {
          let imported: Record<string, Person> = {};
          const name = file.name.toLowerCase();
          
          if (name.endsWith('.jozor') || name.endsWith('.zip')) {
              imported = await importFromJozorArchive(file);
          } else {
              const text = await file.text();
              imported = name.endsWith('.ged') ? importFromGEDCOM(text) : JSON.parse(text);
          }

          if (Object.keys(imported).length === 0) throw new Error("Empty file");

          const validated: Record<string, Person> = {};
          Object.keys(imported).forEach(k => validated[k] = validatePerson(imported[k]));
          
          setPeopleWithHistory(() => validated);
          setFocusId(Object.keys(validated)[0]);
          return true;
      } catch (e) {
          console.error(e);
          alert("Import failed. Please check the file format.");
          return false;
      }
  };

  const startNewTree = () => {
    setPeople(SAMPLE_FAMILY); // Reset to sample
    setHistory([]);
    setFuture([]);
    setFocusId(INITIAL_ROOT_ID);
  };

  return {
    people, focusId, setFocusId,
    history, future, undo, redo,
    updatePerson, deletePerson,
    addParent, addSpouse, addChild,
    removeRelationship, linkPerson,
    handleImport, startNewTree, loadCloudData
  };
};
