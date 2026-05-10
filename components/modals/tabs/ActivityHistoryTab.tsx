import React from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { useTranslation } from '../../../context/TranslationContext';
import { ActivityLogItem } from './activityHistory/ActivityLogItem';
import { getActivityPanelText } from './activityHistory/activityHistoryUtils';
import { useActivityHistoryLogs } from './activityHistory/useActivityHistoryLogs';

interface ActivityHistoryTabProps {
  treeId: string;
  language: 'ar' | 'en';
  onNavigateToPerson?: (personId: string) => void;
}

export const ActivityHistoryTab: React.FC<ActivityHistoryTabProps> = ({
  treeId,
  language: _language,
  onNavigateToPerson,
}) => {
  const { t, dateLocale } = useTranslation();
  const panelText = getActivityPanelText(t);
  const { logs, isLoading, hasMore, loadMore } = useActivityHistoryLogs(treeId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[var(--text-main)]">{t.activityTab.title}</h3>
          <p className="mt-1 text-xs text-[var(--text-dim)]">
            {panelText.overview || 'Review the latest tree changes, collaboration events, and relationship updates in one timeline.'}
          </p>
        </div>
        <p className="text-xs text-[var(--text-dim)]">
          {logs.length} {t.activityTab.count}
        </p>
      </div>

      {isLoading && logs.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--text-dim)]" />
        </div>
      ) : logs.length === 0 ? (
        <div className="py-12 text-center text-sm text-[var(--text-dim)]">{t.activityTab.noActivity}</div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <ActivityLogItem
              key={log.id}
              log={log}
              dateLocale={dateLocale}
              translations={t}
              onNavigateToPerson={onNavigateToPerson}
            />
          ))}

          {hasMore && (
            <button
              type="button"
              onClick={loadMore}
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--border-main)] px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--theme-hover)] disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  {t.activityTab.loadMore}
                </>
              )}
            </button>
          )}
        </div>
      )}

      <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
        <p className="text-xs text-blue-800 dark:text-blue-200">
          <strong>{panelText.tipPrefix || t.onboarding?.tip || 'Tip'}:</strong> {t.activityTab.tip}
        </p>
      </div>
    </div>
  );
};
