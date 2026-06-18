import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useKeyboardShortcuts, type ShortcutMap } from '../useKeyboardShortcuts';

const dispatchKeyDown = (key: string, options: KeyboardEventInit = {}) => {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...options,
  });
  window.dispatchEvent(event);
  return event;
};

const countListenerCalls = (spy: ReturnType<typeof vi.spyOn>, eventName: string) =>
  (spy.mock.calls as unknown[][]).filter((call) => call[0] === eventName).length;

describe('useKeyboardShortcuts', () => {
  let addSpy: ReturnType<typeof vi.spyOn>;
  let removeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    addSpy = vi.spyOn(window, 'addEventListener');
    removeSpy = vi.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('keeps a stable keydown listener while using the latest shortcuts', () => {
    const firstHandler = vi.fn();
    const secondHandler = vi.fn();

    const { rerender, unmount } = renderHook(
      ({ shortcuts, active }: { shortcuts: ShortcutMap; active: boolean }) =>
        useKeyboardShortcuts(shortcuts, active),
      {
        initialProps: {
          shortcuts: { '?': firstHandler },
          active: true,
        },
      }
    );

    rerender({ shortcuts: { '?': secondHandler }, active: true });

    const event = dispatchKeyDown('?');

    expect(firstHandler).not.toHaveBeenCalled();
    expect(secondHandler).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
    expect(countListenerCalls(addSpy, 'keydown')).toBe(1);

    unmount();

    expect(countListenerCalls(removeSpy, 'keydown')).toBe(1);
  });

  it('respects active changes without rebinding the listener', () => {
    const handler = vi.fn();

    const { rerender } = renderHook(
      ({ active }: { active: boolean }) => useKeyboardShortcuts({ '?': handler }, active),
      { initialProps: { active: false } }
    );

    dispatchKeyDown('?');
    expect(handler).not.toHaveBeenCalled();

    rerender({ active: true });
    dispatchKeyDown('?');

    expect(handler).toHaveBeenCalledTimes(1);
    expect(countListenerCalls(addSpy, 'keydown')).toBe(1);
  });

  it('ignores shortcuts while typing in form fields', () => {
    const handler = vi.fn();
    const input = document.createElement('input');
    document.body.appendChild(input);

    renderHook(() => useKeyboardShortcuts({ '?': handler }));

    input.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: '?',
        bubbles: true,
        cancelable: true,
      })
    );

    expect(handler).not.toHaveBeenCalled();
    input.remove();
  });
});
