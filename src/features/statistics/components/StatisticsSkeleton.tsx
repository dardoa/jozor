import { memo } from 'react';

/**
 * StatisticsSkeleton: A premium glassmorphism skeleton loader for the dashboard.
 */
export const StatisticsSkeleton = memo(() => {
    return (
        <div className="w-full h-full min-h-[500px] p-6 space-y-8 animate-pulse">
            {/* KPI Header Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel-subtle)] shadow-[var(--shadow-sm)]" />
                ))}
            </div>

            {/* Main Charts Area */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-80 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel-subtle)] shadow-[var(--shadow-sm)]" />
                <div className="h-80 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel-subtle)] shadow-[var(--shadow-sm)]" />
            </div>

            {/* Word Cloud Area */}
            <div className="h-64 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel-subtle)] shadow-[var(--shadow-sm)]" />
        </div>
    );
});

StatisticsSkeleton.displayName = 'StatisticsSkeleton';
