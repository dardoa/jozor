import { StateCreator } from 'zustand';
import type { TreeDiscussionMessage } from '../../../types/tree';

export interface DiscussionSlice {
  discussionMessages: Record<string, TreeDiscussionMessage[]>; // treeId -> messages
  lastReadTimestamps: Record<string, string>; // treeId -> ISO string
  unreadCounts: Record<string, number>; // treeId -> count
  onlineUsers: Record<string, any[]>; // treeId -> users
  collaborators: Record<string, any[]>; // treeId -> list of all members
  hasMore: Record<string, boolean>; // treeId -> whether there are more older messages
  isDiscussionOpen: boolean;
  addDiscussionMessage: (treeId: string, message: TreeDiscussionMessage, currentUserId?: string) => void;
  setDiscussionMessages: (treeId: string, messages: TreeDiscussionMessage[], hasMore?: boolean) => void;
  prependDiscussionMessages: (treeId: string, messages: TreeDiscussionMessage[], hasMore?: boolean) => void;
  clearDiscussionMessages: (treeId: string) => void;
  setDiscussionOpen: (isOpen: boolean) => void;
  markAsRead: (treeId: string) => void;
  removeDiscussionMessage: (treeId: string, messageId: string) => void;
  setOnlineUsers: (treeId: string, users: any[]) => void;
  setCollaborators: (treeId: string, collaborators: any[]) => void;
}

const UNREAD_STORAGE_KEY = 'jozor_unread_counts';

const loadSavedUnreadCounts = (): Record<string, number> => {
  if (typeof window === 'undefined') return {};
  try {
    const saved = localStorage.getItem(UNREAD_STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch (e) {
    return {};
  }
};

const saveUnreadCounts = (counts: Record<string, number>) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(UNREAD_STORAGE_KEY, JSON.stringify(counts));
  } catch (e) {
    // Ignore storage errors
  }
};

export const createDiscussionSlice: StateCreator<DiscussionSlice> = (set) => ({
  discussionMessages: {},
  lastReadTimestamps: {},
  unreadCounts: loadSavedUnreadCounts(),
  onlineUsers: {},
  collaborators: {},
  hasMore: {},
  isDiscussionOpen: false,
  
  setDiscussionOpen: (isOpen) => set({ isDiscussionOpen: isOpen }),

  setOnlineUsers: (treeId, users) => set((state) => ({
    onlineUsers: {
      ...state.onlineUsers,
      [treeId]: users
    }
  })),

  setCollaborators: (treeId, collaborators) => set((state) => ({
    collaborators: {
      ...state.collaborators,
      [treeId]: collaborators
    }
  })),

  setDiscussionMessages: (treeId, messages, hasMore = false) => set((state) => ({
    discussionMessages: {
      ...state.discussionMessages,
      [treeId]: messages
    },
    hasMore: {
      ...state.hasMore,
      [treeId]: hasMore
    }
  })),

  prependDiscussionMessages: (treeId, newOlderMessages, hasMore = false) => set((state) => {
    const existing = state.discussionMessages[treeId] || [];
    // Merge and deduplicate just in case
    const merged = [...newOlderMessages, ...existing];
    const uniqueMap = new Map();
    merged.forEach(m => uniqueMap.set(m.id, m));
    
    const finalMessages = Array.from(uniqueMap.values()).sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    return {
      discussionMessages: {
        ...state.discussionMessages,
        [treeId]: finalMessages
      },
      hasMore: {
        ...state.hasMore,
        [treeId]: hasMore
      }
    };
  }),

  markAsRead: (treeId) => set((state) => {
    const newUnreadCounts = { ...state.unreadCounts, [treeId]: 0 };
    saveUnreadCounts(newUnreadCounts);
    return {
      unreadCounts: newUnreadCounts,
      lastReadTimestamps: {
        ...state.lastReadTimestamps,
        [treeId]: new Date().toISOString()
      }
    };
  }),

  addDiscussionMessage: (treeId, message, currentUserId) => set((state) => {
    const existing = state.discussionMessages[treeId] || [];
    const index = existing.findIndex(m => m.id === message.id);
    
    let newMessages;
    if (index !== -1) {
      // Update existing message (merge)
      newMessages = [...existing];
      newMessages[index] = { ...newMessages[index], ...message };
    } else {
      // Add new message
      newMessages = [...existing, message];
    }

    // Sort to keep order
    newMessages.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    
    // Unread count logic: only for NEW messages (not updates) from others while drawer closed
    const isNew = index === -1;
    const isOwnMessage = currentUserId && message.userId === currentUserId;
    const shouldIncrement = isNew && !state.isDiscussionOpen && !isOwnMessage;
    
    const currentCount = state.unreadCounts[treeId] || 0;
    const newUnreadCounts = shouldIncrement 
      ? { ...state.unreadCounts, [treeId]: currentCount + 1 }
      : state.unreadCounts;

    if (shouldIncrement) {
      saveUnreadCounts(newUnreadCounts);
    }

    return {
      unreadCounts: newUnreadCounts,
      discussionMessages: {
        ...state.discussionMessages,
        [treeId]: newMessages
      }
    };
  }),

  removeDiscussionMessage: (treeId, messageId) => set((state) => ({
    discussionMessages: {
      ...state.discussionMessages,
      [treeId]: (state.discussionMessages[treeId] || []).filter(m => m.id !== messageId)
    }
  })),

  clearDiscussionMessages: (treeId) => set((state) => {
    const next = { ...state.discussionMessages };
    delete next[treeId];
    return { discussionMessages: next };
  }),
});
