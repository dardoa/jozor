import React, { useEffect, useState } from 'react';
import { X, RotateCcw, Plus, Clock, FileJson } from 'lucide-react';
import { GoogleSyncStateAndActions, DriveFile, ThemeLanguageProps } from '../types';
import { googleDriveService } from '../services/googleService';
import { useAppStore } from '../store/useAppStore';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale/ar';
import { enUS } from 'date-fns/locale/en-US';
import { OverlayPrimitive } from '../context/OverlayContext';
import { useTranslation } from '../context/TranslationContext';
import { showError, showSuccess } from '../utils/toast';
import { ConfirmationModal } from './ConfirmationModal';

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
    const { t, dateLocale } = useTranslation();
    const [snapshots, setSnapshots] = useState<DriveFile[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [newLabel, setNewLabel] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [isRestoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
    const [pendingRestoreFile, setPendingRestoreFile] = useState<DriveFile | null>(null);

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
            showError(t.messages.error.load);
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
        try {
            await googleSync.handleCreateSnapshot(newLabel);
            setNewLabel('');
            showSuccess(t.messages.success.load);
            await fetchSnapshots();
        } catch (e) {
            console.error('Create snapshot failed:', e);
            showError(t.messages.error.snapshot);
        } finally {
            setIsCreating(false);
        }
    };

    const handleRestore = (file: DriveFile) => {
        setPendingRestoreFile(file);
        setRestoreConfirmOpen(true);
    };

    const confirmRestore = async () => {
        if (!pendingRestoreFile) return;
        try {
            await googleSync.handleRestoreSnapshot(pendingRestoreFile);
            onClose();
        } catch (e) {
            console.error('Restore failed:', e);
            showError(t.messages.error.load);
        } finally {
            setRestoreConfirmOpen(false);
            setPendingRestoreFile(null);
        }
    };

    return (
        <OverlayPrimitive
            isOpen={isOpen}
            onClose={onClose}
            id='snapshot-history-modal'
        >
            <div
                className="bg-[var(--theme-bg)] rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-[var(--border-main)] animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-[var(--border-main)]">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Clock className="w-5 h-5 text-[var(--primary-600)]" />
                        {t.versions.title}
                    </h2>
                    <button 
                        onClick={onClose} 
                        className="p-2 hover:bg-[var(--theme-hover)] rounded-full transition-colors"
                        aria-label={t.common?.close}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Create New Section */}
                <div className="p-4 bg-[var(--theme-surface)] border-b border-[var(--border-main)]">
                    <label className="text-sm font-medium mb-1 block">
                        {t.versions.create}
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newLabel}
                            onChange={(e) => setNewLabel(e.target.value)}
                            placeholder={t.versions.snapshotLabelPlaceholder}
                            className="flex-1 px-3 py-2 rounded-lg border border-[var(--border-strong)] bg-[var(--theme-bg)] focus:ring-2 focus:ring-[var(--primary-500)] outline-none"
                        />
                        <button
                            onClick={handleCreate}
                            disabled={isCreating || !newLabel.trim()}
                            className="bg-[var(--primary-600)] text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium hover:bg-[var(--primary-700)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isCreating ? t.versions.save + '...' : <><Plus className="w-4 h-4" /> {t.versions.save}</>}
                        </button>
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {isLoading && (
                        <div className="text-center py-8 text-[var(--text-dim)]">{t.versions.loadingHistory}</div>
                    )}

                    {!isLoading && snapshots.length === 0 && (
                        <div className="text-center py-8 text-[var(--text-dim)]">
                            {t.versions.noSnapshots}
                        </div>
                    )}

                    {snapshots.map((snap) => {
                        const parts = snap.name.replace('.json', '').split('_');
                        const label = parts.slice(3).join(' ') || t.versions.untitled;
                        const date = new Date(snap.modifiedTime);

                        return (
                            <div key={snap.id} className="group flex items-center justify-between p-3 rounded-lg border border-[var(--border-main)] hover:border-[var(--primary-500)] hover:bg-[var(--theme-hover)] transition-all">
                                <div className="flex flex-col">
                                    <span className="font-semibold text-sm flex items-center gap-2">
                                        <FileJson className="w-4 h-4 text-[var(--text-dim)]" />
                                        {label}
                                    </span>
                                    <span className="text-xs text-[var(--text-dim)] mt-1">
                                        {formatDistanceToNow(date, { addSuffix: true, locale: dateLocale })}
                                        {' • '}
                                        {date.toLocaleDateString()} {date.toLocaleTimeString()}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleRestore(snap)}
                                        className="px-3 py-1.5 text-xs font-medium bg-[var(--primary-100)] text-[var(--primary-700)] rounded hover:bg-[var(--primary-200)] flex items-center gap-1"
                                        title={t.versions.restore}
                                    >
                                        <RotateCcw className="w-3 h-3" />
                                        {t.versions.restore}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

            </div>

            <ConfirmationModal
                isOpen={isRestoreConfirmOpen}
                onClose={() => setRestoreConfirmOpen(false)}
                onConfirm={confirmRestore}
                title={t.versions.restore}
                message={t.versions.restoreConfirm}
                type="warning"
                overlayId="snapshot-history-restore-confirm"
            />
        </OverlayPrimitive>
    );
};
