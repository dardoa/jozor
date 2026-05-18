import {
  Clock,
  Edit3,
  Link2,
  Shield,
  Trash2,
  Unlink,
  User,
  UserPlus,
} from 'lucide-react';
import type { ActivityActionType, ActivityLog } from '../../../../features/activity-log';

type ActivityTranslations = {
  rename: string;
  activityDrawer: {
    someone: string;
    actions: Record<string, string | undefined>;
    roles: {
      editor: string;
      viewer: string;
    };
  };
};

export type ActivityPanelText = {
  overview?: string;
  tipPrefix?: string;
};

export const getActivityPanelText = (t: unknown): ActivityPanelText =>
  ((t as { adminHub?: { activityPanel?: ActivityPanelText } }).adminHub?.activityPanel) || {};

export const getActivityTargetId = (log: ActivityLog): string | null => {
  if (log.action_type === 'DELETE_PERSON') return null;
  return (log.details.personId as string) || (log.details.focusId as string) || (log.details.targetId as string) || null;
};

export const getActivityActionIcon = (type: ActivityActionType) => {
  switch (type) {
    case 'ADD_PERSON':
      return <User className="h-4 w-4 text-emerald-500" />;
    case 'UPDATE_PERSON':
      return <Edit3 className="h-4 w-4 text-blue-500" />;
    case 'DELETE_PERSON':
      return <Trash2 className="h-4 w-4 text-red-500" />;
    case 'ADD_RELATION':
      return <Link2 className="h-4 w-4 text-amber-500" />;
    case 'DELETE_RELATION':
      return <Unlink className="h-4 w-4 text-orange-500" />;
    case 'SHARE_INVITE':
      return <UserPlus className="h-4 w-4 text-indigo-500" />;
    case 'SHARE_INVITE_ACCEPT':
      return <UserPlus className="h-4 w-4 text-emerald-600" />;
    case 'SHARE_INVITE_DECLINE':
      return <UserPlus className="h-4 w-4 text-rose-500" />;
    case 'SHARE_REVOKE':
      return <Shield className="h-4 w-4 text-red-500" />;
    case 'SHARE_ROLE_CHANGE':
      return <Shield className="h-4 w-4 text-amber-600" />;
    default:
      return <Clock className="h-4 w-4 text-[var(--text-dim)]" />;
  }
};

export const getActivityActionColor = (type: ActivityActionType) => {
  switch (type) {
    case 'DELETE_PERSON':
    case 'SHARE_REVOKE':
      return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
    case 'ADD_PERSON':
    case 'SHARE_INVITE_ACCEPT':
      return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
    case 'UPDATE_PERSON':
      return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    default:
      return 'bg-[var(--theme-surface)] border-[var(--border-main)]';
  }
};

export const formatActivityActionDescription = (log: ActivityLog, t: ActivityTranslations) => {
  const { details, action_type } = log;
  const name =
    (details.personName as string) ||
    (details.targetName as string) ||
    (details.focusName as string) ||
    t.activityDrawer.someone;

  const inviteEmail = details.email as string | undefined;
  const role = details.role as string | undefined;
  const newRole = details.newRole as string | undefined;

  const roleLabel = role === 'editor' ? t.activityDrawer.roles.editor : t.activityDrawer.roles.viewer;
  const newRoleLabel = newRole === 'editor' ? t.activityDrawer.roles.editor : t.activityDrawer.roles.viewer;
  const actions = t.activityDrawer.actions;

  switch (action_type) {
    case 'ADD_PERSON':
      return String(actions.addPerson).replace('{name}', name);
    case 'UPDATE_PERSON':
      return String(actions.updatePerson).replace('{name}', name);
    case 'DELETE_PERSON':
      return String(actions.deletePerson).replace('{name}', name);
    case 'ADD_RELATION':
      return String(actions.addRelation)
        .replace('{focusName}', String(details.focusName || t.activityDrawer.someone))
        .replace('{existingName}', String(details.existingName || t.activityDrawer.someone));
    case 'DELETE_RELATION':
      return String(actions.deleteRelation)
        .replace('{targetName}', String(details.targetName || t.activityDrawer.someone))
        .replace('{relativeName}', String(details.relativeName || t.activityDrawer.someone));
    case 'SHARE_INVITE':
      if (!inviteEmail) return String(actions.shareInvite);
      return String(actions.shareInviteDetails)
        .replace('{email}', inviteEmail)
        .replace('{role}', roleLabel);
    case 'SHARE_INVITE_ACCEPT':
      if (!inviteEmail) return actions.shareInviteAccepted || 'A collaborator accepted an invitation';
      return (actions.shareInviteAcceptedDetails || '{email} accepted the invitation as {role}')
        .replace('{email}', inviteEmail)
        .replace('{role}', roleLabel);
    case 'SHARE_INVITE_DECLINE':
      if (!inviteEmail) return actions.shareInviteDeclined || 'A collaborator declined the invitation';
      return (actions.shareInviteDeclinedDetails || '{email} declined the invitation for {role}')
        .replace('{email}', inviteEmail)
        .replace('{role}', roleLabel);
    case 'SHARE_REVOKE':
      if (!inviteEmail) return String(actions.shareRevoke);
      return String(actions.shareRevokeDetails).replace('{email}', inviteEmail);
    case 'SHARE_ROLE_CHANGE':
      if (!inviteEmail || !newRole) return String(actions.shareRoleChange);
      return String(actions.shareRoleChangeDetails)
        .replace('{email}', inviteEmail)
        .replace('{role}', newRoleLabel);
    case 'RENAME_TREE':
      return t.rename;
    default:
      return String(actions.default);
  }
};
