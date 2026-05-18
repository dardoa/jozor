import React, { useEffect } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { treeDiscussionService } from '../services/treeDiscussionService';
import { logError } from '../../../utils/errorLogger';

/**
 * DiscussionListener - Background component that handles real-time message 
 * subscriptions even when the discussion drawer is closed.
 */
export const DiscussionListener: React.FC = () => {
  const user = useAppStore(state => state.user);
  const currentTreeId = useAppStore(state => state.currentTreeId);
  const addMessage = useAppStore(state => state.addDiscussionMessage);
  const removeMessage = useAppStore(state => state.removeDiscussionMessage);
  const setOnlineUsers = useAppStore(state => state.setOnlineUsers);

  useEffect(() => {
    if (!currentTreeId || !user) return;

    // Start background subscription
    const sub = treeDiscussionService.subscribeToMessages(
      currentTreeId,
      user.uid,
      user.email,
      user.supabaseToken,
      (msg) => {
        // This will update messages AND unreadCounts in the store
        addMessage(currentTreeId, msg, user.uid);
      },
      (messageId) => {
        // Handle deletion
        removeMessage(currentTreeId, messageId);
      },
      (onlineUsers) => {
        // Handle presence
        setOnlineUsers(currentTreeId, onlineUsers);
      },
      (status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[Discussion] Subscribed to tree: ${currentTreeId}`);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          logError('DiscussionListener subscription error', err || new Error(status), {
            metadata: { treeId: currentTreeId, status }
          });
        }
      }
    );

    return () => {
      sub.unsubscribe();
    };
  }, [currentTreeId, user, addMessage, removeMessage, setOnlineUsers]);

  return null; // Invisible component
};
