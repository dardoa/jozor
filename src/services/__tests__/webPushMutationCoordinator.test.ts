import { describe, expect, it, vi } from 'vitest';
import { createWebPushMutationCoordinator } from '../webPushMutationCoordinator';

vi.mock('../../store/useAppStore', () => ({
  useAppStore: { getState: () => ({ user: null }), subscribe: () => () => {} },
}));

const setup = () => {
  let uid: string | null = 'user-1';
  const listeners = new Set<() => void>();
  const detach = vi.fn();
  const source = {
    getUid: () => uid,
    subscribe: vi.fn((listener: () => void) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); detach(); };
    }),
  };
  const coordinator = createWebPushMutationCoordinator(source);
  const change = (next: string | null) => {
    uid = next;
    [...listeners].forEach(listener => listener());
  };
  return { coordinator, change, source, detach };
};
const retry = { enabled: true, ready: false, disableRetry: true, failed: true };
const off = { enabled: false, ready: false, disableRetry: false, failed: false };

describe('web push mutation coordinator', () => {
  it('serializes claims across observers and accounts', () => {
    const { coordinator, change } = setup();
    const first = coordinator.claim('disable', 'user-1', true)!;
    expect(first).not.toBeNull();
    expect(coordinator.claim('enable', 'user-1', false)).toBeNull();
    expect(coordinator.claim('disable', 'user-1', true)).toBeNull();
    change('user-2');
    expect(coordinator.claim('enable', 'user-2', false)).toBeNull();
  });

  it('retains pending and retry state without view subscribers', () => {
    const { coordinator } = setup();
    const close = coordinator.subscribe(vi.fn());
    const attempt = coordinator.claim('disable', 'user-1', true)!;
    close();
    expect(coordinator.isCurrent(attempt)).toBe(true);
    coordinator.settle(attempt, retry);
    const reopen = coordinator.subscribe(vi.fn());
    expect(coordinator.getSnapshot().outcome).toEqual(retry);
    expect(coordinator.getSnapshot().active).toBeNull();
    reopen();
  });

  it('invalidates A null A without mounted observers', () => {
    const { coordinator, change } = setup();
    const attempt = coordinator.claim('disable', 'user-1', true)!;
    change(null);
    change('user-1');
    expect(coordinator.getSnapshot().owner?.generation).toBe(attempt.owner.generation + 2);
    expect(coordinator.isCurrent(attempt)).toBe(false);
    expect(coordinator.advance(attempt, 'unsubscribe')).toBe(false);
    coordinator.settle(attempt, retry);
    expect(coordinator.getSnapshot().outcome).toBeNull();
  });

  it('keeps invalidated work locked until settlement', () => {
    const { coordinator, change } = setup();
    const attempt = coordinator.claim('disable', 'user-1', true)!;
    change('user-2');
    expect(coordinator.getSnapshot().active?.valid).toBe(false);
    expect(coordinator.claim('enable', 'user-2', false)).toBeNull();
    coordinator.settle(attempt, null);
    expect(coordinator.claim('enable', 'user-2', false)).not.toBeNull();
  });

  it('ignores an old settlement after a newer claim', () => {
    const { coordinator, change } = setup();
    const old = coordinator.claim('disable', 'user-1', true)!;
    change('user-2');
    coordinator.settle(old, null);
    const next = coordinator.claim('enable', 'user-2', false)!;
    coordinator.settle(old, off);
    expect(coordinator.getSnapshot().active?.id).toBe(next.id);
    expect(coordinator.isCurrent(next)).toBe(true);
  });

  it('ignores token refresh and rejects stale inspection', () => {
    const { coordinator, change } = setup();
    const close = coordinator.subscribe(vi.fn());
    const initial = coordinator.getSnapshot();
    change('user-1');
    expect(coordinator.getSnapshot()).toBe(initial);
    const attempt = coordinator.claim('disable', 'user-1', true)!;
    coordinator.settle(attempt, retry);
    expect(coordinator.acceptInspection(initial.owner!, initial.revision, true)).toBe(false);
    const current = coordinator.getSnapshot();
    expect(coordinator.acceptInspection(current.owner!, current.revision, false)).toBe(false);
    expect(coordinator.getSnapshot().outcome).toEqual(retry);
    close();
  });

  it('has stable snapshots and bounded listener lifetime', () => {
    const { coordinator, source, change, detach } = setup();
    const observer = vi.fn();
    const close = coordinator.subscribe(observer);
    const another = coordinator.subscribe(vi.fn());
    expect(source.subscribe).toHaveBeenCalledOnce();
    expect(coordinator.getSnapshot()).toBe(coordinator.getSnapshot());
    const attempt = coordinator.claim('disable', 'user-1', true)!;
    expect(observer).toHaveBeenCalledOnce();
    close(); another();
    expect(detach).not.toHaveBeenCalled();
    coordinator.settle(attempt, off);
    expect(detach).not.toHaveBeenCalled();
    change(null);
    expect(detach).toHaveBeenCalledOnce();
  });

  it('cleans obsolete proof and never exposes sensitive input', () => {
    const { coordinator, change } = setup();
    const attempt = coordinator.claim('disable', 'user-1', true)!;
    expect(coordinator.rememberDisableEndpoint(attempt, 'opaque-endpoint-hash')).toBe(true);
    coordinator.settle(attempt, retry);
    expect(coordinator.getDisableEndpointHash(attempt.owner)).toBe('opaque-endpoint-hash');
    expect(JSON.stringify(coordinator.getSnapshot())).not.toMatch(/token|endpoint|keys|opaque-endpoint-hash/);
    const next = coordinator.claim('disable', 'user-1', true)!;
    coordinator.settle(next, off);
    expect(coordinator.getDisableEndpointHash(attempt.owner)).toBeNull();
    const third = coordinator.claim('disable', 'user-1', true)!;
    coordinator.rememberDisableEndpoint(third, 'other-hash');
    change(null);
    expect(coordinator.getDisableEndpointHash(third.owner)).toBeNull();
  });

  it('publishes fresh inspection once and never loops unchanged publications', () => {
    const { coordinator } = setup();
    const close = coordinator.subscribe(vi.fn());
    const start = coordinator.getSnapshot();
    expect(coordinator.acceptInspection(start.owner!, start.revision, true)).toBe(true);
    const current = coordinator.getSnapshot();
    expect(current.outcome).toEqual({ enabled: true, ready: true, disableRetry: false, failed: false });
    expect(coordinator.acceptInspection(current.owner!, current.revision, true)).toBe(true);
    expect(coordinator.getSnapshot()).toBe(current);
    close();
  });
});
