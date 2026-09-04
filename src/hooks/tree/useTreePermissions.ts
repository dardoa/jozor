import { useAppStore } from '../../store/useAppStore';
import { canEditTreeContext, isLocalTreeContext } from '../../domain/treePermissionPolicy';

export const useTreePermissions = () => {
    const role = useAppStore(state => state.currentUserRole);
    const currentTreeId = useAppStore(state => state.currentTreeId);

    const isOwner = role === 'owner';
    const isEditor = role === 'editor';
    const isViewer = role === 'viewer';
    const isLocalTree = isLocalTreeContext(currentTreeId);

    // A null role is editable only for a local tree. Cloud trees stay read-only
    // while their role is still loading or has been revoked.
    const canEdit = canEditTreeContext({ currentTreeId, role });
    const canDelete = canEdit;
    
    const canManageMembers = role === 'owner';
    const canManageCloud = role === 'owner';
    const canManageSecurity = role === 'owner';
    const canManageTreeSettings = isOwner || (role === null && isLocalTree);

    // Viewer gets restricted Vault view (Export only)
    const canViewFullVault = role === 'owner';

    return {
        role,
        isOwner,
        isEditor,
        isViewer,
        canEdit,
        canDelete,
        canManageMembers,
        canManageCloud,
        canManageSecurity,
        canManageTreeSettings,
        canViewFullVault
    };
};
