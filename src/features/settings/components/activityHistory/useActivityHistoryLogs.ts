import { useCallback, useEffect, useState } from 'react';
import { activityService, type ActivityLog } from '../../../../features/activity-log';

const PAGE_SIZE = 20;

export const useActivityHistoryLogs = (treeId: string) => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  const loadInitialLogs = useCallback(async () => {
    try {
      setIsLoading(true);
      const fetchedLogs = await activityService.fetchLogs(treeId, 0, PAGE_SIZE);
      setLogs(fetchedLogs);
      setHasMore(fetchedLogs.length === PAGE_SIZE);
      setPage(0);
    } catch (error) {
      console.error('Failed to load activity logs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [treeId]);

  useEffect(() => {
    void loadInitialLogs();

    const subscription = activityService.subscribeToLogs(treeId, (newLog) => {
      setLogs((previous) => [newLog, ...previous]);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [loadInitialLogs, treeId]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;

    try {
      setIsLoading(true);
      const nextPage = page + 1;
      const moreLogs = await activityService.fetchLogs(treeId, nextPage, PAGE_SIZE);
      setLogs((previous) => [...previous, ...moreLogs]);
      setHasMore(moreLogs.length === PAGE_SIZE);
      setPage(nextPage);
    } catch (error) {
      console.error('Failed to load more logs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [hasMore, isLoading, page, treeId]);

  return {
    logs,
    isLoading,
    hasMore,
    loadMore,
  };
};
