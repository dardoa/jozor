import React, { useMemo } from 'react';
import { Person, Language } from '../types';
import { checkConsistency, ConsistencyIssue } from '../utils/consistencyLogic';
import { getTranslation } from '../utils/translations';
import { X, AlertTriangle, CheckCircle, ExternalLink, ShieldCheck } from 'lucide-react';
import { useTranslation } from '../context/TranslationContext'; // Import useTranslation

interface ConsistencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  people: Record<string, Person>;
  onSelectPerson: (id: string) => void;
  language: Language;
}

export const ConsistencyModal: React.FC<ConsistencyModalProps> = ({ 
    isOpen, onClose, people, onSelectPerson, language 
}) => {
  const { t } = useTranslation(); // Use useTranslation hook directly
  // Removed t = getTranslation(language);
  const issues = useMemo(() => isOpen ? checkConsistency(people) : [], [isOpen, people]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-800 rounded-xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[80vh] border border-stone-200 dark:border-stone-700">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900/50">
          <div className="flex items-center gap-2">
             <div className="p-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-orange-600 dark:text-orange-400">
                 <ShieldCheck className="w-5 h-5" />
             </div>
             <h3 className="text-lg font-bold text-stone-800 dark:text-white">{t.checkIssues}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-full transition-colors text-stone-400 hover:text-stone-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-stone-50 dark:bg-stone-900">
            {issues.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle className="w-8 h-8" />
                    </div>
                    <h4 className="text-lg font-bold text-stone-800 dark:text-stone-100">{t.noIssuesFound}</h4>
                    <p className="text-sm text-stone-500 mt-1">Your tree data looks logically consistent.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-4 px-1">
                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                        <span className="font-bold text-sm text-stone-700 dark:text-stone-300">{issues.length} {t.issuesFound}</span>
                    </div>

                    {issues.map((issue) => {
                        const person = people[issue.personId];
                        const related = issue.relatedPersonId ? people[issue.relatedPersonId] : null;

                        return (
                            <div key={issue.id} className="bg-white dark:bg-stone-800 p-4 rounded-xl border border-stone-200 dark:border-stone-700 shadow-sm flex gap-4">
                                <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${issue.severity === 'error' ? 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400'}`}>
                                    <AlertTriangle className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h5 className="font-bold text-sm text-stone-800 dark:text-stone-200">
                                        {t.types[issue.type] || issue.type}
                                    </h5>
                                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 mb-2">
                                        {issue.details}
                                    </p>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <button 
                                            onClick={() => { onSelectPerson(issue.personId); onClose(); }}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-stone-100 dark:bg-stone-700 text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-stone-600 transition-colors"
                                        >
                                            <ExternalLink className="w-3 h-3" />
                                            {person?.firstName} {person?.lastName}
                                        </button>
                                        {related && (
                                            <>
                                                <span className="text-xs text-stone-400">&</span>
                                                <button 
                                                    onClick={() => { onSelectPerson(related.id); onClose(); }}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-stone-100 dark:bg-stone-700 text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-stone-600 transition-colors"
                                                >
                                                    <ExternalLink className="w-3 h-3" />
                                                    {related.firstName} {related.lastName}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};