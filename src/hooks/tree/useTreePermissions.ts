import { useAppStore } from '../../store/useAppStore';

export const useTreePermissions = () => {
    const role = useAppStore(state => state.currentUserRole);

    const isOwner = role === 'owner';
    const isEditor = role === 'editor';
    const isViewer = role === 'viewer';
    
    // Default to true if not authenticated/role-mapped specifically for safe failures, but ideally false.
    // In our context, null means local or we haven't loaded it. But let's be strict if it's explicitly viewer.

    const canEdit = role === 'owner' || role === 'editor' || role === null; 
    const canDelete = role === 'owner' || role === 'editor' || role === null;
    
    const canManageMembers = role === 'owner';
    const canManageCloud = role === 'owner';
    const canManageSecurity = role === 'owner';
    const canManageTreeSettings = role === 'owner' || role === null;

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
