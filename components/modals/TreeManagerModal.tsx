import React, { useEffect, useState } from 'react';
import { X, TreePine, Edit2, Trash2, Check, Loader2, AlertCircle, FolderTree, Play, Shield, Eye, Users, UserPlus, Mail } from 'lucide-react';
import { fetchTreesForUser, fetchSharedTrees, renameTree, deleteWholeTree, TreeSummary, SharedTreeSummary, fetchTree } from '../../services/supabaseTreeService';
import { useAppStore, loadFullState } from '../../store/useAppStore';
import { useTranslation } from '../../context/TranslationContext';
import { showError, showSuccess } from '../../utils/toast';
import { getShareSettings, inviteCollaborator, removeCollaborator, updateCollaboratorRole } from '../../services/shareService';
import { Collaborator } from '../../types';
import { activityService } from '../../services/activityService';

interface TreeManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    ownerId: string;
    userEmail: string;
    activeTreeId: string | null;
    onTreeSelected: (treeId: string) => void;
}

export const TreeManagerModal: React.FC<TreeManagerModalProps> = ({ isOpen, onClose, ownerId, userEmail, activeTreeId, onTreeSelected }) => {
    const { t } = useTranslation();
    const setCurrentUserRole = useAppStore((state) => state.setCurrentUserRole);
    const [trees, setTrees] = useState<TreeSummary[]>([]);
    const [sharedTrees, setSharedTrees] = useState<SharedTreeSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [isProcessing, setIsProcessing] = useState<string | null>(null); // treeId or 'general'
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [accessTreeId, setAccessTreeId] = useState<string | null>(null);
    const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
    const [loadingCollabs, setLoadingCollabs] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');

    const loadTrees = async () => {
        try {
            setLoading(true);
            const [owned, shared] = await Promise.all([
                fetchTreesForUser(ownerId, userEmail).catch(e => {
                    console.error('fetchTreesForUser failed', e);
                    showError(`Failed to load owned trees: ${e.message}`);
                    return [] as TreeSummary[];
                }),
                fetchSharedTrees(ownerId, userEmail).catch(e => {
                    console.error('fetchSharedTrees failed', e);
                    showError(`Failed to load shared trees: ${e.message}`);
                    return [] as SharedTreeSummary[];
                })
            ]);
            setTrees(owned);
            setSharedTrees(shared);
        } catch (e) {
            console.error('loadTrees: Unexpected error', e);
            showError('Failed to load trees');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && ownerId && userEmail) {
            loadTrees();
        }
    }, [isOpen, ownerId, userEmail]);

    const handleRename = async (treeId: string) => {
        if (!editName.trim()) return;
        try {
            setIsProcessing(treeId);
            await renameTree(treeId, ownerId, userEmail, editName.trim());
            void activityService.logAction(treeId, 'RENAME_TREE', { newName: editName.trim() });
            showSuccess(t.success || 'Name updated successfully');
            setEditingId(null);
            await loadTrees();
        } catch (e) {
            console.error('Rename failed', e);
            showError('Rename failed');
        } finally {
            setIsProcessing(null);
        }
    };

    const handleOpenTree = async (treeId: string, role: 'owner' | 'editor' | 'viewer' = 'owner') => {
        try {
            setIsProcessing(treeId);
            const full = await fetchTree(treeId, ownerId, userEmail);

            // Persist session
            localStorage.setItem('lastActiveTreeId', treeId);

            loadFullState({
                version: 1,
                people: full.people,
                settings: full.settings || {},
                focusId: full.focusId,
            });
            setCurrentUserRole(role);
            onTreeSelected(treeId);
            onClose();
            showSuccess(t.success || 'Tree loaded successfully');
        } catch (e) {
            console.error('Failed to open tree', e);
            showError('Failed to open tree');
        } finally {
            setIsProcessing(null);
        }
    };

    const handleDelete = async (treeId: string) => {
        try {
            setIsProcessing(treeId);
            await deleteWholeTree(treeId, ownerId, userEmail);
            void activityService.logAction(treeId, 'DELETE_PERSON', { note: 'Tree deleted' }); // Fallback or specific log
            showSuccess(t.success || 'Tree deleted successfully');
            setConfirmDelete(null);
            await loadTrees();
        } catch (e) {
            console.error('Delete failed', e);
            showError('Delete failed');
        } finally {
            setIsProcessing(null);
        }
    };

    const loadCollaborators = async (treeId: string) => {
        try {
            setLoadingCollabs(true);
            const remote = await getShareSettings({
                treeId,
                ownerUid: ownerId
            }, useAppStore.getState().user?.supabaseToken);
            setCollaborators(remote);
        } catch (e) {
            console.error('Failed to load collaborators', e);
            showError('Failed to load collaborators');
        } finally {
            setLoadingCollabs(false);
        }
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail.trim() || !accessTreeId) return;

        try {
            setIsProcessing('invite');
            const remote = await inviteCollaborator({
                treeId: accessTreeId,
                ownerUid: ownerId,
                email: inviteEmail,
                role: inviteRole
            }, useAppStore.getState().user?.supabaseToken);
            setCollaborators(remote);
            setInviteEmail('');
            showSuccess(`Invited ${inviteEmail}`);
        } catch (e: any) {
            showError(e.message || 'Failed to invite');
        } finally {
            setIsProcessing(null);
        }
    };

    const handleRoleChange = async (email: string, newRole: 'editor' | 'viewer') => {
        if (!accessTreeId) return;
        try {
            setIsProcessing(`role-${email}`);
            const remote = await updateCollaboratorRole({
                treeId: accessTreeId,
                ownerUid: ownerId,
                email,
                role: newRole
            }, useAppStore.getState().user?.supabaseToken);
            setCollaborators(remote);
            showSuccess('Role updated');
        } catch (e) {
            showError('Failed to update role');
        } finally {
            setIsProcessing(null);
        }
    };

    const handleRevoke = async (email: string) => {
        if (!accessTreeId) return;
        try {
            setIsProcessing(`revoke-${email}`);
            const remote = await removeCollaborator({
                treeId: accessTreeId,
                ownerUid: ownerId,
                email
            }, useAppStore.getState().user?.supabaseToken);
            setCollaborators(remote);
            showSuccess('Access revoked');
        } catch (e) {
            showError('Failed to revoke access');
        } finally {
            setIsProcessing(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className='fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all animate-in fade-in duration-300'>
            <div
                className='relative w-full max-w-2xl bg-white dark:bg-stone-900 rounded-3xl shadow-2xl overflow-hidden border border-stone-200 dark:border-stone-800 animate-in zoom-in-95 duration-300'
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className='relative px-8 py-6 border-b border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/30'>
                    <div className='flex items-center justify-between gap-4'>
                        <div className='flex items-center gap-4'>
                            <div className='relative'>
                                <div className='w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-inner'>
                                    <FolderTree className='w-6 h-6' />
                                </div>
                                {accessTreeId && (
                                    <div className='absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-blue-500 text-white flex items-center justify-center shadow-lg border-2 border-white dark:border-stone-900 animate-in zoom-in-50'>
                                        <Users className='w-3 h-3' />
                                    </div>
                                )}
                            </div>
                            <div>
                                <h3 className='text-xl font-black text-stone-900 dark:text-white tracking-tight'>
                                    {accessTreeId ? 'Manage Access' : (t.manageTrees || 'Manage Family Trees')}
                                </h3>
                                <p className='text-xs text-stone-500 dark:text-stone-400 font-medium'>
                                    {accessTreeId ? 'Control permissions for this tree' : (t.manageTreesDesc || 'Rename or delete your database trees')}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => accessTreeId ? setAccessTreeId(null) : onClose()}
                            className='p-2.5 rounded-xl hover:bg-stone-200/50 dark:hover:bg-stone-700/50 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-all active:scale-90'
                        >
                            {accessTreeId ? <Play className='w-5 h-5 rotate-180' /> : <X className='w-5 h-5' />}
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className='p-8 max-h-[70vh] overflow-y-auto custom-scrollbar bg-white dark:bg-stone-900'>
                    {accessTreeId ? (
                        <div className='space-y-8 animate-in slide-in-from-right-4 duration-300'>
                            {/* Invite Form */}
                            <form onSubmit={handleInvite} className='flex flex-col sm:flex-row gap-3'>
                                <div className='flex-1 relative'>
                                    <Mail className='absolute start-3 top-3 w-4 h-4 text-stone-400' />
                                    <input
                                        required
                                        type='email'
                                        placeholder='Enter collaborator email...'
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        className='w-full ps-10 pe-4 py-3 bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 rounded-2xl text-sm font-bold text-stone-900 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all'
                                    />
                                </div>
                                <div className='flex gap-2'>
                                    <select
                                        value={inviteRole}
                                        onChange={(e) => setInviteRole(e.target.value as any)}
                                        className='flex-1 sm:flex-none bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 rounded-2xl px-4 text-sm font-bold text-stone-700 dark:text-stone-200 outline-none'
                                    >
                                        <option value='editor'>Editor</option>
                                        <option value='viewer'>Viewer</option>
                                    </select>
                                    <button
                                        type='submit'
                                        disabled={isProcessing === 'invite'}
                                        className='px-6 py-3 bg-stone-900 dark:bg-blue-600 text-white rounded-2xl font-black text-sm hover:shadow-xl transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2'
                                    >
                                        {isProcessing === 'invite' ? <Loader2 className='w-4 h-4 animate-spin' /> : <UserPlus className='w-4 h-4' />}
                                        Invite
                                    </button>
                                </div>
                            </form>

                            {/* Collaborators List */}
                            <div className='space-y-3'>
                                <h5 className='text-[10px] font-black uppercase tracking-widest text-stone-400 px-1'>Active Collaborators</h5>
                                {loadingCollabs ? (
                                    <div className='flex justify-center py-12'><Loader2 className='w-8 h-8 animate-spin text-stone-300' /></div>
                                ) : collaborators.length === 0 ? (
                                    <div className='p-8 text-center text-stone-400 bg-stone-50/50 dark:bg-stone-800/20 rounded-2xl border border-dashed border-stone-200 dark:border-stone-800'>
                                        No collaborators yet.
                                    </div>
                                ) : (
                                    <div className='grid gap-3'>
                                        {collaborators.map(c => (
                                            <div key={c.email} className='flex items-center justify-between p-4 bg-stone-50/50 dark:bg-stone-800/20 border border-stone-100 dark:border-stone-800 rounded-2xl hover:border-blue-300/30 transition-all'>
                                                <div className='flex items-center gap-3'>
                                                    <div className='w-10 h-10 rounded-xl bg-gradient-to-br from-stone-100 to-stone-200 dark:from-stone-700 dark:to-stone-800 flex items-center justify-center text-sm font-black text-stone-500'>
                                                        {c.email[0].toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className='text-sm font-black text-stone-900 dark:text-white truncate max-w-[150px] sm:max-w-xs'>{c.email}</p>
                                                        <p className='text-[10px] font-bold text-stone-400 uppercase tracking-widest'>{c.role}</p>
                                                    </div>
                                                </div>
                                                <div className='flex items-center gap-2'>
                                                    {isProcessing === `role-${c.email}` ? (
                                                        <Loader2 className='w-4 h-4 animate-spin text-blue-500' />
                                                    ) : (
                                                        <select
                                                            value={c.role}
                                                            onChange={(e) => handleRoleChange(c.email, e.target.value as any)}
                                                            className='bg-transparent text-xs font-black text-blue-500 hover:text-blue-600 outline-none cursor-pointer p-1'
                                                        >
                                                            <option value='editor'>Editor</option>
                                                            <option value='viewer'>Viewer</option>
                                                        </select>
                                                    )}
                                                    <button
                                                        onClick={() => handleRevoke(c.email)}
                                                        disabled={isProcessing === `revoke-${c.email}`}
                                                        className='p-2 text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all'
                                                    >
                                                        {isProcessing === `revoke-${c.email}` ? <Loader2 className='w-4 h-4 animate-spin' /> : <Trash2 className='w-4 h-4' />}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className='space-y-8'>
                            {loading ? (
                                <div className='flex flex-col items-center justify-center py-16 text-stone-400'>
                                    <Loader2 className='w-10 h-10 animate-spin mb-4 text-emerald-500' />
                                    <p className='text-sm font-medium'>{t.loadingFiles}</p>
                                </div>
                            ) : trees.length === 0 && sharedTrees.length === 0 ? (
                                <div className='text-center py-16 text-stone-400 bg-stone-50/50 dark:bg-stone-800/20 rounded-2xl border border-dashed border-stone-200 dark:border-stone-700'>
                                    <TreePine className='w-12 h-12 mx-auto mb-4 opacity-20' />
                                    <p className='text-sm'>{t.noTreesFound || 'No trees found in database'}</p>
                                </div>
                            ) : (
                                <>
                                    {/* My Trees */}
                                    {trees.length > 0 && (
                                        <div className='space-y-4'>
                                            <h4 className='text-xs font-black text-stone-400 dark:text-stone-500 uppercase tracking-widest px-1 flex items-center gap-2'>
                                                <div className='w-1 h-3 bg-emerald-500 rounded-full'></div>
                                                {t.myTrees || 'My Trees'}
                                            </h4>
                                            <div className='grid grid-cols-1 gap-4'>
                                                {trees.map(tree => (
                                                    <TreeItem
                                                        key={tree.id}
                                                        tree={tree}
                                                        activeTreeId={activeTreeId}
                                                        isProcessing={isProcessing}
                                                        editingId={editingId}
                                                        editName={editName}
                                                        setEditingId={setEditingId}
                                                        setEditName={setEditName}
                                                        handleRename={handleRename}
                                                        handleOpenTree={handleOpenTree}
                                                        confirmDelete={confirmDelete}
                                                        setConfirmDelete={setConfirmDelete}
                                                        handleDelete={handleDelete}
                                                        onManageAccess={(treeId) => {
                                                            setAccessTreeId(treeId);
                                                            loadCollaborators(treeId);
                                                        }}
                                                        t={t}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Shared Trees */}
                                    {sharedTrees.length > 0 && (
                                        <div className='space-y-4'>
                                            <h4 className='text-xs font-black text-stone-400 dark:text-stone-500 uppercase tracking-widest px-1 flex items-center gap-2'>
                                                <div className='w-1 h-3 bg-blue-500 rounded-full'></div>
                                                {t.sharedWithMe || 'Shared With Me'}
                                            </h4>
                                            <div className='grid grid-cols-1 gap-4'>
                                                {sharedTrees.map(tree => (
                                                    <TreeItem
                                                        key={tree.id}
                                                        tree={tree}
                                                        activeTreeId={activeTreeId}
                                                        isProcessing={isProcessing}
                                                        role={tree.role}
                                                        isShared={true}
                                                        handleOpenTree={(id) => handleOpenTree(id, tree.role)}
                                                        t={t}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className='px-8 py-5 border-t border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/30 flex justify-end'>
                    <button
                        onClick={onClose}
                        className='px-6 py-2.5 bg-stone-900 dark:bg-stone-700 text-white rounded-2xl text-sm font-bold hover:shadow-xl hover:shadow-stone-900/20 dark:hover:shadow-none transition-all active:scale-95'
                    >
                        {t.close || 'Close'}
                    </button>
                </div>
            </div>
        </div>
    );
};

interface TreeItemProps {
    tree: TreeSummary | SharedTreeSummary;
    activeTreeId: string | null;
    isProcessing: string | null;
    isShared?: boolean;
    role?: 'editor' | 'viewer';
    editingId?: string | null;
    editName?: string;
    setEditingId?: (id: string | null) => void;
    setEditName?: (name: string) => void;
    handleRename?: (id: string) => void;
    handleOpenTree: (id: string) => void;
    confirmDelete?: string | null;
    setConfirmDelete?: (id: string | null) => void;
    handleDelete?: (id: string) => void;
    onManageAccess?: (id: string) => void;
    t: any;
}

const TreeItem: React.FC<TreeItemProps> = ({
    tree, activeTreeId, isProcessing, isShared, role,
    editingId, editName, setEditingId, setEditName,
    handleRename, handleOpenTree, confirmDelete,
    setConfirmDelete, handleDelete, onManageAccess, t
}) => {
    return (
        <div className='group relative bg-white dark:bg-stone-800 p-5 rounded-2xl border border-stone-200 dark:border-stone-700 hover:border-emerald-300 dark:hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300'>
            <div className='flex items-start justify-between gap-4'>
                <div className='flex-1 min-w-0'>
                    {editingId === tree.id ? (
                        <div className='flex items-center gap-2 animate-in slide-in-from-left-2 duration-200'>
                            <input
                                autoFocus
                                type='text'
                                value={editName}
                                onChange={(e) => setEditName?.(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleRename?.(tree.id)}
                                className='flex-1 bg-stone-50 dark:bg-stone-900 border border-emerald-500 rounded-xl px-3 py-2 text-sm font-bold text-stone-900 dark:text-white focus:outline-none ring-4 ring-emerald-500/10'
                            />
                            <button
                                onClick={() => handleRename?.(tree.id)}
                                disabled={isProcessing === tree.id}
                                className='p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-90 disabled:opacity-50'
                            >
                                {isProcessing === tree.id ? <Loader2 className='w-4 h-4 animate-spin' /> : <Check className='w-4 h-4' />}
                            </button>
                            <button
                                onClick={() => setEditingId?.(null)}
                                className='p-2 bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 text-stone-500 dark:text-stone-300 rounded-xl transition-all'
                            >
                                <X className='w-4 h-4' />
                            </button>
                        </div>
                    ) : (
                        <div>
                            <div className='flex items-center gap-2'>
                                <h4 className='font-bold text-stone-800 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors'>
                                    {tree.name}
                                </h4>
                                {isShared && (
                                    <div className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-tight flex items-center gap-1 ${role === 'editor' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400'}`}>
                                        {role === 'editor' ? <Shield className='w-2.5 h-2.5' /> : <Eye className='w-2.5 h-2.5' />}
                                        {role === 'editor' ? t.editor || 'Editor' : t.viewer || 'Viewer'}
                                    </div>
                                )}
                            </div>
                            <p className='text-[10px] text-stone-500 dark:text-stone-400 mt-1 flex items-center gap-1.5'>
                                <span className='w-1.5 h-1.5 rounded-full bg-stone-300 dark:bg-stone-600'></span>
                                {new Date(tree.createdAt).toLocaleDateString()}
                            </p>
                            {activeTreeId === tree.id && (
                                <div className='mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-[10px] font-black text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 animate-pulse'>
                                    <div className='w-1 h-1 rounded-full bg-emerald-500'></div>
                                    {t.active || 'Active'}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className='flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
                    <button
                        onClick={() => handleOpenTree(tree.id)}
                        disabled={isProcessing === tree.id || activeTreeId === tree.id}
                        className='p-2 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed'
                        title={activeTreeId === tree.id ? t.active : (t.setActive || 'Set Active')}
                    >
                        {isProcessing === tree.id ? <Loader2 className='w-4 h-4 animate-spin' /> : <Play className='w-4 h-4 fill-current' />}
                    </button>
                    {!isShared && (
                        <>
                            <button
                                onClick={() => onManageAccess?.(tree.id)}
                                className='p-2 text-stone-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all'
                                title='Manage Access'
                            >
                                <Users className='w-4 h-4' />
                            </button>
                            <button
                                onClick={() => {
                                    setEditingId?.(tree.id);
                                    setEditName?.(tree.name);
                                }}
                                className='p-2 text-stone-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all'
                                title={t.rename || 'Rename'}
                            >
                                <Edit2 className='w-4 h-4' />
                            </button>
                            <button
                                onClick={() => setConfirmDelete?.(tree.id)}
                                className='p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all'
                                title={t.delete || 'Delete'}
                            >
                                <Trash2 className='w-4 h-4' />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Delete Confirmation */}
            {confirmDelete === tree.id && (
                <div className='absolute inset-0 bg-red-500/95 dark:bg-red-900/95 backdrop-blur-sm rounded-2xl flex items-center justify-between px-6 z-10 animate-in zoom-in-95 duration-200 shadow-xl'>
                    <div className='flex items-center gap-3 text-white'>
                        <div className='w-10 h-10 rounded-full bg-white/20 flex items-center justify-center'>
                            <AlertCircle className='w-6 h-6' />
                        </div>
                        <div>
                            <p className='text-xs font-black uppercase tracking-wider mb-0.5 opacity-80'>{t.confirmDelete || 'Confirm Delete'}</p>
                            <p className='text-sm font-bold'>{t.areYouSure || 'Are you absolutely sure?'}</p>
                        </div>
                    </div>
                    <div className='flex items-center gap-2'>
                        <button
                            onClick={() => setConfirmDelete?.(null)}
                            className='px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all border border-white/20'
                        >
                            {t.cancel || 'Cancel'}
                        </button>
                        <button
                            onClick={() => handleDelete?.(tree.id)}
                            disabled={isProcessing === tree.id}
                            className='px-4 py-2 bg-white text-red-600 hover:bg-red-50 rounded-xl text-xs font-black transition-all shadow-lg active:scale-95 disabled:opacity-50'
                        >
                            {isProcessing === tree.id ? <Loader2 className='w-3 h-3 animate-spin mx-2' /> : (t.delete || 'Delete')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
