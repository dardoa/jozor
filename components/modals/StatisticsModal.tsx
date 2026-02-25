import { memo, useMemo } from 'react';
import { X, Users, MapPin, Calendar, TrendingUp } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import {
    calculateGenderSplit,
    getTopLocations,
    getUpcomingBirthdays,
    getAgeDistribution,
} from '../../utils/statisticsUtils';
import { useTranslation } from '../../context/TranslationContext';

interface StatisticsModalProps {
    onClose: () => void;
}

export const StatisticsModal = memo(({ onClose }: StatisticsModalProps) => {
    const { t } = useTranslation();
    const people = useAppStore((state) => state.people);

    const stats = useMemo(() => {
        const genderSplit = calculateGenderSplit(people);
        const topLocations = getTopLocations(people, 5);
        const upcomingBirthdays = getUpcomingBirthdays(people, 5);
        const ageDistribution = getAgeDistribution(people);

        const total = genderSplit.male + genderSplit.female + genderSplit.unknown;
        const malePercent = total > 0 ? Math.round((genderSplit.male / total) * 100) : 0;
        const femalePercent = total > 0 ? Math.round((genderSplit.female / total) * 100) : 0;
        const unknownPercent = total > 0 ? Math.round((genderSplit.unknown / total) * 100) : 0;

        return {
            genderSplit,
            malePercent,
            femalePercent,
            unknownPercent,
            total,
            topLocations,
            upcomingBirthdays,
            ageDistribution,
        };
    }, [people]);

    return (
        <div className='fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm'>
            <div className='relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[var(--card-bg)] rounded-2xl shadow-2xl border border-[var(--border-main)] m-4'>
                {/* Header */}
                <div className='sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-[var(--border-main)] bg-[var(--card-bg)]'>
                    <div className='flex items-center gap-3'>
                        <div className='p-2 bg-emerald-500/10 rounded-lg'>
                            <TrendingUp className='w-5 h-5 text-emerald-500' />
                        </div>
                        <h2 className='text-xl font-bold text-[var(--text-main)]'>
                            {t.familyStatistics || 'Family Statistics'}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className='p-2 hover:bg-[var(--theme-hover)] rounded-lg transition-colors'
                        aria-label='Close'
                    >
                        <X className='w-5 h-5 text-[var(--text-dim)]' />
                    </button>
                </div>

                {/* Content */}
                <div className='p-6 space-y-6'>
                    {/* Gender Split */}
                    <div className='bg-[var(--theme-bg)] rounded-xl p-5 border border-[var(--border-main)]'>
                        <div className='flex items-center gap-2 mb-4'>
                            <Users className='w-4 h-4 text-[var(--primary-600)]' />
                            <h3 className='font-semibold text-[var(--text-main)]'>Gender Distribution</h3>
                        </div>

                        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                            {/* Pie Chart Representation */}
                            <div className='flex items-center justify-center'>
                                <div className='relative w-48 h-48'>
                                    <svg viewBox='0 0 100 100' className='transform -rotate-90'>
                                        {/* Male */}
                                        <circle
                                            cx='50'
                                            cy='50'
                                            r='40'
                                            fill='none'
                                            stroke='#3b82f6'
                                            strokeWidth='20'
                                            strokeDasharray={`${stats.malePercent * 2.51} ${251 - stats.malePercent * 2.51}`}
                                        />
                                        {/* Female */}
                                        <circle
                                            cx='50'
                                            cy='50'
                                            r='40'
                                            fill='none'
                                            stroke='#ec4899'
                                            strokeWidth='20'
                                            strokeDasharray={`${stats.femalePercent * 2.51} ${251 - stats.femalePercent * 2.51}`}
                                            strokeDashoffset={-stats.malePercent * 2.51}
                                        />
                                        {/* Unknown */}
                                        {stats.unknownPercent > 0 && (
                                            <circle
                                                cx='50'
                                                cy='50'
                                                r='40'
                                                fill='none'
                                                stroke='#94a3b8'
                                                strokeWidth='20'
                                                strokeDasharray={`${stats.unknownPercent * 2.51} ${251 - stats.unknownPercent * 2.51}`}
                                                strokeDashoffset={-(stats.malePercent + stats.femalePercent) * 2.51}
                                            />
                                        )}
                                    </svg>
                                    <div className='absolute inset-0 flex items-center justify-center'>
                                        <div className='text-center'>
                                            <div className='text-2xl font-bold text-[var(--text-main)]'>{stats.total}</div>
                                            <div className='text-xs text-[var(--text-dim)]'>Total</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Legend */}
                            <div className='flex flex-col justify-center space-y-3'>
                                <div className='flex items-center justify-between'>
                                    <div className='flex items-center gap-2'>
                                        <div className='w-4 h-4 bg-blue-500 rounded'></div>
                                        <span className='text-sm text-[var(--text-main)]'>Male</span>
                                    </div>
                                    <span className='text-sm font-semibold text-[var(--text-main)]'>
                                        {stats.genderSplit.male} ({stats.malePercent}%)
                                    </span>
                                </div>
                                <div className='flex items-center justify-between'>
                                    <div className='flex items-center gap-2'>
                                        <div className='w-4 h-4 bg-pink-500 rounded'></div>
                                        <span className='text-sm text-[var(--text-main)]'>Female</span>
                                    </div>
                                    <span className='text-sm font-semibold text-[var(--text-main)]'>
                                        {stats.genderSplit.female} ({stats.femalePercent}%)
                                    </span>
                                </div>
                                {stats.genderSplit.unknown > 0 && (
                                    <div className='flex items-center justify-between'>
                                        <div className='flex items-center gap-2'>
                                            <div className='w-4 h-4 bg-slate-400 rounded'></div>
                                            <span className='text-sm text-[var(--text-main)]'>Unknown</span>
                                        </div>
                                        <span className='text-sm font-semibold text-[var(--text-main)]'>
                                            {stats.genderSplit.unknown} ({stats.unknownPercent}%)
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Top Locations */}
                    <div className='bg-[var(--theme-bg)] rounded-xl p-5 border border-[var(--border-main)]'>
                        <div className='flex items-center gap-2 mb-4'>
                            <MapPin className='w-4 h-4 text-green-600' />
                            <h3 className='font-semibold text-[var(--text-main)]'>Top Birth Locations</h3>
                        </div>
                        {stats.topLocations.length > 0 ? (
                            <div className='space-y-2'>
                                {stats.topLocations.map((loc, index) => (
                                    <div
                                        key={loc.location}
                                        className='flex items-center justify-between p-3 bg-[var(--card-bg)] rounded-lg'
                                    >
                                        <div className='flex items-center gap-3'>
                                            <div className='flex items-center justify-center w-6 h-6 bg-green-500/10 text-green-600 rounded-full text-xs font-bold'>
                                                {index + 1}
                                            </div>
                                            <span className='text-sm font-medium text-[var(--text-main)]'>{loc.location}</span>
                                        </div>
                                        <span className='text-sm font-semibold text-[var(--text-dim)]'>{loc.count} people</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className='text-sm text-[var(--text-dim)] italic'>No location data available</p>
                        )}
                    </div>

                    {/* Upcoming Birthdays */}
                    <div className='bg-[var(--theme-bg)] rounded-xl p-5 border border-[var(--border-main)]'>
                        <div className='flex items-center gap-2 mb-4'>
                            <Calendar className='w-4 h-4 text-amber-600' />
                            <h3 className='font-semibold text-[var(--text-main)]'>Upcoming Birthdays</h3>
                        </div>
                        {stats.upcomingBirthdays.length > 0 ? (
                            <div className='space-y-2'>
                                {stats.upcomingBirthdays.map((birthday) => (
                                    <div
                                        key={birthday.person.id}
                                        className='flex items-center justify-between p-3 bg-[var(--card-bg)] rounded-lg'
                                    >
                                        <div className='flex items-center gap-3'>
                                            {birthday.person.photoUrl && (
                                                <img
                                                    src={birthday.person.photoUrl}
                                                    alt={`${birthday.person.firstName} ${birthday.person.lastName}`}
                                                    className='w-8 h-8 rounded-full object-cover'
                                                />
                                            )}
                                            <div>
                                                <div className='text-sm font-medium text-[var(--text-main)]'>
                                                    {birthday.person.firstName} {birthday.person.lastName}
                                                </div>
                                                <div className='text-xs text-[var(--text-dim)]'>
                                                    {birthday.nextBirthday.toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                        <div className='text-right'>
                                            <div className='text-sm font-semibold text-amber-600'>
                                                {birthday.daysUntil === 0 ? 'Today!' : `${birthday.daysUntil} days`}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className='text-sm text-[var(--text-dim)] italic'>No upcoming birthdays</p>
                        )}
                    </div>

                    {/* Age Distribution */}
                    <div className='bg-[var(--theme-bg)] rounded-xl p-5 border border-[var(--border-main)]'>
                        <div className='flex items-center gap-2 mb-4'>
                            <TrendingUp className='w-4 h-4 text-purple-600' />
                            <h3 className='font-semibold text-[var(--text-main)]'>Age Distribution (Living)</h3>
                        </div>
                        <div className='space-y-3'>
                            {stats.ageDistribution.ranges.map((range) => {
                                const maxCount = Math.max(...stats.ageDistribution.ranges.map(r => r.count));
                                const widthPercent = maxCount > 0 ? (range.count / maxCount) * 100 : 0;

                                return (
                                    <div key={range.range} className='space-y-1'>
                                        <div className='flex items-center justify-between text-sm'>
                                            <span className='text-[var(--text-main)] font-medium'>{range.range} years</span>
                                            <span className='text-[var(--text-dim)]'>{range.count} people</span>
                                        </div>
                                        <div className='h-2 bg-[var(--card-bg)] rounded-full overflow-hidden'>
                                            <div
                                                className='h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all'
                                                style={{ width: `${widthPercent}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div className='pt-2 mt-2 border-t border-[var(--border-main)]'>
                                <span className='text-sm text-[var(--text-dim)]'>
                                    Average Age: <span className='font-semibold text-[var(--text-main)]'>{stats.ageDistribution.average} years</span>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});
