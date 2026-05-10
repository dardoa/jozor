import { memo } from 'react';
import { Users, Layout, Percent } from 'lucide-react';

interface QuickStatsHeaderProps {
    totalMembers: number;
    maxGeneration: number;
    genderRatio: { male: number; female: number; other: number };
}

/**
 * QuickStatsHeader: Displays primary KPIs with a glassmorphism aesthetic.
 */
export const QuickStatsHeader = memo(({ totalMembers, maxGeneration, genderRatio }: QuickStatsHeaderProps) => {
    const malePct = totalMembers > 0 ? Math.round((genderRatio.male / totalMembers) * 100) : 0;
    const femalePct = totalMembers > 0 ? Math.round((genderRatio.female / totalMembers) * 100) : 0;
    const cardClass = 'relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-soft)] bg-[var(--surface-panel-subtle)] p-6 shadow-[var(--shadow-sm)] transition-all hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]';

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Members */}
            <div className={`${cardClass} group`}>
                <div className="absolute top-0 right-0 p-4 opacity-10 transition-opacity group-hover:opacity-20">
                    <Users size={48} className="text-[var(--primary-600)]" />
                </div>
                <p className="mb-1 text-xs font-bold uppercase tracking-widest text-[var(--color-accent-500)]">Total Members</p>
                <h4 className="text-4xl font-black text-[var(--text-main)]">{totalMembers.toLocaleString()}</h4>
                <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-[var(--surface-subtle)]">
                    <div className="h-full bg-[var(--color-accent-500)]" style={{ width: '100%' }} />
                </div>
            </div>

            {/* Generation Depth */}
            <div className={`${cardClass} group`}>
                <div className="absolute top-0 right-0 p-4 opacity-10 transition-opacity group-hover:opacity-20">
                    <Layout size={48} className="text-[var(--primary-600)]" />
                </div>
                <p className="mb-1 text-xs font-bold uppercase tracking-widest text-[var(--color-accent-500)]">Generation Depth</p>
                <h4 className="text-4xl font-black text-[var(--text-main)]">{maxGeneration}</h4>
                <p className="mt-2 text-[10px] font-mono text-[var(--text-muted)]">Maximum lineage levels</p>
            </div>

            {/* Gender Ratio */}
            <div className={`${cardClass} group`}>
                <div className="absolute top-0 right-0 p-4 opacity-10 transition-opacity group-hover:opacity-20">
                    <Percent size={48} className="text-[var(--primary-600)]" />
                </div>
                <p className="mb-1 text-xs font-bold uppercase tracking-widest text-[var(--color-accent-500)]">Gender Ratio</p>
                <div className="flex items-end gap-2">
                    <h4 className="text-4xl font-black text-[var(--text-main)]">{malePct}:{femalePct}</h4>
                    <span className="mb-1.5 text-[10px] font-bold text-[var(--text-muted)]">% (M/F)</span>
                </div>
                <div className="mt-4 flex h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-subtle)]">
                    <div className="h-full bg-[var(--color-info-500)]" style={{ width: `${malePct}%` }} />
                    <div className="h-full bg-[var(--color-accent-500)]" style={{ width: `${femalePct}%` }} />
                </div>
            </div>
        </div>
    );
});

QuickStatsHeader.displayName = 'QuickStatsHeader';
