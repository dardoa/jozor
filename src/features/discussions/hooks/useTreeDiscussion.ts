import { useEffect, useCallback, useState } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { treeDiscussionService } from '../services/treeDiscussionService';
import { getTreeCollaborators } from '../../../services/supabaseTreeCollaboratorService';
import { activityService } from '../../activity-log';
import { logError } from '../../../utils/errorLogger';
import type { TreeDiscussionMessage } from '../../../types/tree';

const EMPTY_MESSAGES: TreeDiscussionMessage[] = [];

export const useTreeDiscussion = (treeId?: string) => {
  const user = useAppStore(state => state.user);
  const messages = useAppStore(state => state.discussionMessages[treeId || ''] || EMPTY_MESSAGES);
  const addMessage = useAppStore(state => state.addDiscussionMessage);
  const setMessages = useAppStore(state => state.setDiscussionMessages);
  const prependMessages = useAppStore(state => state.prependDiscussionMessages);
  const setCollaborators = useAppStore(state => state.setCollaborators);
  const hasMore = useAppStore(state => state.hasMore[treeId || ''] ?? false);
  
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Fetch initial messages and collaborators
  useEffect(() => {
    if (!treeId || !user) return;

    const load = async () => {
      setLoading(true);
      try {
        // Fetch messages
        const limit = 50;
        const msgs = await treeDiscussionService.fetchMessages(
          treeId,
          user.uid,
          user.email,
          user.supabaseToken,
          limit
        );
        // If we got exactly the limit, there might be more
        setMessages(treeId, msgs, msgs.length === limit);

        // Fetch collaborators
        const collabs = await getTreeCollaborators(
          treeId,
          user.uid,
          user.email,
          user.supabaseToken
        );
        setCollaborators(treeId, collabs);
      } catch (err) {
        logError('useTreeDiscussion load', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [treeId, user, setMessages, setCollaborators]);

  const loadMore = useCallback(async () => {
    if (!treeId || !user || loadingMore || !hasMore || messages.length === 0) return;

    setLoadingMore(true);
    try {
      const oldestMessage = messages[0];
      const limit = 50;
      const olderMsgs = await treeDiscussionService.fetchMessages(
        treeId,
        user.uid,
        user.email,
        user.supabaseToken,
        limit,
        oldestMessage.createdAt
      );

      prependMessages(treeId, olderMsgs, olderMsgs.length === limit);
    } catch (err) {
      logError('useTreeDiscussion loadMore', err);
    } finally {
      setLoadingMore(false);
    }
  }, [treeId, user, messages, hasMore, loadingMore, prependMessages]);

  const sendMessage = useCallback(async (
    content: string, 
    replyToEventId?: string,
    replyToMessageId?: string,
    replyToUserName?: string,
    replyToContent?: string
  ): Promise<boolean> => {
    if (!treeId || !user || !content.trim()) return false;

    try {
      const msg = await treeDiscussionService.sendMessage(
        treeId,
        user.uid,
        user.email,
        content,
        user.supabaseToken,
        replyToEventId,
        replyToMessageId,
        replyToUserName,
        replyToContent
      );
      
      if (msg) {
        addMessage(treeId, msg, user.uid);
        
        // Log activity
        activityService.logAction(treeId, 'TREE_DISCUSSION_MESSAGE', {
          messageId: msg.id,
          contentPreview: content.substring(0, 50)
        });
        return true;
      }
    } catch (err) {
      logError('useTreeDiscussion sendMessage', err);
    }
    return false;
  }, [treeId, user, addMessage]);

  return {
    messages,
    loading,
    loadingMore,
    hasMore,
    sendMessage,
    loadMore
  };
};
