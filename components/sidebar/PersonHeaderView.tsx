import React, { memo } from 'react';
import { Person, FamilyActionsProps } from '../../types';
import { getDisplayDate } from '../../utils/familyLogic';
import { User, Baby, Ribbon, MessageCircle, MapPin, CalendarDays, BookOpen, ArrowUp, Heart } from 'lucide-react';
import { useTranslation } from '../../context/TranslationContext';
import { QuickAddSpeedDial } from '../ui/QuickAddSpeedDial'; // New import

interface PersonHeaderViewProps {
  person: Person;
  onSelect: (id: string) => void;
  onOpenModal: (modalType: 'calculator' | 'stats' | 'chat' | 'consistency' | 'timeline' | 'share' | 'story' | 'map') => void;
  familyActions: FamilyActionsProps; // NEW PROP
}

export const PersonHeaderView: React.FC<PersonHeaderViewProps> = memo(({ person, onSelect, onOpenModal, familyActions }) => {
  const { t } = useTranslation();
  const fullName = [person.title, person.firstName, person.middleName, person.lastName, person.suffix].filter(Boolean).join(' ') || "Unnamed Person";
  const displayBirth = getDisplayDate(person.birthDate);
  const displayDeath = getDisplayDate(person.deathDate);

  const quickAddActions = [
    {
        onClick: () => familyActions.onAddParent('male'),
        icon: <ArrowUp className="w-3 h-3"/>,
        colorClasses: "bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400",
        label: t.addFather
    },
    {
        onClick: () => familyActions.onAddParent('female'),
        icon: <ArrowUp className="w-3 h-3"/>,
        colorClasses: "bg-pink-50 text-pink-600 hover:bg-pink-100 dark:bg-pink-900/30 dark:text-pink-400",
        label: t.addMother
    },
    {
        onClick: () => familyActions.onAddSpouse('male'),
        icon: <Heart className="w-3 h-3"/>,
        colorClasses: "bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400",
        label: t.addHusband
    },
    {
        onClick: () => familyActions.onAddSpouse('female'),
        icon: <Heart className="w-3 h-3"/>,
        colorClasses: "bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400",
        label: t.addWife
    },
    {
        onClick: () => familyActions.onAddChild('male'),
        icon: <Baby className="w-3 h-3"/>,
        colorClasses: "bg-teal-50 text-teal-600 hover:bg-teal-100 dark:bg-teal-900/30 dark:text-teal-400",
        label: t.addSon
    },
    {
        onClick: () => familyActions.onAddChild('female'),
        icon: <Baby className="w-3 h-3"/>,
        colorClasses: "bg-orange-50 text-orange-600 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400",
        label: t.addDaughter
    },
  ];

  return (
    <div className="space-y-4 pb-4">
      <div className="flex gap-3 items-start animate-in fade-in duration-200">
        {/* Image */}
        <div className="shrink-0 flex flex-col items-center gap-2">
          <div className="relative group cursor-pointer" onClick={() => onSelect(person.id)}>
            <div className={`w-28 h-28 rounded-2xl border-2 border-white dark:border-stone-700 shadow-md flex items-center justify-center overflow-hidden bg-stone-50 dark:bg-stone-700 ${person.isDeceased ? 'grayscale' : ''}`}>
              {person.photoUrl ? (
                <img src={person.photoUrl} alt={person.firstName} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500" />
              ) : (
                <User className={`w-12 h-12 ${person.gender === 'male' ? 'text-blue-300 dark:text-blue-800' : 'text-pink-300 dark:text-pink-800'}`} />
              )}
            </div>
            {person.isDeceased && (
              <div className="absolute -top-2 -end-2 bg-white dark:bg-stone-800 rounded-full p-1 shadow-sm border border-stone-100 dark:border-stone-700 z-10">
                <Ribbon className="w-4 h-4 text-stone-600 dark:text-stone-400 fill-current" />
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 pt-0.5 space-y-1.5">
          <div>
            <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100 leading-tight">{fullName}</h2>
            {(person.birthName || person.nickName) && (
              <p className="text-xs text-stone-500 dark:text-stone-400 italic mt-0.5">
                {person.nickName && `"${person.nickName}"`}
                {person.nickName && person.birthName && ' • '}
                {person.birthName && `${t.nee} ${person.birthName}`}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[10px] font-medium">
              <span className={`px-2 py-0.5 rounded-md border ${person.gender === 'male' ? 'bg-blue-50 border-blue-100 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300' : 'bg-pink-50 border-pink-100 text-pink-700 dark:bg-pink-900/30 dark:border-pink-800 dark:text-pink-300'}`}>
                {person.gender === 'male' ? t.male : t.female}
              </span>
              {person.isDeceased && (
                <span className="px-2 py-0.5 rounded-md bg-stone-100 border border-stone-200 dark:bg-stone-800 dark:border-stone-700 text-stone-600 dark:text-stone-400 flex items-center gap-1">
                  <Ribbon className="w-2.5 h-2.5" />
                  {t.deceased}
                </span>
              )}
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-xs text-stone-700 dark:text-stone-300 group cursor-help" title={person.birthSource ? `${t.source}: ${person.birthSource}` : ''}>
                <Baby className="w-3.5 h-3.5 text-stone-400" />
                <span>
                  {t.born} <strong className="text-stone-900 dark:text-stone-100">{displayBirth || '?'}</strong>
                  {person.birthPlace && <span className="text-stone-500 dark:text-stone-400"> • {person.birthPlace}</span>}
                </span>
                {person.birthSource && <BookOpen className="w-3 h-3 text-teal-400 opacity-60 group-hover:opacity-100" />}
              </div>
              {person.isDeceased && (
                <div className="flex items-center gap-2 text-xs text-stone-700 dark:text-stone-300 group cursor-help" title={person.deathSource ? `${t.source}: ${person.deathSource}` : ''}>
                  <Ribbon className="w-3.5 h-3.5 text-stone-400 fill-current" />
                  <span>
                    {t.died} <strong className="text-stone-900 dark:text-stone-100">{displayDeath || '?'}</strong>
                    {person.deathPlace && <span className="text-stone-500 dark:text-stone-400"> • {person.deathPlace}</span>}
                  </span>
                  {person.deathSource && <BookOpen className="w-3 h-3 text-teal-400 opacity-60 group-hover:opacity-100" />}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="h-px bg-stone-100 dark:bg-stone-800"></div>

      {/* Actions Section - Consolidated */}
      <div className="flex flex-wrap items-center justify-center gap-2 mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
        {person.isDeceased && (
          <button
            onClick={() => onOpenModal('chat')}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg text-xs font-bold hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" /> {t.chatWithAncestor}
          </button>
        )}
        
        {/* Quick Add Speed Dial */}
        <QuickAddSpeedDial actions={quickAddActions} />

        <button
          onClick={() => onOpenModal('map')}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg text-xs font-bold hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
        >
          <MapPin className="w-3.5 h-3.5" /> {t.viewOnMap}
        </button>
        <button
          onClick={() => onOpenModal('timeline')}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
        >
          <CalendarDays className="w-3.5 h-3.5" /> {t.familyTimelineHeader}
        </button>
      </div>
    </div>
  );
});