import { memo, useMemo, useState } from 'react';
import { X, AlertTriangle, Users, Calendar, FileQuestion, ChevronRight } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import {
    findDisconnectedPeople,
    findDateErrors,
    findMissingData,
} from '../../utils/statisticsUtils';
import { useTranslation } from '../../context/TranslationContext';
import { Person } from '../../types';

interface TreeHealthModalProps {
    onClose: () => void;
    onNavigateToPerson?: (personId: string) => void;
}

export const TreeHealthModal = memo(({ onClose, onNavigateToPerson }: TreeHealthModalProps) => {
    const { t } = useTranslation();
    const people = useAppStore((state) => state.people);
    const [selectedTab, setSelectedTab] = useState<'disconnected' | 'dates' | 'missing'>('disconnected');

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

    return (
        <div className='fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm'>
            <div className='relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[var(--card-bg)] rounded-2xl shadow-2xl border border-[var(--border-main)] m-4'>
                {/* Header */}
                <div className='sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-[var(--border-main)] bg-[var(--card-bg)]'>
                    <div className='flex items-center gap-3'>
                        <div className={`p-2 rounded-lg ${diagnostics.healthScore >= 80 ? 'bg-green-500/10' :
                            diagnostics.healthScore >= 50 ? 'bg-amber-500/10' :
                                'bg-red-500/10'
                            }`}>
                            <AlertTriangle className={`w-5 h-5 ${diagnostics.healthScore >= 80 ? 'text-green-500' :
                                diagnostics.healthScore >= 50 ? 'text-amber-500' :
                                    'text-red-500'
                                }`} />
                        </div>
                        <div>
                            <h2 className='text-xl font-bold text-[var(--text-main)]'>
                                {t.consistencyChecker || 'Tree Health Check'}
                            </h2>
                            <p className='text-sm text-[var(--text-dim)]'>
                                Health Score: <span className={`font-semibold ${diagnostics.healthScore >= 80 ? 'text-green-500' :
                                    diagnostics.healthScore >= 50 ? 'text-amber-500' :
                                        'text-red-500'
                                    }`}>{diagnostics.healthScore}%</span>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className='p-2 hover:bg-[var(--theme-hover)] rounded-lg transition-colors'
                        aria-label='Close'
                    >
                        <X className='w-5 h-5 text-[var(--text-dim)]' />
                    </button>
                </div>

                {/* Summary Cards */}
                <div className='grid grid-cols-3 gap-4 p-6 border-b border-[var(--border-main)]'>
                    <button
                        onClick={() => setSelectedTab('disconnected')}
                        className={`p-4 rounded-xl border-2 transition-all ${selectedTab === 'disconnected'
                            ? 'border-orange-500 bg-orange-500/5'
                            : 'border-[var(--border-main)] hover:bg-[var(--theme-hover)]'
                            }`}
                    >
                        <Users className='w-5 h-5 text-orange-500 mb-2' />
                        <div className='text-2xl font-bold text-[var(--text-main)]'>{diagnostics.disconnected.length}</div>
                        <div className='text-xs text-[var(--text-dim)]'>Disconnected</div>
                    </button>

                    <button
                        onClick={() => setSelectedTab('dates')}
                        className={`p-4 rounded-xl border-2 transition-all ${selectedTab === 'dates'
                            ? 'border-red-500 bg-red-500/5'
                            : 'border-[var(--border-main)] hover:bg-[var(--theme-hover)]'
                            }`}
                    >
                        <Calendar className='w-5 h-5 text-red-500 mb-2' />
                        <div className='text-2xl font-bold text-[var(--text-main)]'>{diagnostics.dateErrors.length}</div>
                        <div className='text-xs text-[var(--text-dim)]'>Date Errors</div>
                    </button>

                    <button
                        onClick={() => setSelectedTab('missing')}
                        className={`p-4 rounded-xl border-2 transition-all ${selectedTab === 'missing'
                            ? 'border-blue-500 bg-blue-500/5'
                            : 'border-[var(--border-main)] hover:bg-[var(--theme-hover)]'
                            }`}
                    >
                        <FileQuestion className='w-5 h-5 text-blue-500 mb-2' />
                        <div className='text-2xl font-bold text-[var(--text-main)]'>{diagnostics.missingData.length}</div>
                        <div className='text-xs text-[var(--text-dim)]'>Missing Data</div>
                    </button>
                </div>

                {/* Content */}
                <div className='p-6'>
                    {/* Disconnected People */}
                    {selectedTab === 'disconnected' && (
                        <div className='space-y-3'>
                            <div className='flex items-center gap-2 mb-4'>
                                <Users className='w-4 h-4 text-orange-500' />
                                <h3 className='font-semibold text-[var(--text-main)]'>Disconnected People</h3>
                                <span className='text-xs text-[var(--text-dim)]'>
                                    (No parents, spouses, or children)
                                </span>
                            </div>
                            {diagnostics.disconnected.length > 0 ? (
                                diagnostics.disconnected.map((person) => (
                                    <button
                                        key={person.id}
                                        onClick={() => handlePersonClick(person.id)}
                                        className='w-full flex items-center justify-between p-4 bg-[var(--theme-bg)] rounded-lg hover:bg-[var(--theme-hover)] transition-colors group'
                                    >
                                        <div className='flex items-center gap-3'>
                                            {person.photoUrl && (
                                                <img
                                                    src={person.photoUrl}
                                                    alt={`${person.firstName} ${person.lastName}`}
                                                    className='w-10 h-10 rounded-full object-cover'
                                                />
                                            )}
                                            <div className='text-left'>
                                                <div className='text-sm font-medium text-[var(--text-main)]'>{person.firstName} {person.lastName}</div>
                                                {person.birthDate && (
                                                    <div className='text-xs text-[var(--text-dim)]'>
                                                        Born: {new Date(person.birthDate).toLocaleDateString()}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <ChevronRight className='w-4 h-4 text-[var(--text-dim)] group-hover:text-[var(--primary-600)]' />
                                    </button>
                                ))
                            ) : (
                                <div className='text-center py-8'>
                                    <div className='text-green-500 text-4xl mb-2'>✓</div>
                                    <p className='text-sm text-[var(--text-dim)]'>All people are connected!</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Date Errors */}
                    {selectedTab === 'dates' && (
                        <div className='space-y-3'>
                            <div className='flex items-center gap-2 mb-4'>
                                <Calendar className='w-4 h-4 text-red-500' />
                                <h3 className='font-semibold text-[var(--text-main)]'>Date Logic Errors</h3>
                            </div>
                            {diagnostics.dateErrors.length > 0 ? (
                                diagnostics.dateErrors.map((item, index) => (
                                    <button
                                        key={`${item.person.id}-${index}`}
                                        onClick={() => handlePersonClick(item.person.id)}
                                        className='w-full flex items-center justify-between p-4 bg-[var(--theme-bg)] rounded-lg hover:bg-[var(--theme-hover)] transition-colors group'
                                    >
                                        <div className='flex items-center gap-3 flex-1'>
                                            {item.person.photoUrl && (
                                                <img
                                                    src={item.person.photoUrl}
                                                    alt={`${item.person.firstName} ${item.person.lastName}`}
                                                    className='w-10 h-10 rounded-full object-cover'
                                                />
                                            )}
                                            <div className='text-left flex-1'>
                                                <div className='text-sm font-medium text-[var(--text-main)]'>{item.person.firstName} {item.person.lastName}</div>
                                                <div className='text-xs text-red-500 mt-1'>{item.error}</div>
                                            </div>
                                        </div>
                                        <ChevronRight className='w-4 h-4 text-[var(--text-dim)] group-hover:text-[var(--primary-600)]' />
                                    </button>
                                ))
                            ) : (
                                <div className='text-center py-8'>
                                    <div className='text-green-500 text-4xl mb-2'>✓</div>
                                    <p className='text-sm text-[var(--text-dim)]'>No date errors found!</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Missing Data */}
                    {selectedTab === 'missing' && (
                        <div className='space-y-3'>
                            <div className='flex items-center gap-2 mb-4'>
                                <FileQuestion className='w-4 h-4 text-blue-500' />
                                <h3 className='font-semibold text-[var(--text-main)]'>Missing Information</h3>
                            </div>
                            {diagnostics.missingData.length > 0 ? (
                                diagnostics.missingData.map((item) => (
                                    <button
                                        key={item.person.id}
                                        onClick={() => handlePersonClick(item.person.id)}
                                        className='w-full flex items-center justify-between p-4 bg-[var(--theme-bg)] rounded-lg hover:bg-[var(--theme-hover)] transition-colors group'
                                    >
                                        <div className='flex items-center gap-3 flex-1'>
                                            {item.person.photoUrl && (
                                                <img
                                                    src={item.person.photoUrl}
                                                    alt={`${item.person.firstName} ${item.person.lastName}`}
                                                    className='w-10 h-10 rounded-full object-cover'
                                                />
                                            )}
                                            <div className='text-left flex-1'>
                                                <div className='text-sm font-medium text-[var(--text-main)]'>
                                                    {item.person.firstName || item.person.lastName ? `${item.person.firstName} ${item.person.lastName}` : 'Unnamed Person'}
                                                </div>
                                                <div className='flex gap-2 mt-1'>
                                                    {item.missing.map((field) => (
                                                        <span
                                                            key={field}
                                                            className='text-xs px-2 py-0.5 bg-blue-500/10 text-blue-600 rounded'
                                                        >
                                                            Missing: {field}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <ChevronRight className='w-4 h-4 text-[var(--text-dim)] group-hover:text-[var(--primary-600)]' />
                                    </button>
                                ))
                            ) : (
                                <div className='text-center py-8'>
                                    <div className='text-green-500 text-4xl mb-2'>✓</div>
                                    <p className='text-sm text-[var(--text-dim)]'>All data is complete!</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});
