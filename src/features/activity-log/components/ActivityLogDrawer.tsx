import React, { useEffect, useState, useCallback } from 'react';
import {
    X,
    Clock,
    ChevronDown,
} from 'lucide-react';
import { activityService, ActivityLog } from '../services/activityService';
import { useTranslation } from '../../../context/TranslationContext';
import { OverlayPrimitive } from '../../../context/OverlayContext';
import { logError } from '../../../utils/errorLogger';
import { showToast } from '../../../utils/showToast';
import { ActivityLogItem } from './ActivityLogItem';

interface ActivityLogDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    treeId: string;
    onNavigate: (personId: string) => void;
}

const ActivityLogDrawer: React.FC<ActivityLogDrawerProps> = ({ isOpen, onClose, treeId, onNavigate }) => {
    const { t, dateLocale } = useTranslation();
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [filterEmail, setFilterEmail] = useState<string>('');
    const [uniqueUsers, setUniqueUsers] = useState<string[]>([]);

    const collectUserEmails = (data: ActivityLog[]) =>
        Array.from(new Set(data.map((log) => log.user_email).filter((email): email is string => Boolean(email))));

    const loadLogs = useCallback(async (pageNum: number, isInitial = false, emailFilter?: string) => {
        if (!treeId) return;
        setIsLoading(true);
        try {
            const data = await activityService.fetchLogs(treeId, pageNum, 50, emailFilter);
            if (isInitial) {
                setLogs(data);
            } else {
                setLogs(prev => [...prev, ...data]);
            }
            const users = collectUserEmails(data);
            setUniqueUsers(prev => Array.from(new Set([...prev, ...users])));
            setHasMore(data.length === 50);
        } catch (error) {
            logError('ActivityLogDrawer loadLogs', error, {
                category: 'DATABASE',
                severity: 'LOW',
                metadata: { treeId, pageNum, emailFilter },
            });
            showToast.error('activityDrawer.loadError');
        } finally {
            setIsLoading(false);
        }
    }, [treeId]);

    useEffect(() => {
        if (isOpen && treeId) {
            setPage(0);
            loadLogs(0, true, filterEmail);

            const subscription = activityService.subscribeToLogs(treeId, (newLog) => {
                if (filterEmail && newLog.user_email !== filterEmail) return;
                setLogs(prev => [newLog, ...prev]);
            });

            return () => {
                subscription?.unsubscribe();
            };
        }
    }, [isOpen, treeId, loadLogs, filterEmail]);

    const handleFilterChange = (email: string) => {
        setFilterEmail(email);
        setPage(0);
    };

    const handleLoadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        loadLogs(nextPage, false, filterEmail);
    };

    return (
        <OverlayPrimitive
            isOpen={isOpen}
            onClose={onClose}
            id='activity-log-drawer'
            withBackdrop={false}
        >
            <div
                className="ds-overlay-backdrop fixed inset-0 z-[var(--z-index-modal)] transition-opacity"
                onClick={onClose}
            />

            <div className={`
                ds-drawer-shell fixed inset-y-0 end-0 h-[100dvh] w-full max-w-[400px] z-[calc(var(--z-index-modal)+1)] sm:top-14 sm:h-[calc(100vh-3.5rem)] md:top-16 md:h-[calc(100vh-4rem)]
                transform transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : 'translate-x-full rtl:-translate-x-full'}
                flex flex-col bg-[var(--surface-app)] border-l border-[var(--border-soft)] shadow-2xl
            `}>
                <div className="ds-drawer-header p-6 flex flex-col gap-4 sticky top-0 shadow-[var(--shadow-sm)] bg-[var(--surface-app)]">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-[var(--surface-subtle)] rounded-lg text-[var(--color-info-500)]">
                                <Clock className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-[var(--text-main)] leading-tight">
                                    {t.activityDrawer.title}
                                </h2>
                                <p className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wider">
                                    {t.activityDrawer.subtitle}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-[var(--surface-subtle)] rounded-full transition-colors group"
                        >
                            <X className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--text-main)]" />
                        </button>
                    </div>

                    <div className="relative">
                        <select
                            value={filterEmail}
                            onChange={(e) => handleFilterChange(e.target.value)}
                            className="ds-input w-full pl-3 pr-10 py-2.5 text-sm font-bold appearance-none cursor-pointer"
                        >
                            <option value="">
                                {t.activityDrawer.allContributors}
                            </option>
                            {uniqueUsers.map(email => (
                                <option key={email} value={email}>{email}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[var(--surface-app)]/55">
                    {logs.length === 0 && !isLoading ? (
                            <div className="ds-empty-state flex flex-col items-center justify-center h-64 text-center">
                            <div className="p-4 bg-[var(--surface-subtle)] rounded-full mb-4">
                                <Clock className="w-8 h-8 text-[var(--text-muted)] opacity-50" />
                            </div>
                            <p className="text-[var(--text-secondary)] font-medium">
                                {t.activityDrawer.emptyState}
                            </p>
                            <p className="text-xs text-[var(--text-muted)] mt-1">
                                {t.activityDrawer.emptyStateDesc}
                            </p>
                        </div>
                    ) : (
                        <div className="relative">
                            <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-[var(--border-soft)]" />
                            <div className="space-y-8">
                                {logs.map((log) => (
                                    <ActivityLogItem
                                        key={log.id}
                                        log={log}
                                        t={t}
                                        dateLocale={dateLocale}
                                        onNavigate={onNavigate}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {hasMore && (
                        <button
                            onClick={handleLoadMore}
                            disabled={isLoading}
                            className="w-full py-3 flex items-center justify-center gap-2 text-sm font-bold text-[var(--color-info-500)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] rounded-xl transition-all disabled:opacity-50 group border border-[var(--border-soft)]"
                        >
                            {isLoading ? (
                                <div className="w-4 h-4 border-2 border-[var(--color-info-500)] border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span>
                                        {t.activityDrawer.loadMore}
                                    </span>
                                    <ChevronDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </OverlayPrimitive>
    );
};

export default ActivityLogDrawer;
