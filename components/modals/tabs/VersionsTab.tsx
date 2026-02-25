import React, { useState, useEffect } from 'react';
import { Clock, Plus, Loader2, FileJson, RotateCcw, Pin, PinOff, Trash2 } from 'lucide-react';
import { googleDriveService } from '../../../services/googleService';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale/ar';
import { enUS } from 'date-fns/locale/en-US';
import type { DriveFile } from '../../../types';
import { showSuccess, showError } from '../../../utils/toast';

interface VersionsTabProps {
    treeId: string;
    language: 'ar' | 'en';
    googleSync: {
        handleCreateSnapshot: (label: string) => Promise<void>;
        handleRestoreSnapshot: (snapshot: DriveFile) => Promise<void>;
    };
}

export const VersionsTab: React.FC<VersionsTabProps> = ({ treeId, language, googleSync }) => {
    const [snapshots, setSnapshots] = useState<DriveFile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newLabel, setNewLabel] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const fetchSnapshots = async () => {
        try {
            setIsLoading(true);
            const files = await googleDriveService.listSnapshots(treeId);
            setSnapshots(files);
        } catch (err) {
            console.error('Failed to load snapshots:', err);
            showError('Failed to load snapshots');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSnapshots();
    }, [treeId]);

    const handleCreate = async () => {
        if (!newLabel.trim()) return;
        try {
            setIsCreating(true);
            await googleSync.handleCreateSnapshot(newLabel);
            setNewLabel('');
            showSuccess('Snapshot created successfully');
            fetchSnapshots();
        } catch (err) {
            showError('Failed to create snapshot');
        } finally {
            setIsCreating(false);
        }
    };

    const handleRestore = async (file: DriveFile) => {
        if (window.confirm(language === 'ar' ? 'هل أنت متأكد؟ سيتم استعادة هذه النسخة.' : 'Are you sure? Current state will be replaced by this version.')) {
            try {
                await googleSync.handleRestoreSnapshot(file);
                showSuccess('Restored successfully');
            } catch (err) {
                showError('Failed to restore');
            }
        }
    };

    const handleTogglePin = async (file: DriveFile) => {
        const isPinned = file.name.startsWith('pinned_');
        let newName = file.name;
        
        if (isPinned) {
            newName = file.name.replace('pinned_', '');
        } else {
            newName = `pinned_${file.name}`;
        }

        try {
            // Renaming via Google Drive API
            await (gapi.client.drive.files.update({
                fileId: file.id,
                resource: { name: newName }
            } as any));
            
            showSuccess(isPinned ? 'Unpinned' : 'Pinned');
            fetchSnapshots();
        } catch (err) {
            console.error('Failed to toggle pin:', err);
            showError('Failed to update pin status');
        }
    };

    const handleDelete = async (fileId: string) => {
        if (!window.confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذه النسخة؟' : 'Are you sure you want to delete this version?')) return;
        
        try {
            await googleDriveService.deleteFile(fileId);
            showSuccess('Deleted successfully');
            fetchSnapshots();
        } catch (err) {
            showError('Failed to delete');
        }
    };

    return (
        <div className="space-y-6">
            {/* Create Snapshot */}
            <div className="bg-[var(--theme-surface)] rounded-xl p-4 border border-[var(--border-main)]">
                <h4 className="text-sm font-semibold text-[var(--text-main)] mb-3 flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    {language === 'ar' ? 'إنشاء نسخة احتياطية يدوية' : 'Create Manual Snapshot'}
                </h4>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                        placeholder={language === 'ar' ? 'مثال: قبل التغييرات الكبيرة...' : 'e.g., Before massive changes...'}
                        className="flex-1 px-3 py-2 rounded-lg border border-[var(--border-main)] bg-[var(--theme-bg)] text-[var(--text-main)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)]"
                    />
                    <button
                        onClick={handleCreate}
                        disabled={isCreating || !newLabel.trim()}
                        className="px-4 py-2 bg-[var(--primary-600)] text-white rounded-lg text-sm font-medium hover:bg-[var(--primary-500)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        {language === 'ar' ? 'حفظ' : 'Create'}
                    </button>
                </div>
            </div>

            {/* Versions List */}
            <div>
                <h4 className="text-sm font-semibold text-[var(--text-main)] mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {language === 'ar' ? 'النسخ السابقة' : 'Previous Versions'}
                </h4>

                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-[var(--text-dim)]" />
                    </div>
                ) : snapshots.length === 0 ? (
                    <div className="text-center py-8 text-[var(--text-dim)] text-sm">
                        {language === 'ar' ? 'لا توجد نسخ محفوظة بعد.' : 'No snapshots found yet.'}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {snapshots.map((snap) => {
                            const isPinned = snap.name.startsWith('pinned_');
                            const cleanName = snap.name.replace('pinned_', '').replace('.json', '');
                            const parts = cleanName.split('_');
                            const label = parts.slice(3).join(' ') || 'Untitled';
                            const date = new Date(snap.modifiedTime);

                            return (
                                <div
                                    key={snap.id}
                                    className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                                        isPinned 
                                        ? 'bg-amber-50/30 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800' 
                                        : 'bg-[var(--theme-surface)] border-[var(--border-main)] hover:border-[var(--primary-600)]'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isPinned ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' : 'bg-[var(--primary-600)]/10 text-[var(--primary-600)]'}`}>
                                            <FileJson className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-medium text-[var(--text-main)]">{label}</p>
                                                {isPinned && <Pin className="w-3 h-3 text-amber-500 fill-amber-500" />}
                                            </div>
                                            <p className="text-xs text-[var(--text-dim)]">
                                                {formatDistanceToNow(date, { addSuffix: true, locale: language === 'ar' ? ar : enUS })}
                                                {' • '}
                                                {date.toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => handleTogglePin(snap)}
                                            className={`p-2 rounded-lg transition-colors ${
                                                isPinned 
                                                ? 'text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/30' 
                                                : 'text-[var(--text-dim)] hover:bg-[var(--theme-hover)]'
                                            }`}
                                            title={isPinned ? 'Unpin Version' : 'Pin Version'}
                                        >
                                            {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                                        </button>
                                        <button
                                            onClick={() => handleRestore(snap)}
                                            className="px-3 py-1.5 bg-[var(--primary-600)]/10 text-[var(--primary-600)] hover:bg-[var(--primary-600)] hover:text-white rounded-lg text-xs font-medium transition-all flex items-center gap-1"
                                        >
                                            <RotateCcw className="w-3 h-3" />
                                            {language === 'ar' ? 'استعادة' : 'Restore'}
                                        </button>
                                        {!isPinned && (
                                            <button
                                                onClick={() => handleDelete(snap.id)}
                                                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
                    💡 <strong>{language === 'ar' ? 'حول النسخ الاحتياطية:' : 'About Snapshots:'}</strong><br />
                    {language === 'ar' 
                        ? 'يتم حفظ النسخ في مجلد تطبيق مخفي على Google Drive. النسخ المثبتة (Pinned) لا يتم حذفها تلقائياً عند تنظيف السجل.' 
                        : 'Snapshots are saved in a hidden app folder on Google Drive. Pinned versions are protected from auto-deletion during history cleanup.'}
                </p>
            </div>
        </div>
    );
};
