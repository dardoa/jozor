import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../../context/TranslationContext';
import { Mail, UserPlus, Shield, Trash2, Loader2, Link2, Globe, Copy, Check } from 'lucide-react';
import {
    getTreeCollaborators,
    inviteCollaborator,
    updateCollaboratorRole,
    revokeCollaboratorAccess,
    type Collaborator
} from '../../../services/supabaseTreeService';
import { getSupabaseWithAuth } from '../../../services/supabaseClient';
import { useAppStore } from '../../../store/useAppStore';
import { showSuccess, showError } from '../../../utils/toast';
import { activityService } from '../../../services/activityService';

interface AccessControlTabProps {
    treeId: string;
    ownerId: string;
    ownerEmail: string;
    language: 'ar' | 'en';
}

export const AccessControlTab: React.FC<AccessControlTabProps> = ({ treeId, ownerId, ownerEmail, language }) => {
    const { t } = useTranslation();
    const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('viewer');
    const [isInviting, setIsInviting] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    // Share link logic from ShareModal
    const shareLink = `${window.location.origin}/tree/db/${ownerId}/${treeId}`;

    const supabaseToken = useAppStore((state) => state.user?.supabaseToken);

    useEffect(() => {
        loadCollaborators();

        const client = getSupabaseWithAuth(ownerId, ownerEmail, supabaseToken);
        const channel = client
            .channel(`collaborators:${treeId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'tree_collaborators',
                    filter: `tree_id=eq.${treeId}`
                },
                () => {
                    loadCollaborators();
                }
            )
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    }, [treeId]);

    const loadCollaborators = async () => {
        try {
            setIsLoading(true);
            const collabs = await getTreeCollaborators(treeId, ownerId, ownerEmail, supabaseToken);
            setCollaborators(collabs);
        } catch (err) {
            console.error('Failed to load collaborators:', err);
            showError(t.modals.messages.error.collaborators);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInvite = async () => {
        if (!inviteEmail.trim()) return;

        try {
            setIsInviting(true);
            await inviteCollaborator(treeId, inviteEmail.trim(), inviteRole, ownerId, ownerEmail, supabaseToken);
            setInviteEmail('');
            showSuccess(t.modals.messages.success.invite.replace('{email}', inviteEmail));
            await activityService.logAction(treeId, 'SHARE_INVITE', {
                email: inviteEmail.trim(),
                role: inviteRole,
            });
        } catch (err: any) {
            console.error('Failed to invite collaborator:', err);
            showError(t.modals.messages.error.invite);
        } finally {
            setIsInviting(false);
        }
    };

    const handleChangeRole = async (email: string, newRole: 'editor' | 'viewer') => {
        try {
            await updateCollaboratorRole(treeId, email, newRole, ownerId, ownerEmail, supabaseToken);
            showSuccess(t.modals.messages.success.role);
            await activityService.logAction(treeId, 'SHARE_ROLE_CHANGE', {
                email,
                newRole,
            });
        } catch (err) {
            console.error('Failed to update role:', err);
            showError(t.modals.messages.error.role);
        }
    };

    const handleRevoke = async (email: string) => {
        if (!confirm(t.modals.treeManager.confirmRevoke.replace('{email}', email))) return;

        try {
            await revokeCollaboratorAccess(treeId, email, ownerId, ownerEmail, supabaseToken);
            showSuccess(t.modals.messages.success.revoke);
            await activityService.logAction(treeId, 'SHARE_REVOKE', {
                email,
            });
        } catch (err) {
            console.error('Failed to revoke access:', err);
            showError(t.modals.messages.error.revoke);
        }
    };

    const copyLink = () => {
        navigator.clipboard.writeText(shareLink);
        setIsCopied(true);
        showSuccess(t.modals.messages.success.copy);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <div className="space-y-6">
            {/* Link Sharing Section */}
            <div className="bg-[var(--theme-surface)] rounded-xl p-4 border border-[var(--border-main)]">
                <h4 className="text-sm font-semibold text-[var(--text-main)] mb-3 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-500" />
                    {t.modals.treeManager.shareViaLink}
                </h4>
                <div className="flex items-center gap-2 p-3 bg-[var(--theme-bg)] rounded-lg border border-dashed border-[var(--border-main)]">
                    <div className="flex-1 overflow-hidden">
                        <p className="text-xs text-[var(--text-dim)] truncate font-mono">{shareLink}</p>
                    </div>
                    <button
                        onClick={copyLink}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--primary-600)]/10 text-[var(--primary-600)] hover:bg-[var(--primary-600)] hover:text-white rounded-lg text-xs font-bold transition-all"
                    >
                        {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {isCopied ? t.modals.copied : t.modals.copyLink}
                    </button>
                </div>
                <p className="mt-2 text-[10px] text-[var(--text-dim)] px-1">
                    {t.modals.treeManager.linkNote}
                </p>
            </div>

            {/* Invite Section */}
            <div className="bg-[var(--theme-surface)] rounded-xl p-4 border border-[var(--border-main)]">
                <h4 className="text-sm font-semibold text-[var(--text-main)] mb-3 flex items-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    {t.modals.treeManager.inviteNewCollaborator}
                </h4>
                <div className="flex gap-2">
                    <div className="flex-1 relative">
                        <Mail className="absolute start-3 top-2.5 w-4 h-4 text-[var(--text-dim)]" />
                        <input
                            type="email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                            placeholder={t.modals.treeManager.emailLabel}
                            className="w-full ps-10 pe-3 py-2 rounded-lg border border-[var(--border-main)] bg-[var(--theme-bg)] text-[var(--text-main)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)]"
                        />
                    </div>
                    <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value as 'editor' | 'viewer')}
                        className="px-3 py-2 rounded-lg border border-[var(--border-main)] bg-[var(--theme-bg)] text-[var(--text-main)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)]"
                    >
                        <option value="viewer">{t.modals.viewer}</option>
                        <option value="editor">{t.modals.editor}</option>
                    </select>
                    <button
                        onClick={handleInvite}
                        disabled={isInviting || !inviteEmail.trim()}
                        className="px-4 py-2 bg-[var(--primary-600)] text-white rounded-lg text-sm font-medium hover:bg-[var(--primary-500)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                    >
                        {isInviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                        {t.modals.treeManager.inviteButton}
                    </button>
                </div>
            </div>

            {/* Collaborators List */}
            <div>
                <h4 className="text-sm font-semibold text-[var(--text-main)] mb-3">
                    {t.modals.treeManager.collaboratorsCount.replace('{count}', collaborators.length.toString())}
                </h4>

                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-[var(--text-dim)]" />
                    </div>
                ) : collaborators.length === 0 ? (
                    <div className="text-center py-8 text-[var(--text-dim)] text-sm">
                        {t.modals.treeManager.noCollaboratorsYet}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {collaborators.map((collab) => (
                            <div
                                key={collab.id}
                                className="flex items-center justify-between p-3 bg-[var(--theme-surface)] rounded-lg border border-[var(--border-main)] hover:border-[var(--primary-600)] transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-[var(--primary-600)]/10 flex items-center justify-center border border-[var(--primary-600)]/20">
                                        <Mail className="w-5 h-5 text-[var(--primary-600)]" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-[var(--text-main)]">{collab.email}</p>
                                        <p className="text-[10px] text-[var(--text-dim)]">
                                            {t.modals.treeManager.invitedOn.replace('{date}', new Date(collab.invited_at).toLocaleDateString())}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <select
                                        value={collab.role}
                                        onChange={(e) => handleChangeRole(collab.email, e.target.value as 'editor' | 'viewer')}
                                        className="px-3 py-1.5 rounded-lg border border-[var(--border-main)] bg-[var(--theme-bg)] text-[var(--text-main)] text-xs focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)]"
                                    >
                                        <option value="viewer">👁️ {t.modals.viewer}</option>
                                        <option value="editor">✏️ {t.modals.editor}</option>
                                    </select>
                                    <button
                                        onClick={() => handleRevoke(collab.email)}
                                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        title={t.modals.delete}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Owner Info */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                    <Shield className="w-4 h-4" />
                    <p className="text-xs">
                        <strong>{t.modals.owner}:</strong> {ownerEmail}
                    </p>
                </div>
            </div>
        </div>
    );
};
