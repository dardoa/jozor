import React, { useState } from 'react';
import { Person, Gender, Language } from '../types';
import { getTranslation } from '../utils/translations';
import { X, UserPlus, Search, User } from 'lucide-react';

interface LinkPersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateNew: () => void;
  onSelectExisting: (id: string) => void;
  people: Record<string, Person>;
  type: 'parent' | 'spouse' | 'child' | null;
  gender: Gender | null;
  currentPersonId: string;
  language: Language;
}

export const LinkPersonModal: React.FC<LinkPersonModalProps> = ({
  isOpen,
  onClose,
  onCreateNew,
  onSelectExisting,
  people,
  type,
  gender,
  currentPersonId,
  language
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const t = getTranslation(language);

  if (!isOpen) return null;

  const typeLabel = type === 'parent' ? (gender === 'male' ? t.addFather : t.addMother) :
                   type === 'spouse' ? (gender === 'male' ? t.addHusband : t.addWife) :
                   type === 'child' ? (gender === 'male' ? t.addSon : t.addDaughter) : t.add;

  // Filter candidates
  const candidates = (Object.values(people) as Person[]).filter(p => {
    // Cannot link to self
    if (p.id === currentPersonId) return false;
    // Gender filter if specified
    if (gender && p.gender !== gender) return false;
    
    // Basic search
    const fullName = `${p.firstName} ${p.middleName} ${p.lastName}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200 border border-stone-200 dark:border-stone-700">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900/50">
          <div>
             <h3 className="text-lg font-bold text-stone-800 dark:text-white">{t.add} {typeLabel}</h3>
             <p className="text-sm text-stone-500 dark:text-stone-400">{t.howToAdd}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-full transition-colors text-stone-400 hover:text-stone-600 dark:hover:text-stone-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto bg-white dark:bg-stone-800">
          
          {/* Option 1: New Person */}
          <div className="bg-white dark:bg-stone-800 pt-5 p-3 rounded-xl border border-stone-200 dark:border-stone-700 shadow-sm space-y-2 relative">
              <h3 className="absolute top-[-12px] start-3 z-10 bg-white dark:bg-stone-800 px-2 text-[9px] font-bold text-stone-400 uppercase tracking-wider">{t.createNewProfile}</h3>
              <button 
                onClick={onCreateNew}
                className="w-full flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:border-blue-200 dark:hover:border-blue-700 transition-all group text-start"
              >
                <div className="w-10 h-10 bg-white dark:bg-blue-800 rounded-full flex items-center justify-center shadow-sm text-blue-600 dark:text-blue-200 group-hover:scale-110 transition-transform">
                    <UserPlus className="w-5 h-5" />
                </div>
                <div>
                    <div className="font-bold text-blue-900 dark:text-blue-200">{t.createNewProfile}</div>
                    <div className="text-sm text-blue-600/80 dark:text-blue-300/80">{t.startBlank}</div>
                </div>
              </button>
          </div>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-stone-200 dark:border-stone-700"></div>
            <span className="flex-shrink-0 mx-4 text-stone-400 text-xs font-medium uppercase">{t.or}</span>
            <div className="flex-grow border-t border-stone-200 dark:border-stone-700"></div>
          </div>

          {/* Option 2: Existing Person */}
          <div className="bg-white dark:bg-stone-800 pt-5 p-3 rounded-xl border border-stone-200 dark:border-stone-700 shadow-sm space-y-3 relative">
             <h3 className="absolute top-[-12px] start-3 z-10 bg-white dark:bg-stone-800 px-2 text-[9px] font-bold text-stone-400 uppercase tracking-wider">{t.selectExisting}</h3>
            
             <div className="relative">
                <Search className="absolute start-3 top-2.5 w-4 h-4 text-stone-400" />
                <input 
                    type="text"
                    placeholder={t.searchByName}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full ps-10 pe-4 py-2 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-stone-900 dark:text-white"
                />
            </div>
            
            <div className="border border-stone-200 dark:border-stone-700 rounded-lg max-h-48 overflow-y-auto divide-y divide-stone-50 dark:divide-stone-700 bg-white dark:bg-stone-800 scrollbar-thin scrollbar-thumb-stone-200 dark:scrollbar-thumb-stone-600">
                {candidates.length === 0 ? (
                    <div className="p-4 text-center">
                        <User className="w-8 h-8 text-stone-200 dark:text-stone-600 mx-auto mb-2" />
                        <p className="text-sm text-stone-500 dark:text-stone-400">{t.noMatches}</p>
                    </div>
                ) : (
                    candidates.map(p => (
                        <button 
                            key={p.id}
                            onClick={() => onSelectExisting(p.id)}
                            className="w-full flex items-center gap-3 p-3 hover:bg-stone-50 dark:hover:bg-stone-700 text-start transition-colors group"
                        >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${p.gender === 'male' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'bg-pink-100 text-pink-600 dark:bg-pink-900 dark:text-pink-300'}`}>
                                {p.firstName[0]}
                            </div>
                            <div>
                                <div className="text-sm font-semibold text-stone-700 dark:text-stone-200 group-hover:text-blue-700 dark:group-hover:text-blue-400">{p.firstName} {p.lastName}</div>
                                <div className="text-xs text-stone-400 dark:text-stone-500">
                                    {p.birthDate ? `${t.born}: ${p.birthDate}` : ''}
                                </div>
                            </div>
                        </button>
                    ))
                )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};