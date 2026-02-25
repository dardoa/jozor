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
                    <div key={i} className="h-24 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl" />
                ))}
            </div>

            {/* Main Charts Area */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-80 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl" />
                <div className="h-80 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl" />
            </div>

            {/* Word Cloud Area */}
            <div className="h-64 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl" />
        </div>
    );
});

StatisticsSkeleton.displayName = 'StatisticsSkeleton';
