import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from '../useAppStore';
import { DEFAULT_PERSON_TEMPLATE } from '../../constants';
import type { Person } from '../../types';
import { storageService } from '../../services/storageService';

const buildPerson = (id: string, firstName: string, overrides: Partial<Person> = {}): Person => ({
  ...DEFAULT_PERSON_TEMPLATE,
  id,
  firstName,
  lastName: 'Doe',
  isDeceased: false,
  birthDate: '1995-05-10',
  birthPlace: 'New York',
  email: 'test@example.com',
  parents: [],
  spouses: [],
  children: [],
  ...overrides,
});

describe('Zustand Privacy Masking Interceptor', () => {
  beforeEach(() => {
    act(() => {
      useAppStore.getState().setCurrentUserRole('owner'); // Reset role
      useAppStore.getState().startNewTree();
    });
  });

  it('does not mask data when role is owner or editor', () => {
    const rawPerson = buildPerson('p-1', 'Ahmad', { isDeceased: false });
    
    act(() => {
      useAppStore.getState().setPeople({ 'p-1': rawPerson });
    });

    const storedPerson = useAppStore.getState().people['p-1'];
    expect(storedPerson.firstName).toBe('Ahmad');
    expect(storedPerson.lastName).toBe('Doe');
    expect(storedPerson.birthDate).toBe('1995-05-10');
  });

  it('automatically masks living people when role is viewer', () => {
    act(() => {
      useAppStore.getState().setCurrentUserRole('viewer');
    });

    const rawPerson = buildPerson('p-1', 'Ahmad', { isDeceased: false });
    
    act(() => {
      useAppStore.getState().setPeople({ 'p-1': rawPerson });
    });

    const storedPerson = useAppStore.getState().people['p-1'];
    expect(storedPerson.firstName).toBe('Private');
    expect(storedPerson.lastName).toBe('');
    expect(storedPerson.birthDate).toBe('');
    expect(storedPerson.birthPlace).toBe('');
    expect(storedPerson.email).toBe('');
  });

  it('does not mask deceased non-private people even when role is viewer', () => {
    act(() => {
      useAppStore.getState().setCurrentUserRole('viewer');
    });

    const deceasedPerson = buildPerson('p-2', 'Saeed', { isDeceased: true, deathDate: '2010-01-01' });

    act(() => {
      useAppStore.getState().setPeople({ 'p-2': deceasedPerson });
    });

    const storedPerson = useAppStore.getState().people['p-2'];
    expect(storedPerson.firstName).toBe('Saeed');
    expect(storedPerson.lastName).toBe('Doe');
  });

  it('masks deceased private people when role is viewer', () => {
    act(() => {
      useAppStore.getState().setCurrentUserRole('viewer');
    });

    const privateDeceased = buildPerson('p-3', 'Saeed', { isDeceased: true, isPrivate: true });

    act(() => {
      useAppStore.getState().setPeople({ 'p-3': privateDeceased });
    });

    const storedPerson = useAppStore.getState().people['p-3'];
    expect(storedPerson.firstName).toBe('Private');
  });

  it('reactively masks existing state people when role transitions to viewer', () => {
    const rawPerson = buildPerson('p-1', 'Ahmad', { isDeceased: false });

    act(() => {
      useAppStore.getState().setPeople({ 'p-1': rawPerson });
    });

    // Verify it is not masked initially
    expect(useAppStore.getState().people['p-1'].firstName).toBe('Ahmad');

    // Transition role
    act(() => {
      useAppStore.getState().setCurrentUserRole('viewer');
    });

    // Verify it got masked reactively
    expect(useAppStore.getState().people['p-1'].firstName).toBe('Private');
    expect(useAppStore.getState().people['p-1'].lastName).toBe('');
  });

  it('triggers clearActiveTreeCache on storageService when role transitions to viewer', () => {
    // @ts-expect-error - mockResolvedValue is injected by vitest spyOn
    const clearCacheSpy = vi.spyOn(storageService, 'clearActiveTreeCache').mockResolvedValue(undefined);
    
    act(() => {
      useAppStore.setState({ currentTreeId: 'tree-123' });
      useAppStore.getState().setCurrentUserRole('viewer');
    });

    expect(clearCacheSpy).toHaveBeenCalledWith('tree-123');
    clearCacheSpy.mockRestore();
  });
});
