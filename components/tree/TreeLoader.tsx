import React from 'react';
import { Skeleton } from '../ui/Skeleton';

export const TreeLoader: React.FC = () => {
    return (
        <div data-testid="tree-loader" className="absolute inset-0 flex items-center justify-center bg-[var(--theme-bg)]/50 backdrop-blur-sm z-50">
            <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                {/* Central Node Skeleton */}
                <div className="relative z-10">
                    <Skeleton variant="rectangular" width={220} height={120} className="rounded-2xl border-4 border-white/10 shadow-2xl" />
                    
                    {/* Connection Lines (Represented by Skeletons or simple divs) */}
                    <div className="absolute top-1/2 left-full w-20 h-1 bg-slate-200/20 dark:bg-slate-800/20 -translate-y-1/2" />
                    <div className="absolute top-1/2 right-full w-20 h-1 bg-slate-200/20 dark:bg-slate-800/20 -translate-y-1/2" />
                    <div className="absolute left-1/2 bottom-full w-1 h-20 bg-slate-200/20 dark:bg-slate-800/20 -translate-x-1/2" />
                    <div className="absolute left-1/2 top-full w-1 h-20 bg-slate-200/20 dark:bg-slate-800/20 -translate-x-1/2" />
                </div>

                {/* Surrounding Nodes Skeletons */}
                <div className="absolute top-[20%] left-[20%] opacity-40">
                    <Skeleton variant="rectangular" width={180} height={100} className="rounded-xl" />
                </div>
                <div className="absolute top-[20%] right-[20%] opacity-40">
                    <Skeleton variant="rectangular" width={180} height={100} className="rounded-xl" />
                </div>
                <div className="absolute bottom-[20%] left-[20%] opacity-40">
                    <Skeleton variant="rectangular" width={180} height={100} className="rounded-xl" />
                </div>
                <div className="absolute bottom-[20%] right-[20%] opacity-40">
                    <Skeleton variant="rectangular" width={180} height={100} className="rounded-xl" />
                </div>

                {/* Animated Loading Text */}
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3">
                    <div className="flex gap-1">
                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                </div>
            </div>
        </div>
    );
};
