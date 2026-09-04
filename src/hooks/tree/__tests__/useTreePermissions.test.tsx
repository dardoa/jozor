import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useAppStore } from '../../../store/useAppStore';
import { useTreePermissions } from '../useTreePermissions';

describe('useTreePermissions', () => {
  beforeEach(() => {
    act(() => {
      useAppStore.setState({
        currentTreeId: null,
        currentUserRole: null,
      });
    });
  });

  it('keeps a local tree editable when no cloud role exists', () => {
    const { result } = renderHook(() => useTreePermissions());

    expect(result.current.canEdit).toBe(true);
    expect(result.current.canDelete).toBe(true);
    expect(result.current.canManageTreeSettings).toBe(true);
  });

  it('keeps an explicit viewer role read-only during a transition to local context', () => {
    act(() => {
      useAppStore.setState({ currentUserRole: 'viewer' });
    });
    const { result } = renderHook(() => useTreePermissions());

    expect(result.current.canEdit).toBe(false);
    expect(result.current.canDelete).toBe(false);
    expect(result.current.canManageTreeSettings).toBe(false);
  });

  it('fails closed while a cloud tree role is unresolved', () => {
    act(() => {
      useAppStore.setState({ currentTreeId: 'cloud-tree-1' });
    });
    const { result } = renderHook(() => useTreePermissions());

    expect(result.current.role).toBeNull();
    expect(result.current.canEdit).toBe(false);
    expect(result.current.canDelete).toBe(false);
    expect(result.current.canManageTreeSettings).toBe(false);
  });

  it.each([
    ['owner', true, true],
    ['editor', true, false],
    ['viewer', false, false],
  ] as const)('maps a cloud %s role to its mutation boundaries', (
    role,
    canEdit,
    canManageTreeSettings
  ) => {
    act(() => {
      useAppStore.setState({
        currentTreeId: 'cloud-tree-1',
        currentUserRole: role,
      });
    });
    const { result } = renderHook(() => useTreePermissions());

    expect(result.current.canEdit).toBe(canEdit);
    expect(result.current.canDelete).toBe(canEdit);
    expect(result.current.canManageTreeSettings).toBe(canManageTreeSettings);
  });

  it('locks mutations immediately when an editor role becomes unresolved', () => {
    act(() => {
      useAppStore.setState({
        currentTreeId: 'cloud-tree-1',
        currentUserRole: 'editor',
      });
    });
    const { result } = renderHook(() => useTreePermissions());
    expect(result.current.canEdit).toBe(true);

    act(() => {
      useAppStore.setState({ currentUserRole: null });
    });

    expect(result.current.canEdit).toBe(false);
    expect(result.current.canDelete).toBe(false);
  });
});
