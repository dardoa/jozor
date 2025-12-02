
import React, { useMemo, useState } from 'react';
import { Person, Language } from '../types';
import { calculateStatistics } from '../utils/statisticsLogic';
import { getTranslation } from '../utils/translations';
import { X, Users, Activity, Clock, Trophy, MapPin, Calendar, PieChart, BarChart3, Baby, ExternalLink } from 'lucide-react';

interface StatisticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  people: Record<string, Person>;
  language: Language;
}

export const StatisticsModal: React.FC<StatisticsModalProps> = ({ isOpen, onClose, people, language }) => {
  const t = getTranslation(language);
  const stats = useMemo(() => calculateStatistics(people), [people]);
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'geo' | 'names'>('overview');

  if (!isOpen) return null;

  const StatCard = ({ icon, title, value, subtext, color }: any) => (
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-start gap-4">
          <div className={`p-3 rounded-lg ${color}`}>
              {icon}
          </div>
          <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{title}</p>
              <h4 className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{value}</h4>
              {subtext && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtext}</p>}
          </div>
      </div>
  );

  // Render Bar Chart for Decades
  const renderTimeline = () => {
      // Explicitly map string keys to numbers to avoid TS type issues with Number constructor
      const decades = Object.keys(stats.birthsPerDecade).map((d: string) => Number(d)).sort((a: number, b: number) => a - b);
      if (decades.length === 0) return <div className="text-center text-gray-400 py-10">No date data available.</div>;
      
      const counts = Object.values(stats.birthsPerDecade) as number[];
      const maxVal = counts.length > 0 ? Math.max(...counts) : 0;
      
      return (
          <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700">
                  <h4 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-6 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-500"/> {t.birthsPerDecade}
                  </h4>
                  <div className="flex items-end gap-2 md:gap-4 h-64 w-full">
                      {decades.map(decade => {
                          const count = stats.birthsPerDecade[decade.toString()];
                          const heightPct = maxVal > 0 ? (count / maxVal) * 100 : 0;
                          return (
                              <div key={decade} className="flex-1 flex flex-col items-center gap-2 group">
                                  <div className="text-xs font-bold text-gray-600 dark:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity mb-1">{count}</div>
                                  <div 
                                    style={{ height: `${heightPct}%` }} 
                                    className="w-full bg-blue-100 dark:bg-blue-900/40 rounded-t-lg group-hover:bg-blue-500 dark:group-hover:bg-blue-500 transition-colors relative"
                                  >
                                      <div className="absolute inset-x-0 bottom-0 bg-blue-200 dark:bg-blue-800/50 h-1"></div>
                                  </div>
                                  <div className="text-[10px] text-gray-400 font-mono rotate-0 sm:rotate-0">{decade}s</div>
                              </div>
                          );
                      })}
                  </div>
              </div>
          </div>
      );
  };

  // Render Lists for Names/Geo
  const renderList = (title: string, data: {name: string, count: number}[], icon: React.ReactNode, colorClass: string, isMap: boolean = false) => {
      return (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
               <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex items-center gap-2">
                   {icon} <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">{title}</h4>
               </div>
               <div className="divide-y divide-gray-50 dark:divide-gray-700">
                   {data.length === 0 ? (
                       <div className="p-4 text-center text-xs text-gray-400 italic">No data</div>
                   ) : (
                       data.map((item, i) => (
                           <div key={i} className="flex items-center justify-between p-3 px-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                               <div className="flex items-center gap-3">
                                   <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${colorClass}`}>
                                       {i + 1}
                                   </div>
                                   {isMap ? (
                                       <a 
                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.name)}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                        title={t.viewOnMap}
                                       >
                                           {item.name} <ExternalLink className="w-3 h-3"/>
                                       </a>
                                   ) : (
                                       <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.name}</span>
                                   )}
                               </div>
                               <span className="text-xs font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">{item.count}</span>
                           </div>
                       ))
                   )}
               </div>
          </div>
      );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-800">
         
         {/* Header */}
         <div className="flex items-center justify-between p-4 px-6 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                    <Activity className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t.familyStatistics}</h3>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-500" />
            </button>
         </div>

         {/* Tabs */}
         <div className="flex gap-1 p-2 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
             {[
                 { id: 'overview', label: t.overview, icon: <PieChart className="w-4 h-4"/> },
                 { id: 'timeline', label: t.timeline, icon: <BarChart3 className="w-4 h-4"/> },
                 { id: 'geo', label: t.geography, icon: <MapPin className="w-4 h-4"/> },
                 { id: 'names', label: t.names, icon: <Baby className="w-4 h-4"/> },
             ].map(tab => (
                 <button 
                    key={tab.id} 
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                        activeTab === tab.id 
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300' 
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                 >
                     {tab.icon} {tab.label}
                 </button>
             ))}
         </div>

         {/* Content */}
         <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
             
             {activeTab === 'overview' && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <StatCard 
                        icon={<Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
                        color="bg-blue-50 dark:bg-blue-900/20"
                        title={t.totalMembers}
                        value={stats.totalMembers}
                        subtext={`${stats.livingMembers} ${t.living} • ${stats.deceasedMembers} ${t.deceased}`}
                     />
                     <StatCard 
                        icon={<Clock className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />}
                        color="bg-emerald-50 dark:bg-emerald-900/20"
                        title={t.averageLifespan}
                        value={`${stats.averageLifespan} ${t.years}`}
                        subtext={`Calculated from ${stats.deceasedMembers} records`}
                     />

                     {/* Gender Chart */}
                     <div className="col-span-1 md:col-span-2 bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <h4 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-4">{t.genderRatio}</h4>
                        <div className="flex h-6 rounded-full overflow-hidden mb-2">
                            <div style={{ width: `${(stats.maleCount / stats.totalMembers) * 100}%` }} className="bg-blue-500 flex items-center justify-center text-[10px] text-white font-bold">{Math.round((stats.maleCount / stats.totalMembers) * 100)}%</div>
                            <div style={{ width: `${(stats.femaleCount / stats.totalMembers) * 100}%` }} className="bg-pink-500 flex items-center justify-center text-[10px] text-white font-bold">{Math.round((stats.femaleCount / stats.totalMembers) * 100)}%</div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 font-medium mt-2">
                            <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div> {stats.maleCount} {t.male}</span>
                            <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-pink-500"></div> {stats.femaleCount} {t.female}</span>
                        </div>
                     </div>

                     {stats.oldestPerson && (
                         <StatCard 
                            icon={<Trophy className="w-6 h-6 text-amber-600 dark:text-amber-400" />}
                            color="bg-amber-50 dark:bg-amber-900/20"
                            title={t.oldestMember}
                            value={stats.oldestPerson.age}
                            subtext={stats.oldestPerson.name}
                         />
                     )}
                     {stats.mostChildren && (
                         <StatCard 
                            icon={<Baby className="w-6 h-6 text-purple-600 dark:text-purple-400" />}
                            color="bg-purple-50 dark:bg-purple-900/20"
                            title={t.mostChildren}
                            value={stats.mostChildren.count}
                            subtext={stats.mostChildren.name}
                         />
                     )}
                 </div>
             )}

             {activeTab === 'timeline' && renderTimeline()}

             {activeTab === 'geo' && (
                 <div className="grid grid-cols-1 gap-4">
                     {renderList(t.topPlaces, stats.topPlaces, <MapPin className="w-4 h-4 text-red-500"/>, "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300", true)}
                 </div>
             )}

             {activeTab === 'names' && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {renderList(t.maleNames, stats.topMaleNames, <Baby className="w-4 h-4 text-blue-500"/>, "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300")}
                     {renderList(t.femaleNames, stats.topFemaleNames, <Baby className="w-4 h-4 text-pink-500"/>, "bg-pink-100 text-pink-600 dark:bg-pink-900 dark:text-pink-300")}
                 </div>
             )}

         </div>
      </div>
    </div>
  );
};
