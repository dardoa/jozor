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

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Members */}
            <div className="relative group overflow-hidden bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-xl transition-all hover:bg-white/15">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Users size={48} className="text-white" />
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#E1AD01] mb-1">Total Members</p>
                <h4 className="text-4xl font-black text-white">{totalMembers.toLocaleString()}</h4>
                <div className="mt-4 h-1 w-full bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full bg-[#E1AD01]" style={{ width: '100%' }} />
                </div>
            </div>

            {/* Generation Depth */}
            <div className="relative group overflow-hidden bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-xl transition-all hover:bg-white/15">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Layout size={48} className="text-white" />
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#E1AD01] mb-1">Generation Depth</p>
                <h4 className="text-4xl font-black text-white">{maxGeneration}</h4>
                <p className="text-[10px] text-white/50 mt-2 font-mono">Maximum lineage levels</p>
            </div>

            {/* Gender Ratio */}
            <div className="relative group overflow-hidden bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 shadow-xl transition-all hover:bg-white/15">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Percent size={48} className="text-white" />
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#E1AD01] mb-1">Gender Ratio</p>
                <div className="flex items-end gap-2">
                    <h4 className="text-4xl font-black text-white">{malePct}:{femalePct}</h4>
                    <span className="text-[10px] font-bold text-white/70 mb-1.5">% (M/F)</span>
                </div>
                <div className="mt-4 h-1.5 w-full bg-white/20 rounded-full overflow-hidden flex">
                    <div className="h-full bg-[#002366]" style={{ width: `${malePct}%` }} />
                    <div className="h-full bg-pink-500" style={{ width: `${femalePct}%` }} />
                </div>
            </div>
        </div>
    );
});

QuickStatsHeader.displayName = 'QuickStatsHeader';
