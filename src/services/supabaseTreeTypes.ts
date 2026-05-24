export interface TreeSummary {
  id: string;
  name: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt?: string;
  peopleCount?: number;
}

export interface SharedTreeSummary extends TreeSummary {
  role: 'editor' | 'viewer';
}

export type TreeAccessRole = 'owner' | 'editor' | 'viewer' | null;

export interface Collaborator {
  id: string;
  tree_id: string;
  email: string;
  collaborator_uid?: string | null;
  role: 'editor' | 'viewer';
  invited_by: string;
  invited_at: string;
}
