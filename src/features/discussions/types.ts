import type { Collaborator } from '../../services/supabaseTreeTypes';

export interface DiscussionPresenceUser {
  uid: string;
  email: string;
  onlineAt: string;
}

export type DiscussionCollaborator = Collaborator;

export interface TreeDiscussionRow {
  id: string;
  tree_id: string;
  user_id: string;
  user_email: string;
  content: string;
  reply_to_event_id?: string | null;
  reply_to_message_id?: string | null;
  reply_to_user_name?: string | null;
  reply_to_content?: string | null;
  created_at: string;
}

export interface DiscussionPresencePayload {
  uid?: unknown;
  email?: unknown;
  online_at?: unknown;
}

