import type { ActivityLog } from '../services/activityService';
import type { TranslationSchema } from '../../../utils/translationLoader';

const getDetailString = (log: ActivityLog, key: string): string | undefined => {
    const value = log.details[key];
    return typeof value === 'string' && value.trim() ? value : undefined;
};

const getRoleLabel = (role: string | undefined, t: TranslationSchema): string => {
    return role === 'editor' ? t.activityDrawer.roles.editor : t.activityDrawer.roles.viewer;
};

export const formatActivityDescription = (log: ActivityLog, t: TranslationSchema): string => {
    const name =
        getDetailString(log, 'personName') ||
        getDetailString(log, 'targetName') ||
        getDetailString(log, 'focusName') ||
        t.activityDrawer.someone;

    const inviteEmail = getDetailString(log, 'email');
    const role = getDetailString(log, 'role');
    const newRole = getDetailString(log, 'newRole');
    const roleLabel = getRoleLabel(role, t);
    const newRoleLabel = getRoleLabel(newRole, t);

    switch (log.action_type) {
        case 'ADD_PERSON':
            return t.activityDrawer.actions.addPerson.replace('{name}', name);
        case 'UPDATE_PERSON':
            return t.activityDrawer.actions.updatePerson.replace('{name}', name);
        case 'DELETE_PERSON':
            return t.activityDrawer.actions.deletePerson.replace('{name}', name);
        case 'ADD_RELATION':
            return t.activityDrawer.actions.addRelation
                .replace('{focusName}', getDetailString(log, 'focusName') || t.activityDrawer.someone)
                .replace('{existingName}', getDetailString(log, 'existingName') || t.activityDrawer.someone);
        case 'DELETE_RELATION':
            return t.activityDrawer.actions.deleteRelation
                .replace('{targetName}', getDetailString(log, 'targetName') || t.activityDrawer.someone)
                .replace('{relativeName}', getDetailString(log, 'relativeName') || t.activityDrawer.someone);
        case 'SHARE_INVITE':
            if (!inviteEmail) return t.activityDrawer.actions.shareInvite;
            return t.activityDrawer.actions.shareInviteDetails
                .replace('{email}', inviteEmail)
                .replace('{role}', roleLabel);
        case 'SHARE_INVITE_ACCEPT':
            if (!inviteEmail) return t.activityDrawer.actions.shareInviteAccepted;
            return t.activityDrawer.actions.shareInviteAcceptedDetails
                .replace('{email}', inviteEmail)
                .replace('{role}', roleLabel);
        case 'SHARE_INVITE_DECLINE':
            if (!inviteEmail) return t.activityDrawer.actions.shareInviteDeclined;
            return t.activityDrawer.actions.shareInviteDeclinedDetails
                .replace('{email}', inviteEmail)
                .replace('{role}', roleLabel);
        case 'SHARE_REVOKE':
            if (!inviteEmail) return t.activityDrawer.actions.shareRevoke;
            return t.activityDrawer.actions.shareRevokeDetails.replace('{email}', inviteEmail);
        case 'SHARE_ROLE_CHANGE':
            if (!inviteEmail || !newRole) return t.activityDrawer.actions.shareRoleChange;
            return t.activityDrawer.actions.shareRoleChangeDetails
                .replace('{email}', inviteEmail)
                .replace('{role}', newRoleLabel);
        case 'RENAME_TREE':
            return t.activityDrawer.actions.renameTree
                .replace('{oldName}', getDetailString(log, 'oldName') || '')
                .replace('{newName}', getDetailString(log, 'newName') || '');
        case 'TREE_DISCUSSION_MESSAGE':
            return t.activityDrawer.actions.discussionMessage;
        case 'TREE_SETTINGS_UPDATE':
            return t.activityDrawer.actions.settingsUpdate;
        default:
            return t.activityDrawer.actions.default;
    }
};

export const getActivityTargetId = (log: ActivityLog): string | null => {
    if (log.action_type === 'DELETE_PERSON') return null;
    return (
        getDetailString(log, 'personId') ||
        getDetailString(log, 'focusId') ||
        getDetailString(log, 'targetId') ||
        null
    );
};
