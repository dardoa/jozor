import React, { useState, memo } from 'react';
import { X, Settings, Users, Clock, History, LayoutPanelLeft } from 'lucide-react';
import { AccessControlTab } from './tabs/AccessControlTab';
import { ActivityHistoryTab } from './tabs/ActivityHistoryTab';
import { TreeSettingsTab } from './tabs/TreeSettingsTab';
import { VersionsTab } from './tabs/VersionsTab';
import { useTranslation } from '../../context/TranslationContext';
import { useAppStore } from '../../store/useAppStore';
import { deltaSyncService } from '../../services/deltaSyncService';
import type { Person } from '../../types';
import { OverlayPrimitive } from '../../context/OverlayContext';

interface AdminHubModalProps {
    isOpen: boolean;
    onClose: () => void;
    treeId: string;
    ownerId: string;
    ownerEmail: string;
    currentUserRole: 'owner' | 'editor' | 'viewer';
    treeName?: string;
    googleSync: {
        handleCreateSnapshot: (label: string) => Promise<void>;
        handleRestoreSnapshot: (snapshot: any) => Promise<void>;
    };
    onRootChanged?: (newRootId: string) => void;
}

type TabType = 'access' | 'activity' | 'versions' | 'settings';

export const AdminHubModal = memo<AdminHubModalProps>(({
    isOpen,
    onClose,
    treeId,
    ownerId,
    ownerEmail,
    currentUserRole,
    treeName,
    googleSync,
    onRootChanged
}) => {
    const [activeTab, setActiveTab] = useState<TabType>('access');
    const { t, language } = useTranslation();
    const people = useAppStore((state) => state.people);

    // Force status refresh on open
    React.useEffect(() => {
        if (isOpen && treeId) {
            console.log('Admin Hub Opened: Syncing Status...');
        }
    }, [isOpen, treeId]);

    const tabs = [
        { id: 'access' as TabType, label: t.adminHub.tabs.access, icon: Users },
        { id: 'activity' as TabType, label: t.adminHub.tabs.activity, icon: History },
        { id: 'versions' as TabType, label: t.adminHub.tabs.versions, icon: Clock },
        { id: 'settings' as TabType, label: t.adminHub.tabs.settings, icon: Settings },
    ];

    return (
        <OverlayPrimitive
            isOpen={isOpen}
            onClose={onClose}
            id="admin-hub-modal"
        >
            <div className="bg-[var(--theme-bg)] rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col border border-[var(--border-main)] animate-in fade-in zoom-in-95 duration-200 overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-[var(--border-main)] bg-[var(--theme-surface)]/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[var(--primary-600)]/10 rounded-xl text-[var(--primary-600)]">
                            <LayoutPanelLeft className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-[var(--text-main)]">
                                {t.adminHub.title}
                            </h2>
                            <p className="text-xs text-[var(--text-dim)]">
                                {treeName || t.adminHub.subtitle} • {currentUserRole.toUpperCase()}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-[var(--theme-hover)] rounded-full transition-all text-[var(--text-dim)] hover:text-[var(--text-main)] active:scale-90"
                        aria-label={t.close}
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Tabs Navigation */}
                <div className="flex border-b border-[var(--border-main)] bg-[var(--theme-surface)] px-4">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all border-b-2 outline-none ${activeTab === tab.id
                                ? 'border-[var(--primary-600)] text-[var(--primary-600)] bg-[var(--primary-600)]/5'
                                : 'border-transparent text-[var(--text-dim)] hover:text-[var(--text-main)] hover:bg-[var(--theme-hover)]'
                                }`}
                        >
                            <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'animate-pulse' : ''}`} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[var(--theme-bg)]">
                    <div className="max-w-3xl mx-auto">
                        {isOpen && (
                            <React.Suspense fallback={
                                <div className="flex items-center justify-center py-20">
                                    <div className="w-10 h-10 border-4 border-[var(--primary-600)]/20 border-t-[var(--primary-600)] rounded-full animate-spin" />
                                </div>
                            }>
                                {activeTab === 'access' && (
                                    <AccessControlTab
                                        treeId={treeId}
                                        ownerId={ownerId}
                                        ownerEmail={ownerEmail}
                                        language={language}
                                    />
                                )}
                                {activeTab === 'activity' && (
                                    <ActivityHistoryTab
                                        treeId={treeId}
                                        language={language}
                                    />
                                )}
                                {activeTab === 'versions' && (
                                    <VersionsTab
                                        treeId={treeId}
                                        language={language}
                                        googleSync={googleSync}
                                    />
                                )}
                                {activeTab === 'settings' && (
                                    <TreeSettingsTab
                                        treeId={treeId}
                                        treeName={treeName}
                                        ownerId={ownerId}
                                        ownerEmail={ownerEmail}
                                        people={Object.values(people)} // Pass live people
                                        currentRootId={useAppStore.getState().focusId}
                                        onRootChanged={onRootChanged}
                                    />
                                )}
                            </React.Suspense>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-[var(--border-main)] bg-[var(--theme-surface)]/30 flex justify-end">
                    <p className="text-[10px] text-[var(--text-dim)] italic">
                        {t.adminHub.footerNote}
                    </p>
                </div>
            </div>
        </OverlayPrimitive>
    );
});

AdminHubModal.displayName = 'AdminHubModal';
