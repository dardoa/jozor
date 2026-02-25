import React, { useState } from 'react';
import { Trash2, AlertTriangle, Loader2, Edit3, User } from 'lucide-react';
import { renameTree, deleteWholeTree, updateTreeRoot } from '../../../services/supabaseTreeService';
import { useAppStore } from '../../../store/useAppStore';
import type { Person } from '../../../types';

interface TreeSettingsTabProps {
    treeId: string;
    treeName?: string;
    ownerId: string;
    ownerEmail: string;
    people?: Person[];
    currentRootId?: string;
    onTreeDeleted?: () => void;
    onTreeRenamed?: (newName: string) => void;
    onRootChanged?: (newRootId: string) => void;
}

export const TreeSettingsTab: React.FC<TreeSettingsTabProps> = ({
    treeId,
    treeName = 'My Family Tree',
    ownerId,
    ownerEmail,
    people = [],
    currentRootId,
    onTreeDeleted,
    onTreeRenamed,
    onRootChanged,
}) => {
    const token = useAppStore((state) => state.user?.supabaseToken);

    const [newTreeName, setNewTreeName] = useState(treeName);
    const [isRenaming, setIsRenaming] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleRename = async () => {
        if (!newTreeName.trim() || newTreeName === treeName) return;

        try {
            setIsRenaming(true);
            setError(null);

            const token = useAppStore.getState().user?.supabaseToken;
            await renameTree(treeId, ownerId, ownerEmail, newTreeName.trim(), token);

            onTreeRenamed?.(newTreeName.trim());
            setSuccess(`✓ Tree renamed to "${newTreeName.trim()}"`);
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            console.error('Failed to rename tree:', err);
            setError('Failed to rename tree. Please try again.');
        } finally {
            setIsRenaming(false);
        }
    };

    const handleChangeRoot = async (newRootId: string) => {
        if (newRootId === currentRootId) return;

        if (!confirm('Changing the root person will re-layout the entire tree. Continue?')) return;

        try {
            setIsRenaming(true); // Re-using renaming state for loader if needed, or just let it be sync
            setError(null);

            const token = useAppStore.getState().user?.supabaseToken;
            await updateTreeRoot(treeId, newRootId, ownerId, ownerEmail, token);

            onRootChanged?.(newRootId);
            setSuccess('✓ Root person changed! Tree will re-layout.');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            console.error('Failed to change root:', err);
            setError('Failed to change root person. Please try again.');
        }
    };

    const handleDelete = async () => {
        if (deleteConfirmText !== 'DELETE') return;

        try {
            setIsDeleting(true);
            setError(null);

            const token = useAppStore.getState().user?.supabaseToken;
            await deleteWholeTree(treeId, ownerId, ownerEmail, token);

            setSuccess('✓ Tree deleted successfully.');
            setTimeout(() => {
                onTreeDeleted?.();
            }, 1000);
        } catch (err) {
            console.error('Failed to delete tree:', err);
            setError('Failed to delete tree. Please try again.');
            setIsDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Error/Success Messages */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                    <p className="text-sm text-red-800 dark:text-red-200">⚠️ {error}</p>
                </div>
            )}

            {success && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                    <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
                </div>
            )}

            {/* Rename Tree Section */}
            <div className="bg-[var(--theme-surface)] rounded-xl p-4 border border-[var(--border-main)]">
                <h4 className="text-sm font-semibold text-[var(--text-main)] mb-3 flex items-center gap-2">
                    <Edit3 className="w-4 h-4" />
                    Rename Tree
                </h4>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newTreeName}
                        onChange={(e) => setNewTreeName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                        placeholder="Enter new tree name"
                        className="flex-1 px-3 py-2 rounded-lg border border-[var(--border-main)] bg-[var(--theme-bg)] text-[var(--text-main)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)]"
                    />
                    <button
                        onClick={handleRename}
                        disabled={isRenaming || !newTreeName.trim() || newTreeName === treeName}
                        className="px-4 py-2 bg-[var(--primary-600)] text-white rounded-lg text-sm font-medium hover:bg-[var(--primary-500)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isRenaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit3 className="w-4 h-4" />}
                        Rename
                    </button>
                </div>
            </div>

            {/* Change Root Person Section */}
            {people.length > 0 && (
                <div className="bg-[var(--theme-surface)] rounded-xl p-4 border border-[var(--border-main)]">
                    <h4 className="text-sm font-semibold text-[var(--text-main)] mb-3 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Change Root Person
                    </h4>
                    <select
                        value={currentRootId || ''}
                        onChange={(e) => handleChangeRoot(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-[var(--border-main)] bg-[var(--theme-bg)] text-[var(--text-main)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)]"
                    >
                        {people.map((person) => (
                            <option key={person.id} value={person.id}>
                                {person.firstName} {person.lastName} {person.id === currentRootId && '(Current Root)'}
                            </option>
                        ))}
                    </select>
                    <p className="text-xs text-[var(--text-dim)] mt-2">
                        Changing the root person will re-layout the entire tree structure.
                    </p>
                </div>
            )}

            {/* Tree Info */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <div className="space-y-1">
                    <p className="text-xs text-blue-800 dark:text-blue-200">
                        <strong>Tree ID:</strong> {treeId}
                    </p>
                    <p className="text-xs text-blue-800 dark:text-blue-200">
                        <strong>People:</strong> {people.length}
                    </p>
                    <p className="text-xs text-blue-800 dark:text-blue-200">
                        <strong>Current Root:</strong> {(() => {
                            const p = people.find(p => p.id === currentRootId);
                            return p ? `${p.firstName} ${p.lastName}` : 'Not set';
                        })()}
                    </p>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <h4 className="text-sm font-bold text-red-600">Danger Zone</h4>
                </div>

                {!showDeleteConfirm ? (
                    <div>
                        <p className="text-xs text-red-800 dark:text-red-200 mb-3">
                            Deleting this tree is permanent and cannot be undone. All data, including {people.length} people, relationships, and photos, will be permanently deleted.
                        </p>
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors flex items-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete Tree
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <p className="text-xs text-red-800 dark:text-red-200 font-semibold">
                            ⚠️ Are you absolutely sure? This action cannot be undone.
                        </p>
                        <p className="text-xs text-red-800 dark:text-red-200">
                            Type <strong>DELETE</strong> to confirm:
                        </p>
                        <input
                            type="text"
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            placeholder="Type DELETE"
                            className="w-full px-3 py-2 rounded-lg border-2 border-red-300 dark:border-red-700 bg-white dark:bg-red-950 text-[var(--text-main)] text-sm focus:outline-none focus:ring-2 focus:ring-red-600"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting || deleteConfirmText !== 'DELETE'}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isDeleting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4" />
                                        Permanently Delete
                                    </>
                                )}
                            </button>
                            <button
                                onClick={() => {
                                    setShowDeleteConfirm(false);
                                    setDeleteConfirmText('');
                                }}
                                disabled={isDeleting}
                                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
