import { getSupabaseFull, getSupabaseWithAuth } from '../../../services/supabaseClient';
import { logError, logInfo } from '../../../utils/errorLogger';
import type { TreeDiscussionMessage } from '../../../types/tree';
import type { DiscussionPresencePayload, DiscussionPresenceUser, TreeDiscussionRow } from '../types';

export const DISCUSSION_MESSAGE_MAX_LENGTH = 2000;

const mapDiscussionRowToMessage = (row: TreeDiscussionRow): TreeDiscussionMessage => ({
  id: row.id,
  treeId: row.tree_id,
  userId: row.user_id,
  userEmail: row.user_email,
  content: row.content,
  replyToEventId: row.reply_to_event_id ?? undefined,
  replyToMessageId: row.reply_to_message_id ?? undefined,
  replyToUserName: row.reply_to_user_name ?? undefined,
  replyToContent: row.reply_to_content ?? undefined,
  createdAt: row.created_at,
});

const normalizePresencePayload = (payload: DiscussionPresencePayload): DiscussionPresenceUser | null => {
  if (typeof payload.uid !== 'string' || typeof payload.email !== 'string') {
    return null;
  }

  return {
    uid: payload.uid,
    email: payload.email,
    onlineAt: typeof payload.online_at === 'string' ? payload.online_at : '',
  };
};

export const treeDiscussionService = {
  /**
   * Fetches the latest messages for a tree.
   */
  async fetchMessages(
    treeId: string,
    uid: string,
    email: string,
    token?: string,
    limit: number = 50,
    beforeTimestamp?: string
  ): Promise<TreeDiscussionMessage[]> {
    try {
      const client = getSupabaseWithAuth(uid, email, token);
      let query = client
        .from('tree_discussions')
        .select('*')
        .eq('tree_id', treeId);
      
      if (beforeTimestamp) {
        query = query.lt('created_at', beforeTimestamp);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return ((data || []) as TreeDiscussionRow[])
        .map(mapDiscussionRowToMessage)
        .reverse(); // Return in chronological order
    } catch (error) {
      logError('TreeDiscussionService fetchMessages', error, {
        category: 'DATABASE',
        severity: 'LOW',
        metadata: { treeId }
      });
      return [];
    }
  },

  /**
   * Sends a new message to the tree discussion.
   */
  async sendMessage(
    treeId: string,
    userId: string,
    userEmail: string,
    content: string,
    token?: string,
    replyToEventId?: string,
    replyToMessageId?: string,
    replyToUserName?: string,
    replyToContent?: string
  ): Promise<TreeDiscussionMessage | null> {
    const trimmedContent = content.trim();
    if (!trimmedContent) return null;
    if (trimmedContent.length > DISCUSSION_MESSAGE_MAX_LENGTH) {
      throw new Error(`Message must be ${DISCUSSION_MESSAGE_MAX_LENGTH} characters or fewer.`);
    }

    try {
      const client = getSupabaseWithAuth(userId, userEmail, token);
      const { data, error } = await client
        .from('tree_discussions')
        .insert({
          tree_id: treeId,
          user_id: userId,
          user_email: userEmail,
          content: trimmedContent,
          reply_to_event_id: replyToEventId,
          reply_to_message_id: replyToMessageId,
          reply_to_user_name: replyToUserName,
          reply_to_content: replyToContent?.slice(0, 240)
        })
        .select()
        .single();

      if (error) throw error;

      logInfo('TreeDiscussionService sendMessage', 'Message sent.', { treeId, userId });

      return mapDiscussionRowToMessage(data as TreeDiscussionRow);
    } catch (error) {
      logError('TreeDiscussionService sendMessage', error, {
        category: 'DATABASE',
        severity: 'MEDIUM',
        metadata: { treeId, userId }
      });
      return null;
    }
  },

  /**
   * Deletes a message from the tree discussion.
   */
  async deleteMessage(
    messageId: string,
    userId: string,
    userEmail: string,
    token?: string
  ): Promise<boolean> {
    try {
      const client = getSupabaseWithAuth(userId, userEmail, token);
      const { error } = await client
        .from('tree_discussions')
        .delete()
        .eq('id', messageId);

      if (error) throw error;
      return true;
    } catch (error) {
      logError('TreeDiscussionService deleteMessage', error, {
        category: 'DATABASE',
        severity: 'MEDIUM',
        metadata: { messageId, userId }
      });
      return false;
    }
  },

  /**
   * Subscribes to real-time messages for a tree.
   */
  subscribeToMessages(
    treeId: string,
    uid: string,
    email: string,
    token: string | undefined,
    onMessage: (message: TreeDiscussionMessage) => void,
    onDelete?: (messageId: string) => void,
    onPresenceSync?: (users: DiscussionPresenceUser[]) => void,
    onStatus?: (status: string, error?: Error) => void
  ) {
    const client = getSupabaseFull(uid, email, token);
    const channel = client
      .channel(`tree_discussion:${treeId}`, {
        config: {
          presence: {
            key: uid,
          },
        },
      })
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT and DELETE
          schema: 'public',
          table: 'tree_discussions',
          filter: `tree_id=eq.${treeId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            onMessage(mapDiscussionRowToMessage(payload.new as TreeDiscussionRow));
          } else if (payload.eventType === 'DELETE') {
            const deletedRow = payload.old as Partial<TreeDiscussionRow>;
            if (onDelete && typeof deletedRow.id === 'string') onDelete(deletedRow.id);
          }
        }
      )
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        const onlineUsers = Object.values(newState)
          .flat()
          .map((presence) => normalizePresencePayload(presence as DiscussionPresencePayload))
          .filter((presence): presence is DiscussionPresenceUser => Boolean(presence));
        if (onPresenceSync) onPresenceSync(onlineUsers);
      })
      .subscribe((status, err) => {
        if (onStatus) onStatus(status, err);
        if (status === 'SUBSCRIBED') {
          channel.track({
            uid,
            email,
            online_at: new Date().toISOString(),
          });
        }
        if (err) {
          logError('TreeDiscussionService subscription', err, {
            category: 'DATABASE',
            severity: 'MEDIUM',
            metadata: { treeId, status }
          });
        }
      });

    return {
      unsubscribe: () => {
        channel.unsubscribe();
      },
      channel
    };
  }
};
