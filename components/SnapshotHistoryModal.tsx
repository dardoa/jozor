import React, { useEffect, useState } from 'react';
import { X, RotateCcw, Plus, Clock, FileJson, Trash2 } from 'lucide-react';
import { GoogleSyncStateAndActions, DriveFile, ThemeLanguageProps } from '../types';
import { googleDriveService } from '../services/googleService';
import { useAppStore } from '../store/useAppStore';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale/ar';
import { enUS } from 'date-fns/locale/en-US';

interface SnapshotHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    googleSync: GoogleSyncStateAndActions;
    themeLanguage: ThemeLanguageProps;
}

export const SnapshotHistoryModal: React.FC<SnapshotHistoryModalProps> = ({
    isOpen,
    onClose,
    googleSync,
    themeLanguage,
}) => {
    const [snapshots, setSnapshots] = useState<DriveFile[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [newLabel, setNewLabel] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    // Get currentTreeId from Zustand store
    const currentTreeId = useAppStore((state) => state.currentTreeId);

    const fetchSnapshots = async () => {
        if (!currentTreeId) {
            console.warn('No currentTreeId available for listing snapshots');
            return;
        }
        setIsLoading(true);
        try {
            const files = await googleDriveService.listSnapshots(currentTreeId);
            setSnapshots(files);
        } catch (e) {
            console.error('Failed to list snapshots', e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchSnapshots();
        }
    }, [isOpen, currentTreeId]);

    const handleCreate = async () => {
        if (!newLabel.trim()) return;
        setIsCreating(true);
        await googleSync.handleCreateSnapshot(newLabel);
        setNewLabel('');
        setIsCreating(false);
        fetchSnapshots();
    };

    const handleRestore = async (file: DriveFile) => {
        if (window.confirm('Are you sure? Current state will be backed up as "Safety_Before_Restore" first.')) {
            await googleSync.handleRestoreSnapshot(file);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-[var(--theme-bg)] rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-[var(--border-main)] animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-[var(--border-main)]">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Clock className="w-5 h-5 text-[var(--primary-600)]" />
                        {themeLanguage.language === 'ar' ? 'سجل النسخ الاحتياطية' : 'Version History'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-[var(--theme-hover)] rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Create New Section */}
                <div className="p-4 bg-[var(--theme-surface)] border-b border-[var(--border-main)]">
                    <label className="text-sm font-medium mb-1 block">
                        {themeLanguage.language === 'ar' ? 'إنشاء نسخة يدوية' : 'Create Manual Snapshot'}
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newLabel}
                            onChange={(e) => setNewLabel(e.target.value)}
                            placeholder={themeLanguage.language === 'ar' ? 'مثال: قبل دمج الفروع...' : 'e.g., Before massive merge...'}
                            className="flex-1 px-3 py-2 rounded-lg border border-[var(--border-strong)] bg-[var(--theme-bg)] focus:ring-2 focus:ring-[var(--primary-500)] outline-none"
                        />
                        <button
                            onClick={handleCreate}
                            disabled={isCreating || !newLabel.trim()}
                            className="bg-[var(--primary-600)] text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium hover:bg-[var(--primary-700)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isCreating ? 'Saving...' : <><Plus className="w-4 h-4" /> {themeLanguage.language === 'ar' ? 'حفظ' : 'Create'}</>}
                        </button>
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {isLoading && (
                        <div className="text-center py-8 text-[var(--text-dim)]">Loading history...</div>
                    )}

                    {!isLoading && snapshots.length === 0 && (
                        <div className="text-center py-8 text-[var(--text-dim)]">
                            {themeLanguage.language === 'ar' ? 'لا توجد نسخ محفوظة.' : 'No snapshots found.'}
                        </div>
                    )}

                    {snapshots.map((snap) => {
                        // Parse label from filename: snapshot_[treeId]_[timestamp]_[label].json
                        const parts = snap.name.replace('.json', '').split('_');
                        // Index 0=snapshot, 1=treeId, 2=timestamp, 3...=label
                        // Reconstruct label if it contains underscores
                        const label = parts.slice(3).join(' ') || 'Untitled';
                        const date = new Date(snap.modifiedTime);

                        return (
                            <div key={snap.id} className="group flex items-center justify-between p-3 rounded-lg border border-[var(--border-main)] hover:border-[var(--primary-500)] hover:bg-[var(--theme-hover)] transition-all">
                                <div className="flex flex-col">
                                    <span className="font-semibold text-sm flex items-center gap-2">
                                        <FileJson className="w-4 h-4 text-[var(--text-dim)]" />
                                        {label}
                                    </span>
                                    <span className="text-xs text-[var(--text-dim)] mt-1">
                                        {formatDistanceToNow(date, { addSuffix: true, locale: themeLanguage.language === 'ar' ? ar : enUS })}
                                        {' • '}
                                        {date.toLocaleDateString()} {date.toLocaleTimeString()}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleRestore(snap)}
                                        className="px-3 py-1.5 text-xs font-medium bg-[var(--primary-100)] text-[var(--primary-700)] rounded hover:bg-[var(--primary-200)] flex items-center gap-1"
                                        title="Restore this version"
                                    >
                                        <RotateCcw className="w-3 h-3" />
                                        {themeLanguage.language === 'ar' ? 'استعادة' : 'Restore'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

            </div>
        </div>
    );
};
