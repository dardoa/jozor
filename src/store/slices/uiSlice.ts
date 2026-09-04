import { StateCreator } from 'zustand';
import { AppStore } from '../storeTypes';
import type { AppNotification } from '../../types';

const NOTIFICATION_STORAGE_KEY = 'jozor_persisted_notifications';
const MAX_NOTIFICATIONS = 50;

export interface UISlice {
    nodeContextMenu: {
        personId: string;
        x: number;
        y: number;
    } | null;
    setNodeContextMenu: (menu: { personId: string; x: number; y: number } | null) => void;
    isAdvancedBarOpen: boolean;
    setAdvancedBarOpen: (open: boolean) => void;
    isSettingsDrawerOpen: boolean;
    setSettingsDrawerOpen: (open: boolean) => void;
    isDiagnosticsDrawerOpen: boolean;
    setDiagnosticsDrawerOpen: (open: boolean) => void;
    isTreeControlCenterOpen: boolean;
    setTreeControlCenterOpen: (open: boolean) => void;
    adminHubTab: 'access' | 'activity' | 'versions' | 'settings';
    setAdminHubTab: (tab: 'access' | 'activity' | 'versions' | 'settings') => void;
    pulseTargetId: string | null;
    triggerPulse: (id: string) => void;
    smartPersonaTab: import('../../types').SmartPersonaTabId;
    setSmartPersonaTab: (tab: import('../../types').SmartPersonaTabId) => void;
    smartPersonaTargetSection: import('../../types').SmartPersonaSectionId | null;
    setSmartPersonaTargetSection: (section: import('../../types').SmartPersonaSectionId | null) => void;
    smartPersonaTargetField: import('../../types').SmartPersonaFieldId | null;
    setSmartPersonaTargetField: (field: import('../../types').SmartPersonaFieldId | null) => void;
    isSmartPersonaEditing: boolean;
    setSmartPersonaEditing: (editing: boolean) => void;
    isVaultOpen: boolean;
    setVaultOpen: (open: boolean) => void;
    vaultTab: 'cloud' | 'security' | 'trees' | 'members' | 'stats';
    setVaultTab: (tab: 'cloud' | 'security' | 'trees' | 'members' | 'stats') => void;
    vaultExportSection: 'family-book' | 'visuals' | 'data-export' | 'history' | 'cloud-backup';
    setVaultExportSection: (section: 'family-book' | 'visuals' | 'data-export' | 'history' | 'cloud-backup') => void;
    // Notifications
    notifications: AppNotification[];
    enqueueNotification: (n: Omit<AppNotification, 'id' | 'timestamp' | 'read' | 'createdAt' | 'updatedAt'>) => void;
    addNotification: (n: Omit<AppNotification, 'id' | 'timestamp' | 'read' | 'createdAt' | 'updatedAt'>) => void;
    updateNotification: (id: string, patch: Partial<AppNotification>) => void;
    removeNotification: (id: string) => void;
    markRead: (id: string) => void;
    markAllRead: () => void;
    clearNotifications: () => void;
    hydrateNotificationsFromStorage: (userUid?: string | null) => void;
    smartPersonaSize: 'closed' | 'collapsed' | 'expanded' | 'full';
    setSmartPersonaSize: (size: 'closed' | 'collapsed' | 'expanded' | 'full') => void;
}

const isStorageAvailable = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const isNotificationExpired = (notification: AppNotification, now = Date.now()) => {
    if (!notification.expiresAt) return false;
    const expiresAt = Date.parse(notification.expiresAt);
    return Number.isFinite(expiresAt) && expiresAt <= now;
};

export const isPersistableNotification = (notification: AppNotification) => {
    if (notification.type === 'invitation') return true;
    if (notification.type === 'integrity') return true;
    if (notification.type === 'info') {
        return notification.source === 'owner-realtime'
            || notification.source === 'activity-log'
            || notification.source === 'invitation-realtime';
    }
    return false;
};

export const sanitizePersistedNotifications = (
    notifications: AppNotification[],
    now = Date.now()
) => notifications
    .filter(isPersistableNotification)
    .filter(notification => !isNotificationExpired(notification, now))
    .slice(0, MAX_NOTIFICATIONS);

const getNotificationStorageKey = (userUid?: string | null) =>
    userUid ? `${NOTIFICATION_STORAGE_KEY}:${userUid}` : null;

export const loadPersistedNotifications = (userUid?: string | null): AppNotification[] => {
    if (!isStorageAvailable()) return [];
    const storageKey = getNotificationStorageKey(userUid);
    if (!storageKey) return [];

    try {
        const raw = window.localStorage.getItem(storageKey);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return sanitizePersistedNotifications(parsed as AppNotification[]);
    } catch {
        return [];
    }
};

export const persistNotifications = (notifications: AppNotification[], userUid?: string | null) => {
    if (!isStorageAvailable()) return;
    const storageKey = getNotificationStorageKey(userUid);
    if (!storageKey) return;

    const sanitized = sanitizePersistedNotifications(notifications);
    if (sanitized.length === 0) {
        window.localStorage.removeItem(storageKey);
        return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(sanitized));
};

