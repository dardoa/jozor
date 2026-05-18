import React from 'react';
import {
    Clock,
    Edit,
    Link,
    PlusCircle,
    Shield,
    Trash2,
    Unlink,
    UserPlus,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Locale } from 'date-fns';

import type { ActivityActionType, ActivityLog } from '../services/activityService';
import type { TranslationSchema } from '../../../utils/translationLoader';
import { formatActivityDescription, getActivityTargetId } from '../logic/activityLogPresentation';

interface ActivityLogItemProps {
    log: ActivityLog;
    t: TranslationSchema;
    dateLocale?: Locale;
    onNavigate: (personId: string) => void;
}

const getActionIcon = (type: ActivityActionType) => {
    switch (type) {
        case 'ADD_PERSON':
            return <PlusCircle className="w-4 h-4 text-emerald-500" />;
        case 'UPDATE_PERSON':
            return <Edit className="w-4 h-4 text-blue-500" />;
        case 'DELETE_PERSON':
            return <Trash2 className="w-4 h-4 text-red-500" />;
        case 'ADD_RELATION':
            return <Link className="w-4 h-4 text-amber-500" />;
        case 'DELETE_RELATION':
            return <Unlink className="w-4 h-4 text-orange-500" />;
        case 'SHARE_INVITE':
            return <UserPlus className="w-4 h-4 text-indigo-500" />;
        case 'SHARE_INVITE_ACCEPT':
            return <UserPlus className="w-4 h-4 text-emerald-600" />;
        case 'SHARE_INVITE_DECLINE':
            return <UserPlus className="w-4 h-4 text-rose-500" />;
        case 'SHARE_REVOKE':
            return <Shield className="w-4 h-4 text-red-500" />;
        case 'SHARE_ROLE_CHANGE':
            return <Shield className="w-4 h-4 text-amber-600" />;
        default:
            return <Clock className="w-4 h-4 text-[var(--text-muted)]" />;
    }
};

export const ActivityLogItem: React.FC<ActivityLogItemProps> = ({
    log,
    t,
    dateLocale,
    onNavigate,
}) => {
    const targetId = getActivityTargetId(log);
    const isClickable = Boolean(targetId);

    return (
        <div
            onClick={() => isClickable && targetId && onNavigate(targetId)}
            className={`relative flex gap-4 group transition-all rounded-lg p-2 -ml-2 -mr-2
                ${log.action_type === 'DELETE_PERSON' ? 'bg-[color:rgba(179,92,75,0.08)]' : ''}
                ${isClickable ? 'hover:bg-[var(--surface-subtle)] cursor-pointer hover:shadow-[var(--shadow-sm)] border border-transparent hover:border-[var(--border-soft)]' : ''}
            `}
        >
            <div className="relative z-10 mt-1">
                <div className="w-10 h-10 rounded-full bg-[var(--surface-panel)] border-2 border-[var(--border-soft)] flex items-center justify-center shadow-[var(--shadow-sm)] group-hover:border-[var(--color-info-500)]/20 transition-colors">
                    {getActionIcon(log.action_type)}
                </div>
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[var(--text-main)] truncate max-w-[150px]">
                            {log.user_email?.split('@')[0] || t.activityDrawer.someone}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 bg-[var(--surface-subtle)] text-[var(--text-muted)] rounded-full font-bold uppercase">
                            {log.action_type.split('_')[0]}
                        </span>
                    </div>
                    <span className="text-[11px] text-[var(--text-muted)] font-medium">
                        {formatDistanceToNow(new Date(log.created_at), {
                            addSuffix: true,
                            locale: dateLocale,
                        })}
                    </span>
                </div>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed font-medium">
                    {formatActivityDescription(log, t)}
                </p>
            </div>
        </div>
    );
};
