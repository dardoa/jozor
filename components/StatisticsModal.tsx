import { useMemo, useState, lazy, Suspense } from 'react';
import './StatisticsModal.css';
import { Person } from '../types';
import { calculateStatistics } from '../utils/statisticsLogic';
import { findDisconnectedPeople, findDateErrors, findMissingData } from '../utils/statisticsUtils';
import { useTreeSettings } from '../hooks/useTreeSettings';
import { formatDate } from '../utils/familyLogic';
import {
  X,
  Users,
  Activity,
  Clock,
  Trophy,
  MapPin,
  Calendar,
  PieChart,
  BarChart3,
  Baby,
  ExternalLink,
  Info,
  Cake,
  AlertTriangle,
  FileQuestion,
  ChevronRight,
  CheckCircle2,
  LayoutDashboard,
} from 'lucide-react';

import { useTranslation } from '../context/TranslationContext';
import { StatisticsSkeleton } from './statistics/StatisticsSkeleton';
import { StatsEngine } from '../services/StatsEngine';
import { DemographicChart } from './statistics/DemographicChart';

// Lazy Load the new Premium Dashboard
const StatisticsDashboard = lazy(() =>
  import('./statistics/StatisticsDashboard').then(m => ({ default: m.StatisticsDashboard }))
);

interface StatisticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  people: Record<string, Person>;
  language?: any;
  initialTab?: 'overview' | 'timeline' | 'geo' | 'names' | 'birthdays' | 'health';
  onNavigateToPerson?: (personId: string) => void;
}

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtext?: string;
  color: string;
}

const StatCard = ({ icon, title, value, subtext, color }: StatCardProps) => (
  <div className='bg-white dark:bg-stone-800 p-4 rounded-xl border border-stone-200 dark:border-stone-700 shadow-sm flex items-start gap-4'>
    <div className={`p-3 rounded-lg ${color}`}>{icon}</div>
    <div>
      <p className='text-xs font-bold text-stone-400 uppercase tracking-wider'>{title}</p>
      <h4 className='text-2xl font-bold text-stone-900 dark:text-white mt-0.5'>{value}</h4>
      {subtext && <p className='text-xs text-stone-500 dark:text-stone-400 mt-1'>{subtext}</p>}
    </div>
  </div>
);

