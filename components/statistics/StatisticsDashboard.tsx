import { useMemo, useState, memo } from 'react';
import { StatsEngine, StatsData } from '../../services/StatsEngine';
import { Person, TreeSettings } from '../../types';
import { QuickStatsHeader } from './QuickStatsHeader';
import { DemographicChart } from './DemographicChart';
import { VitalityIndex } from './VitalityIndex';
import { SurnameWordCloud } from './SurnameWordCloud';
import { useAppStore } from '../../store/useAppStore';
import {
    ShieldCheck,
    AlertTriangle,
    PieChart,
    BarChart3,
    MapPin,
    Baby,
    Cake,
    Activity,
    Trophy,
    Users,
    ChevronRight,
    ExternalLink,
    Info,
    Clock,
    Calendar
} from 'lucide-react';
import { useTranslation } from '../../context/TranslationContext';
import { formatDate } from '../../utils/familyLogic';

interface StatisticsDashboardProps {
    people: Record<string, Person>;
    onNavigateToPerson?: (id: string) => void;
}

export const StatisticsDashboard = memo(({ people, onNavigateToPerson }: StatisticsDashboardProps) => {
    const { t } = useTranslation();
    const treeSettings = useAppStore((state) => state.treeSettings);
    const validationErrors = useAppStore((state) => state.validationErrors);

    // Unified Calculation
    const stats = useMemo(() => StatsEngine.calculate(people, validationErrors), [people, validationErrors]);

    const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'geo' | 'names' | 'birthdays' | 'health'>('overview');

    const tabs = [
        { id: 'overview', label: t.overview, icon: <PieChart className="w-4 h-4" /> },
        { id: 'timeline', label: t.timelineTab, icon: <BarChart3 className="w-4 h-4" /> },
        { id: 'geo', label: t.geography, icon: <MapPin className="w-4 h-4" /> },
        { id: 'names', label: t.names, icon: <Baby className="w-4 h-4" /> },
        { id: 'birthdays', label: t.birthdays || 'Birthdays', icon: <Cake className="w-4 h-4" /> },
        { id: 'health', label: t.health || 'Health', icon: <ShieldCheck className="w-4 h-4" /> },
    ];

    const renderList = (title: string, data: { name: string; count: number }[], icon: React.ReactNode, colorClass: string, isMap = false) => (
        <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/10 bg-white/5 flex items-center gap-2">
                {icon} <h4 className="text-sm font-bold text-white/80">{title}</h4>
            </div>
            <div className="divide-y divide-white/5">
                {data.length === 0 ? (
                    <div className="p-8 text-center text-xs text-white/30 italic">No data available</div>
                ) : (
                    data.map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-3 px-4 hover:bg-white/5 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${colorClass}`}>
                                    {i + 1}
                                </div>
                                {isMap ? (
                                    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.name)}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-400 hover:underline flex items-center gap-1">
                                        {item.name} <ExternalLink className="w-3 h-3" />
                                    </a>
                                ) : (
                                    <span className="text-sm font-medium text-white/70">{item.name}</span>
                                )}
                            </div>
                            <span className="text-xs font-bold text-white/40 bg-white/5 px-2 py-0.5 rounded-full">{item.count}</span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-black/20 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
            {/* Tab Navigation */}
            <div className="flex gap-1 p-2 bg-white/5 border-b border-white/10 overflow-x-auto no-scrollbar">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id
                            ? 'bg-[#E1AD01] text-black shadow-lg shadow-[#E1AD01]/20'
                            : 'text-white/40 hover:bg-white/5 hover:text-white/60'
                            }`}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar space-y-8 animate-in fade-in duration-500">
                {activeTab === 'overview' && (
                    <>
                        <QuickStatsHeader
                            totalMembers={stats.kpis.totalMembers}
                            maxGeneration={stats.kpis.maxGeneration}
                            genderRatio={stats.kpis.genderRatio}
                        />

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <DemographicChart data={stats.demographics} />
                                    <VitalityIndex data={stats.vitality} />
                                </div>
                                <SurnameWordCloud data={stats.surnames} />
                            </div>

                            <div className="space-y-6">
                                {/* Records Card */}
                                <div className="bg-gradient-to-br from-white/10 to-transparent rounded-2xl p-6 border border-white/10">
                                    <h3 className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                                        <Trophy className="w-3 h-3 text-[#E1AD01]" /> Hall of Records
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 rounded-lg bg-[#E1AD01]/10 text-[#E1AD01]"><Clock className="w-4 h-4" /></div>
                                            <div>
                                                <p className="text-[10px] text-white/30 uppercase font-bold">Oldest Person</p>
                                                <p className="text-sm font-bold text-white/80">{stats.records.oldestPerson?.name || 'N/A'}</p>
                                                <p className="text-xs text-[#E1AD01]">{stats.records.oldestPerson?.age} Years</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400"><Users className="w-4 h-4" /></div>
                                            <div>
                                                <p className="text-[10px] text-white/30 uppercase font-bold">Most Children</p>
                                                <p className="text-sm font-bold text-white/80">{stats.records.mostChildren?.name || 'N/A'}</p>
                                                <p className="text-xs text-blue-400">{stats.records.mostChildren?.count} Descendants</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Health Score */}
                                <div className="bg-gradient-to-br from-white/5 to-transparent rounded-2xl p-6 border border-white/10 flex flex-col items-center">
                                    <div className="relative w-32 h-32 flex items-center justify-center">
                                        <svg className="w-full h-full transform -rotate-90">
                                            <circle cx="64" cy="64" r="54" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/5" />
                                            <circle cx="64" cy="64" r="54" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={339.12} strokeDashoffset={339.12 * (1 - stats.kpis.healthScore / 100)} strokeLinecap="round" className={`transition-all duration-1000 ${stats.kpis.healthScore > 90 ? 'text-green-500' : stats.kpis.healthScore > 70 ? 'text-[#E1AD01]' : 'text-red-500'}`} />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-2xl font-black text-white">{stats.kpis.healthScore}%</span>
                                            <span className="text-[8px] text-white/40 uppercase tracking-tighter">Health</span>
                                        </div>
                                    </div>
                                    <p className="mt-4 text-[10px] text-white/40 text-center leading-relaxed">Based on {Object.keys(validationErrors).length} detected inconsistencies in your family tree.</p>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'timeline' && <DemographicChart data={stats.demographics} />}

                {activeTab === 'geo' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {renderList(t.topPlaces, stats.topPlaces, <MapPin className="w-4 h-4 text-red-500" />, "bg-red-500/20 text-red-400", true)}
                        <div className="bg-white/5 rounded-2xl p-8 border border-white/10 flex flex-col items-center justify-center text-center">
                            <MapPin className="w-12 h-12 text-white/10 mb-4" />
                            <h4 className="text-white/60 font-bold">Migration Insights</h4>
                            <p className="text-xs text-white/30 max-w-xs mt-2">Geographic distribution of your family roots across {stats.topPlaces.length} major locations.</p>
                        </div>
                    </div>
                )}

                {activeTab === 'names' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {renderList(t.maleNames, stats.topNames.male, <Baby className="w-4 h-4 text-blue-400" />, "bg-blue-400/20 text-blue-300")}
                        {renderList(t.femaleNames, stats.topNames.female, <Baby className="w-4 h-4 text-pink-400" />, "bg-pink-400/20 text-pink-300")}
                    </div>
                )}

                {activeTab === 'birthdays' && (
                    <div className="max-w-2xl mx-auto space-y-4">
                        {stats.upcomingBirthdays.length === 0 ? (
                            <div className="text-center py-20 opacity-30 italic">No upcoming birthdays (next 30 days)</div>
                        ) : (
                            stats.upcomingBirthdays.map((b) => (
                                <div key={b.person.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
                                    <div className="flex items-center gap-4">
                                        {b.person.photoUrl ? (
                                            <img src={b.person.photoUrl} className="w-12 h-12 rounded-full object-cover border-2 border-[#E1AD01]/30" alt="" />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-[#E1AD01] font-bold">
                                                {b.person.firstName[0]}{b.person.lastName[0]}
                                            </div>
                                        )}
                                        <div>
                                            <h4 className="text-sm font-bold text-white/80">{b.person.firstName} {b.person.lastName}</h4>
                                            <p className="text-xs text-white/40">Turning {b.ageTurning} years old</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs font-black text-[#E1AD01] uppercase">{b.daysUntil === 0 ? 'Today' : `In ${b.daysUntil} Days`}</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'health' && (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white/5 p-6 rounded-2xl border border-white/10 text-center">
                                <Users className="w-6 h-6 text-orange-400 mx-auto mb-2" />
                                <div className="text-2xl font-black text-white">{Object.keys(validationErrors).filter(id => validationErrors[id].some(e => e.includes('connected'))).length}</div>
                                <div className="text-[10px] text-white/30 uppercase font-bold">Disconnected Nodes</div>
                            </div>
                            <div className="bg-white/5 p-6 rounded-2xl border border-white/10 text-center">
                                <Calendar className="w-6 h-6 text-red-500 mx-auto mb-2" />
                                <div className="text-2xl font-black text-white">{Object.keys(validationErrors).filter(id => validationErrors[id].some(e => e.includes('date'))).length}</div>
                                <div className="text-[10px] text-white/30 uppercase font-bold">Date Paradoxes</div>
                            </div>
                            <div className="bg-white/5 p-6 rounded-2xl border border-white/10 text-center">
                                <ShieldCheck className="w-6 h-6 text-green-500 mx-auto mb-2" />
                                <div className="text-2xl font-black text-white">{stats.kpis.healthScore}%</div>
                                <div className="text-[10px] text-white/30 uppercase font-bold">Total Accuracy</div>
                            </div>
                        </div>

                        <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
                            <div className="p-4 border-b border-white/10 bg-white/5 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-[#E1AD01]" />
                                <h4 className="text-sm font-bold text-white/80">Active Data Issues</h4>
                            </div>
                            <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto">
                                {Object.entries(validationErrors).map(([id, errors]) => (
                                    <button
                                        key={id}
                                        onClick={() => onNavigateToPerson?.(id)}
                                        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors group"
                                    >
                                        <div className="flex items-center gap-4 text-left">
                                            <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 text-xs font-bold">
                                                {people[id]?.firstName?.[0]}
                                            </div>
                                            <div>
                                                <h5 className="text-sm font-bold text-white/70 group-hover:text-white transition-colors">
                                                    {people[id]?.firstName} {people[id]?.lastName}
                                                </h5>
                                                <div className="flex gap-2 mt-1">
                                                    {errors.map((e, idx) => (
                                                        <span key={idx} className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-[9px] font-medium">{e}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-white/40" />
                                    </button>
                                ))}
                                {Object.keys(validationErrors).length === 0 && (
                                    <div className="p-20 text-center flex flex-col items-center">
                                        <ShieldCheck className="w-12 h-12 text-green-500/20 mb-4" />
                                        <p className="text-white/30 italic">No health issues detected. Your tree is optimized.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

StatisticsDashboard.displayName = 'StatisticsDashboard';
