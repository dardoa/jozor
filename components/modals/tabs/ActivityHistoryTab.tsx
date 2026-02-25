import React, { useState, useEffect } from 'react';
import { Clock, Loader2, ChevronDown, User, Edit3, Trash2, Link2, Unlink } from 'lucide-react';
import { activityService, ActivityLog } from '../../../services/activityService';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale/ar';
import { enUS } from 'date-fns/locale/en-US';

interface ActivityHistoryTabProps {
    treeId: string;
    language: 'ar' | 'en';
    onNavigateToPerson?: (personId: string) => void;
}

export const ActivityHistoryTab: React.FC<ActivityHistoryTabProps> = ({
    treeId,
    language,
    onNavigateToPerson,
}) => {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);

    useEffect(() => {
        loadInitialLogs();

        // Subscribe to real-time updates
        const subscription = activityService.subscribeToLogs(treeId, (newLog) => {
            setLogs((prev) => [newLog, ...prev]);
        });

        return () => {
            if (subscription) {
                subscription.unsubscribe();
            }
        };
    }, [treeId]);

    const loadInitialLogs = async () => {
        try {
            setIsLoading(true);
            const fetchedLogs = await activityService.fetchLogs(treeId, 20);
            setLogs(fetchedLogs);
            setHasMore(fetchedLogs.length === 20);
        } catch (error) {
            console.error('Failed to load activity logs:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadMore = async () => {
        if (!hasMore || isLoading) return;

        try {
            setIsLoading(true);
            const oldestLog = logs[logs.length - 1];
            const moreLogs = await activityService.fetchLogs(treeId, 20, oldestLog.created_at);
            setLogs((prev) => [...prev, ...moreLogs]);
            setHasMore(moreLogs.length === 20);
        } catch (error) {
            console.error('Failed to load more logs:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getActionIcon = (action: string) => {
        if (action.includes('added')) return <User className="w-4 h-4" />;
        if (action.includes('updated')) return <Edit3 className="w-4 h-4" />;
        if (action.includes('deleted')) return <Trash2 className="w-4 h-4" />;
        if (action.includes('linked')) return <Link2 className="w-4 h-4" />;
        if (action.includes('unlinked')) return <Unlink className="w-4 h-4" />;
        return <Clock className="w-4 h-4" />;
    };

    const getActionColor = (action: string) => {
        if (action.includes('deleted')) return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
        if (action.includes('added')) return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
        if (action.includes('updated')) return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
        return 'bg-[var(--theme-surface)] border-[var(--border-main)]';
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[var(--text-main)]">Activity Log</h3>
                <p className="text-xs text-[var(--text-dim)]">{logs.length} activities</p>
            </div>

            {isLoading && logs.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-[var(--text-dim)]" />
                </div>
            ) : logs.length === 0 ? (
                <div className="text-center py-12 text-[var(--text-dim)] text-sm">
                    No activity yet. Start making changes to see them here!
                </div>
            ) : (
                <div className="space-y-2">
                    {logs.map((log) => (
                        <div
                            key={log.id}
                            className={`p-3 rounded-lg border ${getActionColor(log.action)} transition-all hover:shadow-sm cursor-pointer`}
                            onClick={() => log.person_id && onNavigateToPerson?.(log.person_id)}
                        >
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-[var(--primary-600)]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    {getActionIcon(log.action)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-[var(--text-main)]">
                                        {log.action}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <p className="text-xs text-[var(--text-dim)]">
                                            {log.user_email}
                                        </p>
                                        <span className="text-xs text-[var(--text-dim)]">•</span>
                                        <p className="text-xs text-[var(--text-dim)]">
                                            {formatDistanceToNow(new Date(log.created_at), {
                                                addSuffix: true,
                                                locale: language === 'ar' ? ar : enUS,
                                            })}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {hasMore && (
                        <button
                            onClick={loadMore}
                            disabled={isLoading}
                            className="w-full py-2 px-4 rounded-lg border border-[var(--border-main)] hover:bg-[var(--theme-hover)] transition-colors text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    <ChevronDown className="w-4 h-4" />
                                    Load More
                                </>
                            )}
                        </button>
                    )}
                </div>
            )}

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mt-4">
                <p className="text-xs text-blue-800 dark:text-blue-200">
                    💡 <strong>Tip:</strong> Click on any activity to navigate to that person in the tree.
                </p>
            </div>
        </div>
    );
};