export const createUISlice: StateCreator<AppStore, [["zustand/devtools", never]], [], UISlice> = (set, get) => ({
    nodeContextMenu: null,
    setNodeContextMenu: (menu) => set({ nodeContextMenu: menu }),
    isAdvancedBarOpen: false,
    setAdvancedBarOpen: (open) => set({ isAdvancedBarOpen: open }),
    isSettingsDrawerOpen: false,
    setSettingsDrawerOpen: (open) => set({ isSettingsDrawerOpen: open }),
    isDiagnosticsDrawerOpen: false,
    setDiagnosticsDrawerOpen: (open) => set({ isDiagnosticsDrawerOpen: open }),
    isTreeControlCenterOpen: false,
    setTreeControlCenterOpen: (open) => set({ isTreeControlCenterOpen: open }),
    adminHubTab: 'access',
    setAdminHubTab: (tab) => set({ adminHubTab: tab }),
    smartPersonaTab: 'about',
    setSmartPersonaTab: (tab) => set({ smartPersonaTab: tab }),
    smartPersonaTargetSection: null,
    setSmartPersonaTargetSection: (section) => set({ smartPersonaTargetSection: section }),
    smartPersonaTargetField: null,
    setSmartPersonaTargetField: (field) => set({ smartPersonaTargetField: field }),
    smartPersonaSize: 'closed',
    setSmartPersonaSize: (size) => set({ smartPersonaSize: size }),
    isSmartPersonaEditing: false,
    setSmartPersonaEditing: (editing) => set({ isSmartPersonaEditing: editing }),
    isVaultOpen: false,
    setVaultOpen: (open) => set({ isVaultOpen: open }),
    vaultTab: 'trees',
    setVaultTab: (tab) => set({ vaultTab: tab }),
    vaultExportSection: 'family-book',
    setVaultExportSection: (section) => set({ vaultExportSection: section }),
    pulseTargetId: null,
    triggerPulse: (id) => {
        set({ pulseTargetId: id });
        setTimeout(() => {
            if (get().pulseTargetId === id) {
                set({ pulseTargetId: null });
            }
        }, 3000);
    },
    // Notifications
    notifications: [],
    /**
     * Dedupe is intentionally store-level so every notification source
     * follows the same no-accumulation rule before the bell renders it.
     */
    enqueueNotification: (n) => set(state => {
        const now = new Date();
        const nowIso = now.toISOString();
        const timestamp = now.getTime();
        const userUid = get().user?.uid;
        const existingIndex = n.dedupeKey
            ? state.notifications.findIndex(notification => notification.dedupeKey === n.dedupeKey)
            : -1;

        if (existingIndex >= 0) {
            const existing = state.notifications[existingIndex];
            const updated: AppNotification = {
                ...existing,
                ...n,
                id: existing.id,
                timestamp,
                updatedAt: nowIso,
            };
            const notifications = [...state.notifications];
            notifications.splice(existingIndex, 1);
            notifications.unshift(updated);
            const nextNotifications = notifications.slice(0, MAX_NOTIFICATIONS);
            persistNotifications(nextNotifications, userUid);
            return { notifications: nextNotifications };
        }

        const nextNotifications = [
            {
                ...n,
                id: crypto.randomUUID(),
                timestamp,
                createdAt: nowIso,
                updatedAt: nowIso,
                read: false,
            },
            ...state.notifications,
        ].slice(0, MAX_NOTIFICATIONS);
        persistNotifications(nextNotifications, userUid);
        return {
            notifications: nextNotifications,
        };
    }),
    addNotification: (n) => get().enqueueNotification({
        ...n,
        source: n.source ?? 'system',
        actionable: n.actionable ?? false,
    }),
    updateNotification: (id, patch) => set(state => {
        const notifications = state.notifications.map(n => n.id === id ? {
            ...n,
            ...patch,
            updatedAt: new Date().toISOString(),
        } : n);
        persistNotifications(notifications, get().user?.uid);
        return { notifications };
    }),
    removeNotification: (id) => set(state => {
        const notifications = state.notifications.filter(n => n.id !== id);
        persistNotifications(notifications, get().user?.uid);
        return { notifications };
    }),
    markRead: (id) => set(state => {
        const notifications = state.notifications.map(n => n.id === id ? { ...n, read: true } : n);
        persistNotifications(notifications, get().user?.uid);
        return { notifications };
    }),
    markAllRead: () => set(state => {
        const notifications = state.notifications.map(n => ({ ...n, read: true }));
        persistNotifications(notifications, get().user?.uid);
        return { notifications };
    }),
    clearNotifications: () => {
        persistNotifications([], get().user?.uid);
        set({ notifications: [] });
    },
    hydrateNotificationsFromStorage: (userUid) => set({
        notifications: loadPersistedNotifications(userUid),
    }),
});
