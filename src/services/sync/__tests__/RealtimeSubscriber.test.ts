import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RealtimeSubscriber } from '../RealtimeSubscriber';
import { useAppStore } from '../../../store/useAppStore';

const state = vi.hoisted(() => ({ channels: [] as {
  name: string; table: string; callback?: (payload: { new: Record<string, unknown> }) => void;
  subscribed?: (status: string) => void; unsubscribe: ReturnType<typeof vi.fn>;
}[] }));
vi.mock('../../supabaseClient', () => ({ getSupabaseFull: () => ({
  channel: (name: string) => {
    const existing = state.channels.find(channel => channel.name === name);
    if (existing) return existing;
    const channel = {
      name, table: '', callback: undefined as ((payload: { new: Record<string, unknown> }) => void) | undefined,
      subscribed: undefined as ((status: string) => void) | undefined, unsubscribe: vi.fn(),
      on: (_event: string, filter: { table: string }, callback: (payload: { new: Record<string, unknown> }) => void) => { channel.table = filter.table; channel.callback = callback; return channel; },
      subscribe: (callback?: (status: string) => void) => { channel.subscribed = callback; return channel; },
    };
    state.channels.push(channel);
    return channel;
  },
}) }));

describe('viewer-safe realtime subscriber', () => {
  beforeEach(() => {
    state.channels.length = 0;
    useAppStore.setState({ currentTreeId: 'tree', currentUserRole: 'viewer', user: {
      uid: 'viewer', email: 'viewer@example.test', displayName: 'Test', photoURL: '',
    } });
  });
  it('subscribes viewers only to signals/permissions and reloads on reconnect', () => {
    const options = { onOperation: vi.fn(), onPermissionUpdate: vi.fn(), onReconcile: vi.fn() };
    const subscriber = new RealtimeSubscriber(options);
    subscriber.subscribe('tree');
    expect(state.channels.map(channel => channel.table)).toEqual(['tree_change_signals', 'tree_collaborators']);
    const signal = state.channels[0];
    signal.subscribed!('SUBSCRIBED');
    signal.callback!({ new: { tree_id: 'tree', revision: 2 } });
    signal.subscribed!('SUBSCRIBED');
    expect(options.onReconcile).toHaveBeenCalledTimes(3);
    expect(options.onOperation).not.toHaveBeenCalled();
    useAppStore.setState({ currentTreeId: 'another-tree' });
    signal.callback!({ new: { tree_id: 'tree', revision: 3 } });
    expect(options.onReconcile).toHaveBeenCalledTimes(3);
    subscriber.unsubscribe();
    for (const channel of state.channels) expect(channel.unsubscribe).toHaveBeenCalledOnce();
  });
  it('isolates sync and notification consumers even when the SDK reuses topics', () => {
    useAppStore.setState({ currentUserRole: 'editor' });
    const mainOptions = { onOperation: vi.fn(), onPermissionUpdate: vi.fn(), onReconcile: vi.fn() };
    const main = new RealtimeSubscriber(mainOptions);
    const notifications = new RealtimeSubscriber({ onOperation: vi.fn(), onPermissionUpdate: vi.fn(), onReconcile: vi.fn() });
    main.subscribe('tree');
    notifications.subscribe('tree');
    expect(state.channels).toHaveLength(6);
    expect(new Set(state.channels.map(channel => channel.name)).size).toBe(6);
    notifications.unsubscribe();
    for (const channel of state.channels.slice(0, 3)) expect(channel.unsubscribe).not.toHaveBeenCalled();
    state.channels[0].callback!({ new: { id: 'operation' } });
    expect(mainOptions.onOperation).toHaveBeenCalledOnce();
    main.unsubscribe();
  });
  it('invalidates late callbacks from a previous subscription to the same tree and account', () => {
    const options = { onOperation: vi.fn(), onPermissionUpdate: vi.fn(), onReconcile: vi.fn() };
    const subscriber = new RealtimeSubscriber(options);
    subscriber.subscribe('tree');
    const [oldSignal, oldPermissions] = state.channels;
    subscriber.subscribe('tree');
    oldSignal.callback!({ new: { revision: 2 } });
    oldSignal.subscribed!('SUBSCRIBED');
    oldPermissions.callback!({ new: { role: 'editor' } });
    oldPermissions.subscribed!('SUBSCRIBED');
    expect(options.onReconcile).not.toHaveBeenCalled();
    expect(options.onPermissionUpdate).not.toHaveBeenCalled();
    state.channels[3].subscribed!('SUBSCRIBED');
    expect(options.onPermissionUpdate).toHaveBeenCalledWith({ tree_id: 'tree' });
    subscriber.unsubscribe();
    state.channels[3].subscribed!('SUBSCRIBED');
    expect(options.onPermissionUpdate).toHaveBeenCalledOnce();
  });
});
