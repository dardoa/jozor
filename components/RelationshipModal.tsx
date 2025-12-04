import React, { useState, useEffect } from 'react';
import { Person, Language } from '../types';
import { getTranslation } from '../utils/translations';
import { X, Calculator, ArrowRight, User } from 'lucide-react';
import { calculateRelationship } from '../utils/relationshipLogic';
import { useTranslation } from '../context/TranslationContext'; // Import useTranslation

interface RelationshipModalProps {
  isOpen: boolean;
  onClose: () => void;
  people: Record<string, Person>;
  language: Language;
}

export const RelationshipModal: React.FC<RelationshipModalProps> = ({
  isOpen,
  onClose,
  people,
  language
}) => {
  const { t } = useTranslation(); // Use useTranslation hook directly
  const [person1Id, setPerson1Id] = useState<string>('');
  const [person2Id, setPerson2Id] = useState<string>('');
  const [result, setResult] = useState<{ text: string, commonAncestor?: string } | null>(null);
  
  // Removed t = getTranslation(language);
  const peopleList = (Object.values(people) as Person[]).sort((a, b) => a.firstName.localeCompare(b.firstName));

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
        setResult(null);
        setPerson1Id('');
        setPerson2Id('');
    }
  }, [isOpen]);

  const handleCalculate = () => {
      if (!person1Id || !person2Id) return;
      const res = calculateRelationship(person1Id, person2Id, people, language);
      setResult(res);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col border border-stone-200 dark:border-stone-700">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900/50">
          <div className="flex items-center gap-2">
             <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                 <Calculator className="w-5 h-5" />
             </div>
             <h3 className="text-lg font-bold text-stone-800 dark:text-white">{t.calculateRelationship}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-full transition-colors text-stone-400 hover:text-stone-600 dark:hover:text-stone-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
            <p className="text-sm text-stone-500 dark:text-stone-400">{t.selectTwoPeople}</p>

            <div className="space-y-4">
                {/* Person 1 */}
                <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-500 uppercase">{t.person1}</label>
                    <select 
                        value={person1Id}
                        onChange={(e) => setPerson1Id(e.target.value)}
                        className="w-full p-2.5 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-stone-800 dark:text-stone-200"
                    >
                        <option value="">-- Select --</option>
                        {peopleList.map(p => (
                            <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
                        ))}
                    </select>
                </div>

                {/* Person 2 */}
                <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-500 uppercase">{t.person2}</label>
                    <select 
                        value={person2Id}
                        onChange={(e) => setPerson2Id(e.target.value)}
                        className="w-full p-2.5 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-stone-800 dark:text-stone-200"
                    >
                        <option value="">-- Select --</option>
                        {peopleList.map(p => (
                            <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
                        ))}
                    </select>
                </div>

                <button 
                    onClick={handleCalculate}
                    disabled={!person1Id || !person2Id}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-stone-300 dark:disabled:bg-stone-700 text-white rounded-lg font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 mt-2"
                >
                    <Calculator className="w-4 h-4" />
                    {t.calculate}
                </button>
            </div>

            {/* Result */}
            {result && (
                <div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl animate-in zoom-in-95 duration-200">
                    <div className="flex flex-col items-center text-center gap-2">
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">{t.relationshipIs}</span>
                        <span className="text-xl font-bold text-stone-900 dark:text-white">{result.text}</span>
                        
                        {result.commonAncestor && people[result.commonAncestor] && (
                            <div className="mt-2 flex items-center gap-2 text-sm text-stone-600 dark:text-stone-400 bg-white dark:bg-stone-800 px-3 py-1.5 rounded-full shadow-sm border border-stone-100 dark:border-stone-700">
                                <span className="text-[10px] text-stone-400 uppercase">{t.commonAncestor}:</span>
                                <span className="font-semibold flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {people[result.commonAncestor].firstName} {people[result.commonAncestor].lastName}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}

        </div>
      </div>
    </div>
  );
};