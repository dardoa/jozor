import { formatDistanceToNow } from 'date-fns';
import type { Locale } from 'date-fns';
import type { ActivityLog } from '../../../../features/activity-log';
import {
  formatActivityActionDescription,
  getActivityActionColor,
  getActivityActionIcon,
  getActivityTargetId,
} from './activityHistoryUtils';

interface ActivityLogItemProps {
  log: ActivityLog;
  dateLocale?: Locale;
  translations: Parameters<typeof formatActivityActionDescription>[1];
  onNavigateToPerson?: (personId: string) => void;
}

export const ActivityLogItem = ({
  log,
  dateLocale,
  translations,
  onNavigateToPerson,
}: ActivityLogItemProps) => {
  const targetId = getActivityTargetId(log);

  return (
    <div
      className={`rounded-lg border p-3 transition-all hover:shadow-sm ${
        getActivityActionColor(log.action_type)
      } ${targetId ? 'cursor-pointer' : ''}`}
      onClick={() => targetId && onNavigateToPerson?.(targetId)}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary-600)]/10">
          {getActivityActionIcon(log.action_type)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[var(--text-main)]">
            {formatActivityActionDescription(log, translations)}
          </p>
          <div className="mt-1 flex items-center gap-2 text-xs text-[var(--text-dim)]">
            <span>{log.user_email || translations.activityDrawer.someone}</span>
            <span aria-hidden="true">-</span>
            <span>
              {formatDistanceToNow(new Date(log.created_at), {
                addSuffix: true,
                locale: dateLocale,
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
