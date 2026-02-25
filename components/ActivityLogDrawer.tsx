import React, { useEffect, useState, useCallback } from 'react';
import {
    X,
    Clock,
    PlusCircle,
    Edit,
    Trash2,
    Link,
    Unlink,
    ChevronDown
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { activityService, ActivityLog } from '../services/activityService';
import { useTranslation } from '../context/TranslationContext';

interface ActivityLogDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    treeId: string;
    onNavigate: (personId: string) => void;
}

const ActivityLogDrawer: React.FC<ActivityLogDrawerProps> = ({ isOpen, onClose, treeId, onNavigate }) => {
    useTranslation();
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [filterEmail, setFilterEmail] = useState<string>('');
    const [uniqueUsers, setUniqueUsers] = useState<string[]>([]);

    const loadLogs = useCallback(async (pageNum: number, isInitial = false, emailFilter?: string) => {
        if (!treeId) return;
        setIsLoading(true);
        try {
            const data = await activityService.fetchLogs(treeId, pageNum, 50, emailFilter);
            if (isInitial) {
                setLogs(data);
                if (pageNum === 0) {
                    const users = Array.from(new Set(data.map(l => l.user_email).filter(Boolean))) as string[];
                    setUniqueUsers(prev => Array.from(new Set([...prev, ...users])));
                }
            } else {
                setLogs(prev => [...prev, ...data]);
            }
            setHasMore(data.length === 50);
        } catch (error) {
            console.error('Failed to load activity logs:', error);
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

    const getActionIcon = (type: string) => {
        switch (type) {
            case 'ADD_PERSON': return <PlusCircle className="w-4 h-4 text-emerald-500" />;
            case 'UPDATE_PERSON': return <Edit className="w-4 h-4 text-blue-500" />;
            case 'DELETE_PERSON': return <Trash2 className="w-4 h-4 text-red-500" />;
            case 'ADD_RELATION': return <Link className="w-4 h-4 text-amber-500" />;
            case 'DELETE_RELATION': return <Unlink className="w-4 h-4 text-orange-500" />;
            default: return <Clock className="w-4 h-4 text-gray-500" />;
        }
    };

    const formatActionDescription = (log: ActivityLog) => {
        const { details, action_type } = log;
        const name = details.personName || details.targetName || details.focusName || 'Someone';

        switch (action_type) {
            case 'ADD_PERSON': return `Added ${name}`;
            case 'UPDATE_PERSON': return `Updated details for ${name}`;
            case 'DELETE_PERSON': return `Removed ${name} from the tree`;
            case 'ADD_RELATION': return `Modified relationship between ${details.focusName} and ${details.existingName}`;
            case 'DELETE_RELATION': return `Modified relationship between ${details.targetName} and ${details.relativeName}`;
            default: return 'Performed an action';
        }
    };

    const getTargetId = (log: ActivityLog) => {
        const { details, action_type } = log;
        if (action_type === 'DELETE_PERSON') return null;
        return details.personId || details.focusId || details.targetId || null;
    };

    return (
        <>
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100] transition-opacity"
                    onClick={onClose}
                />
            )}

            <div className={`
                fixed top-0 right-0 h-full w-[400px] bg-white shadow-2xl z-[101]
                transform transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : 'translate-x-full'}
                flex flex-col border-l border-gray-100
            `}>
                <div className="p-6 border-b border-gray-50 flex flex-col gap-4 bg-white sticky top-0 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 rounded-lg">
                                <Clock className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 leading-tight">Activity History</h2>
                                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Audit Trail</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors group"
                        >
                            <X className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                        </button>
                    </div>

                    <div className="relative">
                        <select
                            value={filterEmail}
                            onChange={(e) => handleFilterChange(e.target.value)}
                            className="w-full pl-3 pr-10 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                        >
                            <option value="">All Contributors</option>
                            {uniqueUsers.map(email => (
                                <option key={email} value={email}>{email}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-gray-200">
                    {logs.length === 0 && !isLoading ? (
                        <div className="flex flex-col items-center justify-center h-64 text-center">
                            <div className="p-4 bg-gray-50 rounded-full mb-4">
                                <Clock className="w-8 h-8 text-gray-300" />
                            </div>
                            <p className="text-gray-500 font-medium">No activity recorded yet</p>
                            <p className="text-xs text-gray-400 mt-1">Changes will appear here in real-time</p>
                        </div>
                    ) : (
                        <div className="relative">
                            <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-gray-100" />
                            <div className="space-y-8">
                                {logs.map((log) => {
                                    const targetId = getTargetId(log);
                                    const isClickable = !!targetId;

                                    return (
                                        <div
                                            key={log.id}
                                            onClick={() => isClickable && targetId && onNavigate(targetId)}
                                            className={`relative flex gap-4 group transition-all rounded-lg p-2 -ml-2 -mr-2
                                                ${log.action_type === 'DELETE_PERSON' ? 'bg-red-50/50' : ''}
                                                ${isClickable ? 'hover:bg-gray-50 cursor-pointer hover:shadow-sm border border-transparent hover:border-gray-100' : ''}
                                            `}
                                        >
                                            <div className="relative z-10 mt-1">
                                                <div className="w-10 h-10 rounded-full bg-white border-2 border-gray-100 flex items-center justify-center shadow-sm group-hover:border-indigo-100 transition-colors">
                                                    {getActionIcon(log.action_type)}
                                                </div>
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-semibold text-gray-900 truncate max-w-[150px]">
                                                            {log.user_email?.split('@')[0] || 'Unknown User'}
                                                        </span>
                                                        <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full font-bold uppercase">
                                                            {log.action_type.split('_')[0]}
                                                        </span>
                                                    </div>
                                                    <span className="text-[11px] text-gray-400 font-medium">
                                                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-600 leading-relaxed font-medium">
                                                    {formatActionDescription(log)}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {hasMore && (
                        <button
                            onClick={handleLoadMore}
                            disabled={isLoading}
                            className="w-full py-3 flex items-center justify-center gap-2 text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all disabled:opacity-50 group"
                        >
                            {isLoading ? (
                                <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span>Load older activities</span>
                                    <ChevronDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </>
    );
};

export default ActivityLogDrawer;