export const StatisticsModal = ({ isOpen, onClose, people, initialTab = 'overview', onNavigateToPerson }: StatisticsModalProps) => {
  const { t } = useTranslation();
  const { treeSettings } = useTreeSettings();
  const stats = useMemo(() => calculateStatistics(people), [people]);
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'geo' | 'names' | 'birthdays' | 'health'>(initialTab);

  // Health Tab State
  const [healthSubTab, setHealthSubTab] = useState<'disconnected' | 'dates' | 'missing'>('disconnected');

  const diagnostics = useMemo(() => {
    const disconnected = findDisconnectedPeople(people);
    const dateErrors = findDateErrors(people);
    const missingData = findMissingData(people);

    const totalIssues = disconnected.length + dateErrors.length + missingData.length;
    const healthScore = Math.max(0, Math.round(100 - (totalIssues / Object.keys(people).length) * 100));

    return {
      disconnected,
      dateErrors,
      missingData,
      totalIssues,
      healthScore,
    };
  }, [people]);

  const handlePersonClick = (personId: string) => {
    if (onNavigateToPerson) {
      onNavigateToPerson(personId);
      onClose();
    }
  };

  if (!isOpen) return null;

  // Render Bar Chart for Decades
  const renderTimeline = () => {
    const dashboardStats = StatsEngine.calculate(people);

    if (dashboardStats.demographics.length === 0)
      return (
        <div className='text-center text-stone-400 py-10 flex flex-col items-center bg-black/40 rounded-xl'>
          <Info className='w-12 h-12 mx-auto mb-3 opacity-50' />
          {t.noDateData}
        </div>
      );

    return (
      <div className='space-y-6'>
        <div className='bg-black/40 backdrop-blur-xl p-8 rounded-2xl border border-white/10 shadow-2xl'>
          <h4 className='text-xs font-black text-white/50 uppercase tracking-[0.3em] mb-8 flex items-center gap-3'>
            <Calendar className='w-4 h-4 text-blue-500' /> {t.birthsPerDecade || 'Births by Decade'}
          </h4>
          <DemographicChart data={dashboardStats.demographics} />
        </div>
      </div>
    );
  };

  // Render Lists for Names/Geo
  const renderList = (
    title: string,
    data: { name: string; count: number }[],
    icon: React.ReactNode,
    colorClass: string,
    isMap: boolean = false
  ) => {
    return (
      <div className='bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 overflow-hidden'>
        <div className='p-4 border-b border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900/50 flex items-center gap-2'>
          {icon} <h4 className='text-sm font-bold text-stone-800 dark:text-stone-200'>{title}</h4>
        </div>
        <div className='divide-y divide-stone-50 dark:divide-stone-700'>
          {data.length === 0 ? (
            <div className='p-4 text-center text-xs text-stone-400 italic flex flex-col items-center'>
              <Info className='w-8 h-8 mx-auto mb-2 opacity-50' />
              {t.noData}
            </div>
          ) : (
            data.map((item, i) => (
              <div
                key={i}
                className='flex items-center justify-between p-3 px-4 hover:bg-stone-50 dark:hover:bg-stone-700/50'
              >
                <div className='flex items-center gap-3'>
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${colorClass}`}
                  >
                    {i + 1}
                  </div>
                  {isMap ? (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.name)}`}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1'
                      title={t.viewOnMap}
                    >
                      {item.name} <ExternalLink className='w-3 h-3' />
                    </a>
                  ) : (
                    <span className='text-sm font-medium text-stone-700 dark:text-stone-300'>
                      {item.name}
                    </span>
                  )}
                </div>
                <span className='text-xs font-bold text-stone-400 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded-full'>
                  {item.count}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  // Render Upcoming Birthdays
  const renderBirthdays = () => {
    if (stats.upcomingBirthdays.length === 0) {
      return (
        <div className='text-center text-stone-400 py-10 flex flex-col items-center'>
          <Cake className='w-12 h-12 mx-auto mb-3 opacity-50' />
          {t.noUpcomingBirthdays || 'No upcoming birthdays found'}
        </div>
      );
    }

    return (
      <div className='bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 overflow-hidden'>
        <div className='p-4 border-b border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900/50 flex items-center gap-2'>
          <Cake className='w-4 h-4 text-pink-500' />
          <h4 className='text-sm font-bold text-stone-800 dark:text-stone-200'>{t.upcomingBirthdays || 'Upcoming Birthdays'}</h4>
        </div>
        <div className='divide-y divide-stone-50 dark:divide-stone-700'>
          {stats.upcomingBirthdays.map((birthday) => (
            <div
              key={birthday.person.id}
              className='flex items-center justify-between p-3 px-4 hover:bg-stone-50 dark:hover:bg-stone-700/50'
            >
              <div className='flex items-center gap-3'>
                {birthday.person.photoUrl ? (
                  <img
                    src={birthday.person.photoUrl}
                    alt={`${birthday.person.firstName} ${birthday.person.lastName}`}
                    className='w-10 h-10 rounded-full object-cover border border-stone-200 dark:border-stone-600'
                  />
                ) : (
                  <div className='w-10 h-10 rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center text-xs font-bold text-stone-500'>
                    {(birthday.person.firstName?.[0] || '') + (birthday.person.lastName?.[0] || '')}
                  </div>
                )}
                <div>
                  <div className='text-sm font-medium text-stone-700 dark:text-stone-300'>
                    {birthday.person.firstName} {birthday.person.lastName}
                  </div>
                  <div className='text-xs text-stone-500 dark:text-stone-400'>
                    Turns {birthday.ageTurning} on {formatDate(birthday.nextBirthday.toISOString(), treeSettings.dateFormat)}
                  </div>
                </div>
              </div>
              <div className='text-xs font-bold text-pink-500 bg-pink-50 dark:bg-pink-900/20 px-2.5 py-1 rounded-full whitespace-nowrap'>
                {birthday.daysUntil === 0 ? 'Today!' : `${birthday.daysUntil} days`}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200'>
      <div className='bg-stone-50 dark:bg-stone-900 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col border border-stone-200 dark:border-stone-800'>
        {/* Header */}
        <div className='flex items-center justify-between p-4 px-6 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900'>
          <div className='flex items-center gap-3'>
            <div className='p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400'>
              <Activity className='w-5 h-5' />
            </div>
            <h3 className='text-xl font-bold text-stone-900 dark:text-white'>
              {t.analyticsDashboard || 'Analytics Dashboard'}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label={t.close || 'Close'}
            className='p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition-colors'
          >
            <X className='w-5 h-5 text-stone-500' />
          </button>
        </div>

        {/* Tabs */}
        <div className='flex gap-1 p-2 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 overflow-x-auto'>
          {[
            { id: 'overview', label: t.overview, icon: <PieChart className='w-4 h-4' /> },
            { id: 'timeline', label: t.timelineTab, icon: <BarChart3 className='w-4 h-4' /> },
            { id: 'geo', label: t.geography, icon: <MapPin className='w-4 h-4' /> },
            { id: 'names', label: t.names, icon: <Baby className='w-4 h-4' /> },
            { id: 'birthdays', label: t.birthdays || 'Birthdays', icon: <Cake className='w-4 h-4' /> },
            { id: 'health', label: t.health || 'Health', icon: <AlertTriangle className='w-4 h-4' /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id
                ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300'
                : 'text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className='flex-1 overflow-y-auto p-0 scrollbar-thin bg-black/90'>
          {activeTab === 'overview' && (
            <Suspense fallback={<StatisticsSkeleton />}>
              <StatisticsDashboard people={people} onClose={onClose} />
            </Suspense>
          )}

          {activeTab === 'timeline' && renderTimeline()}

          {activeTab === 'geo' && (
            <div className='grid grid-cols-1 gap-4'>
              {renderList(
                t.topPlaces,
                stats.topPlaces,
                <MapPin className='w-4 h-4 text-red-500' />,
                'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300',
                true
              )}
            </div>
          )}

          {activeTab === 'names' && (
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              {renderList(
                t.maleNames,
                stats.topMaleNames,
                <Baby className='w-4 h-4 text-blue-500' />,
                'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
              )}
              {renderList(
                t.femaleNames,
                stats.topFemaleNames,
                <Baby className='w-4 h-4 text-pink-500' />,
                'bg-pink-100 text-pink-600 dark:bg-pink-900 dark:text-pink-300'
              )}
            </div>
          )}

          {activeTab === 'birthdays' && renderBirthdays()}

          {activeTab === 'health' && (
            <div className='space-y-6'>
              {/* Health Overview Cards */}
              <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                <button
                  onClick={() => setHealthSubTab('disconnected')}
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${healthSubTab === 'disconnected'
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/10'
                    : 'border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800'
                    }`}
                >
                  <Users className='w-6 h-6 text-orange-500' />
                  <div className='text-2xl font-bold text-stone-900 dark:text-white'>{diagnostics.disconnected.length}</div>
                  <div className='text-xs text-stone-500 dark:text-stone-400 font-medium'>Disconnected</div>
                </button>

                <button
                  onClick={() => setHealthSubTab('dates')}
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${healthSubTab === 'dates'
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/10'
                    : 'border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800'
                    }`}
                >
                  <Calendar className='w-6 h-6 text-red-500' />
                  <div className='text-2xl font-bold text-stone-900 dark:text-white'>{diagnostics.dateErrors.length}</div>
                  <div className='text-xs text-stone-500 dark:text-stone-400 font-medium'>Date Errors</div>
                </button>

                <button
                  onClick={() => setHealthSubTab('missing')}
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${healthSubTab === 'missing'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10'
                    : 'border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800'
                    }`}
                >
                  <FileQuestion className='w-6 h-6 text-blue-500' />
                  <div className='text-2xl font-bold text-stone-900 dark:text-white'>{diagnostics.missingData.length}</div>
                  <div className='text-xs text-stone-500 dark:text-stone-400 font-medium'>Missing Data</div>
                </button>
              </div>

              {/* Health Detail Content */}
              <div className='bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 overflow-hidden'>
                <div className='p-4 border-b border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900/50'>
                  {healthSubTab === 'disconnected' && (
                    <div className='flex items-center gap-2'>
                      <Users className='w-4 h-4 text-orange-500' />
                      <h4 className='font-bold text-stone-800 dark:text-stone-200'>Disconnected People</h4>
                      <span className='text-xs text-stone-500 dark:text-stone-400 ml-auto'>(No parents, spouses, or children)</span>
                    </div>
                  )}
                  {healthSubTab === 'dates' && (
                    <div className='flex items-center gap-2'>
                      <Calendar className='w-4 h-4 text-red-500' />
                      <h4 className='font-bold text-stone-800 dark:text-stone-200'>Date Logic Errors</h4>
                    </div>
                  )}
                  {healthSubTab === 'missing' && (
                    <div className='flex items-center gap-2'>
                      <FileQuestion className='w-4 h-4 text-blue-500' />
                      <h4 className='font-bold text-stone-800 dark:text-stone-200'>Missing Information</h4>
                    </div>
                  )}
                </div>

                <div className='divide-y divide-stone-50 dark:divide-stone-700 max-h-[400px] overflow-y-auto'>
                  {healthSubTab === 'disconnected' && (
                    diagnostics.disconnected.length > 0 ? (
                      diagnostics.disconnected.map((person) => (
                        <button
                          key={person.id}
                          onClick={() => handlePersonClick(person.id)}
                          className='w-full flex items-center justify-between p-3 px-4 hover:bg-stone-50 dark:hover:bg-stone-700/50 group text-left'
                        >
                          <div className='flex items-center gap-3'>
                            {person.photoUrl && (
                              <img src={person.photoUrl} alt={person.firstName} className='w-8 h-8 rounded-full object-cover' />
                            )}
                            <div>
                              <div className='text-sm font-medium text-stone-700 dark:text-stone-300'>{person.firstName} {person.lastName}</div>
                              {person.birthDate && <div className='text-xs text-stone-500'>{formatDate(person.birthDate)}</div>}
                            </div>
                          </div>
                          <ChevronRight className='w-4 h-4 text-stone-300 group-hover:text-blue-500' />
                        </button>
                      ))
                    ) : (
                      <div className='p-8 text-center text-stone-400 flex flex-col items-center'>
                        <CheckCircle2 className='w-12 h-12 text-green-500 mb-2 opacity-80' />
                        <p>All people are connected!</p>
                      </div>
                    )
                  )}

                  {healthSubTab === 'dates' && (
                    diagnostics.dateErrors.length > 0 ? (
                      diagnostics.dateErrors.map((item, i) => (
                        <button
                          key={`${item.person.id}-${i}`}
                          onClick={() => handlePersonClick(item.person.id)}
                          className='w-full flex items-center justify-between p-3 px-4 hover:bg-stone-50 dark:hover:bg-stone-700/50 group text-left'
                        >
                          <div className='flex items-center gap-3'>
                            {item.person.photoUrl && (
                              <img src={item.person.photoUrl} alt={item.person.firstName} className='w-8 h-8 rounded-full object-cover' />
                            )}
                            <div>
                              <div className='text-sm font-medium text-stone-700 dark:text-stone-300'>{item.person.firstName} {item.person.lastName}</div>
                              <div className='text-xs text-red-500 mt-0.5'>{item.error}</div>
                            </div>
                          </div>
                          <ChevronRight className='w-4 h-4 text-stone-300 group-hover:text-blue-500' />
                        </button>
                      ))
                    ) : (
                      <div className='p-8 text-center text-stone-400 flex flex-col items-center'>
                        <CheckCircle2 className='w-12 h-12 text-green-500 mb-2 opacity-80' />
                        <p>No date errors found!</p>
                      </div>
                    )
                  )}

                  {healthSubTab === 'missing' && (
                    diagnostics.missingData.length > 0 ? (
                      diagnostics.missingData.map((item) => (
                        <button
                          key={item.person.id}
                          onClick={() => handlePersonClick(item.person.id)}
                          className='w-full flex items-center justify-between p-3 px-4 hover:bg-stone-50 dark:hover:bg-stone-700/50 group text-left'
                        >
                          <div className='flex items-center gap-3'>
                            {item.person.photoUrl && (
                              <img src={item.person.photoUrl} alt={item.person.firstName} className='w-8 h-8 rounded-full object-cover' />
                            )}
                            <div>
                              <div className='text-sm font-medium text-stone-700 dark:text-stone-300'>{item.person.firstName} {item.person.lastName}</div>
                              <div className='flex gap-1 mt-1 flex-wrap'>
                                {item.missing.map(m => (
                                  <span key={m} className='text-[10px] bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded'>{m}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                          <ChevronRight className='w-4 h-4 text-stone-300 group-hover:text-blue-500' />
                        </button>
                      ))
                    ) : (
                      <div className='p-8 text-center text-stone-400 flex flex-col items-center'>
                        <CheckCircle2 className='w-12 h-12 text-green-500 mb-2 opacity-80' />
                        <p>All data is complete!</p>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
