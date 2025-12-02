import React, { useRef, useState, memo } from 'react';
import { Person, Gender } from '../../types';
import { DateSelect } from '../DateSelect';
import { getDisplayDate } from '../../utils/familyLogic';
import { User, Baby, ChevronRight, ArrowUp, Heart, ArrowDown, Camera, Sparkles, Loader2, X, Trash2, Plus, BookOpen, Ribbon } from 'lucide-react';
import { processImageFile } from '../../utils/imageLogic';
import { extractPersonData } from '../../services/geminiService';
import { SmartInput } from '../ui/SmartInput';
import { FormField } from '../ui/FormField'; // New import

// --- Optimized Sub-Components ---

const InlineAddBtn = memo(({ onClick, gender, t }: { onClick: () => void, gender: 'male' | 'female', t: any }) => (
    <button 
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`w-6 h-6 rounded-md flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${gender === 'male' 
          ? 'bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400' 
          : 'bg-pink-50 text-pink-600 hover:bg-pink-100 dark:bg-pink-900/30 dark:text-pink-400'}`}
      title={t.add}
    >
        <Plus className="w-3.5 h-3.5" strokeWidth={3} />
    </button>
));

const FamilyMemberItem = memo(({ id, person, onSelect, onRemove, t }: { id: string, person?: Person, onSelect: (id: string) => void, onRemove?: (id: string) => void, t?: any }) => {
    if (!person) return null;
    return (
        <div 
            onClick={() => onSelect(id)} 
            className="group/item flex items-center justify-between p-2 mb-1.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-sm rounded-xl cursor-pointer transition-all"
        >
            <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Avatar */}
                <div className={`relative w-8 h-8 shrink-0 rounded-full p-0.5 ${person.gender === 'male' ? 'bg-blue-100 dark:bg-blue-900' : 'bg-pink-100 dark:bg-pink-900'}`}>
                    {person.photoUrl ? (
                        <img src={person.photoUrl} alt="" className={`w-full h-full rounded-full object-cover ${person.isDeceased ? 'grayscale' : ''}`} />
                    ) : (
                        <div className="w-full h-full rounded-full bg-white dark:bg-gray-800 flex items-center justify-center">
                            <span className={`text-[10px] font-bold ${person.gender === 'male' ? 'text-blue-600' : 'text-pink-600'}`}>
                                {person.firstName[0]}
                            </span>
                        </div>
                    )}
                    {person.isDeceased && (
                        <div className="absolute -bottom-0.5 -end-0.5 bg-white dark:bg-gray-800 rounded-full p-[1px] shadow-sm">
                            <Ribbon className="w-2.5 h-2.5 text-gray-500 fill-current" />
                        </div>
                    )}
                </div>

                {/* Text Info */}
                <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate group-hover/item:text-blue-600 dark:group-hover/item:text-blue-400 transition-colors">
                        {person.firstName} {person.lastName}
                    </span>
                    <div className="flex items-center gap-1.5 text-[9px] text-gray-400 dark:text-gray-500 font-medium">
                        {person.birthDate && <span>{getDisplayDate(person.birthDate)}</span>}
                        {person.title && <span className="uppercase tracking-wide opacity-75">• {person.title}</span>}
                    </div>
                </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center ps-2">
                {onRemove ? (
                    <button 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            if(confirm(t?.confirmUnlink || 'Remove relationship?')) {
                                onRemove(id);
                            }
                        }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover/item:opacity-100 transition-all scale-90 hover:scale-100"
                        title={t?.removeRelation}
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                ) : (
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover/item:text-blue-400 rtl:rotate-180 transition-colors"/>
                )}
            </div>
        </div>
    );
});

const FamilyGroup = memo(({ 
    title, icon, ids, people, onAdd, onRemove, onSelect, placeholder, isEditing, t 
}: { 
    title: string, icon: React.ReactNode, ids: string[], people: Record<string, Person>, onAdd: (g: Gender) => void, onRemove?: (id: string) => void, onSelect: (id: string) => void, placeholder: string, isEditing: boolean, t: any 
}) => {
    return (
        <div className="mb-4 last:mb-0">
             <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <div className="p-1 rounded bg-gray-100 dark:bg-gray-800">{icon}</div>
                    <span className="text-[10px] font-bold uppercase tracking-wider">{title} <span className="opacity-60">({ids.length})</span></span>
                </div>
                {isEditing && (
                    <div className="flex gap-1.5">
                        <InlineAddBtn onClick={() => onAdd('male')} gender="male" t={t} />
                        <InlineAddBtn onClick={() => onAdd('female')} gender="female" t={t} />
                    </div>
                )}
            </div>
            
            {ids.length === 0 ? (
                 <div className="text-[10px] text-gray-400 italic px-2 py-3 bg-gray-50/50 dark:bg-gray-800/30 rounded-lg border border-dashed border-gray-100 dark:border-gray-700 text-center">
                    {placeholder}
                 </div>
            ) : (
                <div className="space-y-0.5">
                    {ids.map(id => (
                        <FamilyMemberItem 
                            key={id} 
                            id={id} 
                            person={people[id]} 
                            onSelect={onSelect} 
                            onRemove={isEditing ? onRemove : undefined}
                            t={t}
                        />
                    ))} 
                </div>
            )}
        </div>
    );
});

// --- Main Component ---

interface InfoTabProps {
  person: Person;
  people: Record<string, Person>;
  isEditing: boolean;
  onUpdate: (id: string, updates: Partial<Person>) => void;
  onSelect: (id: string) => void;
  inputClass: string; // This prop will become less relevant for FormField usage
  t: any;
  onAddParent: (gender: Gender) => void;
  onAddSpouse: (gender: Gender) => void;
  onAddChild: (gender: Gender) => void;
  onRemoveRelationship?: (targetId: string, relativeId: string, type: 'parent' | 'spouse' | 'child') => void;
}

export const InfoTab: React.FC<InfoTabProps> = ({ 
    person, people, isEditing, onUpdate, onSelect, t,
    onAddParent, onAddSpouse, onAddChild, onRemoveRelationship
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showSmartModal, setShowSmartModal] = useState(false);
  const [smartText, setSmartText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
        const dataUrl = await processImageFile(file, 300);
        onUpdate(person.id, { photoUrl: dataUrl });
    } catch (err) {
        console.error("Image processing failed", err);
    }
    e.target.value = '';
  };

  const handleChange = (field: keyof Person, value: any) => {
    onUpdate(person.id, { [field]: value });
  };

  const handleSmartExtract = async () => {
    if (!smartText.trim()) return;
    setIsExtracting(true);
    try {
        const extracted = await extractPersonData(smartText);
        const updates: any = {};
        (Object.keys(extracted) as Array<keyof Person>).forEach(key => {
            if (extracted[key] !== undefined && extracted[key] !== null && extracted[key] !== '') {
                updates[key] = extracted[key];
            }
        });
        onUpdate(person.id, updates);
        setShowSmartModal(false);
        setSmartText('');
    } catch (e) {
        alert("Failed to extract data.");
    } finally {
        setIsExtracting(false);
    }
  };

  const fullName = [person.title, person.firstName, person.middleName, person.lastName, person.suffix].filter(Boolean).join(' ') || "Unnamed Person";
  const displayBirth = getDisplayDate(person.birthDate);
  const displayDeath = getDisplayDate(person.deathDate);

  const handleRemoveParent = (id: string) => onRemoveRelationship?.(person.id, id, 'parent');
  const handleRemoveSpouse = (id: string) => onRemoveRelationship?.(person.id, id, 'spouse');
  const handleRemoveChild = (id: string) => onRemoveRelationship?.(person.id, id, 'child');

  if (!isEditing) {
      // --- VIEW MODE ---
      return (
        <div className="space-y-6 pb-6">
             <div className="flex gap-4 items-start animate-in fade-in duration-200">
                {/* Image */}
                <div className="shrink-0 relative group cursor-pointer" onClick={() => onSelect(person.id)}>
                     <div className={`w-20 h-20 rounded-2xl border-2 border-white dark:border-gray-700 shadow-md flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-700 ${person.isDeceased ? 'grayscale' : ''}`}>
                        {person.photoUrl ? (
                            <img src={person.photoUrl} alt={person.firstName} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500" />
                        ) : (
                            <User className={`w-8 h-8 ${person.gender === 'male' ? 'text-blue-300 dark:text-blue-800' : 'text-pink-300 dark:text-pink-800'}`} />
                        )}
                    </div>
                    {person.isDeceased && (
                        <div className="absolute -top-2 -end-2 bg-white dark:bg-gray-800 rounded-full p-1 shadow-sm border border-gray-100 dark:border-gray-700 z-10">
                            <Ribbon className="w-4 h-4 text-black dark:text-gray-400 fill-current" />
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 pt-0.5 space-y-2">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-tight">{fullName}</h2>
                        {(person.birthName || person.nickName) && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-0.5">
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
                                <span className="px-2 py-0.5 rounded-md bg-gray-100 border border-gray-200 dark:bg-gray-800 dark:border-gray-700 text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                    <Ribbon className="w-2.5 h-2.5" />
                                    {t.deceased}
                                </span>
                            )}
                         </div>
                         <div className="space-y-0.5">
                            <div className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 group cursor-help" title={person.birthSource ? `${t.source}: ${person.birthSource}` : ''}>
                                <Baby className="w-3.5 h-3.5 text-gray-400" />
                                <span>
                                    {t.born} <strong className="text-gray-900 dark:text-white">{displayBirth || '?'}</strong>
                                    {person.birthPlace && <span className="text-gray-500 dark:text-gray-400"> • {person.birthPlace}</span>}
                                </span>
                                {person.birthSource && <BookOpen className="w-3 h-3 text-blue-400 opacity-60 group-hover:opacity-100" />}
                            </div>
                            {person.isDeceased && (
                                <div className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 group cursor-help" title={person.deathSource ? `${t.source}: ${person.deathSource}` : ''}>
                                    <Ribbon className="w-3.5 h-3.5 text-gray-400 fill-current" />
                                    <span>
                                        {t.died} <strong className="text-gray-900 dark:text-white">{displayDeath || '?'}</strong>
                                        {person.deathPlace && <span className="text-gray-500 dark:text-gray-400"> • {person.deathPlace}</span>}
                                    </span>
                                    {person.deathSource && <BookOpen className="w-3 h-3 text-blue-400 opacity-60 group-hover:opacity-100" />}
                                </div>
                            )}
                         </div>
                    </div>
                </div>
             </div>

            <div className="h-px bg-gray-100 dark:bg-gray-800"></div>
            
            <div className="space-y-2">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold text-gray-900 dark:text-gray-100 uppercase tracking-widest bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md">{t.familyRelationships}</span>
                    <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800"></div>
                </div>
                
                <FamilyGroup 
                    title={t.parents} 
                    icon={<ArrowUp className="w-3 h-3 text-gray-500" />} 
                    ids={person.parents} 
                    people={people}
                    onAdd={onAddParent}
                    onRemove={handleRemoveParent}
                    onSelect={onSelect}
                    placeholder={t.noRelatives}
                    isEditing={false}
                    t={t}
                />
                <FamilyGroup 
                    title={t.spouses} 
                    icon={<Heart className="w-3 h-3 text-gray-500" />} 
                    ids={person.spouses} 
                    people={people}
                    onAdd={onAddSpouse}
                    onRemove={handleRemoveSpouse}
                    onSelect={onSelect}
                    placeholder={t.noRelatives}
                    isEditing={false}
                    t={t}
                />
                <FamilyGroup 
                    title={t.children} 
                    icon={<ArrowDown className="w-3 h-3 text-gray-500" />} 
                    ids={person.children} 
                    people={people}
                    onAdd={onAddChild}
                    onRemove={handleRemoveChild}
                    onSelect={onSelect}
                    placeholder={t.noRelatives}
                    isEditing={false}
                    t={t}
                />
            </div>
        </div>
      );
  }

  // --- EDIT MODE ---
  return (
    <>
    <div className="flex gap-4 animate-in fade-in duration-200">
         <div className="shrink-0 space-y-2">
             <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-400 bg-gray-50 dark:bg-gray-800 flex flex-col items-center justify-center cursor-pointer relative overflow-hidden group transition-all"
            >
                {person.photoUrl ? (
                    <img src={person.photoUrl} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                ) : (
                    <Camera className="w-6 h-6 text-gray-300 dark:text-gray-500 group-hover:text-blue-400 transition-colors" />
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
                    <span className="text-[8px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">{t.changePhoto}</span>
                </div>
            </div>
             {person.photoUrl && (
                <button 
                    onClick={() => handleChange('photoUrl', '')}
                    className="text-[9px] font-bold text-red-500 hover:text-red-700 w-full text-center bg-red-50 dark:bg-red-900/10 py-1 rounded hover:bg-red-100 transition-colors"
                >
                    {t.removePhoto}
                </button>
            )}
            <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleImageUpload}
            />
        </div>

        <div className="flex-1 space-y-3 min-w-0 relative pt-1">
            <button 
                onClick={() => setShowSmartModal(true)}
                className="absolute -top-1 end-0 z-10 flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-[9px] font-bold rounded-full shadow-sm hover:shadow-md hover:scale-105 transition-all"
            >
                <Sparkles className="w-3 h-3" /> Smart Fill
            </button>

            <div className="grid grid-cols-3 gap-2 pt-6">
                <div className="col-span-1">
                    <label className="block text-[9px] text-gray-400 font-bold mb-1 uppercase">{t.firstName}</label>
                    <SmartInput value={person.firstName} onCommit={(v) => handleChange('firstName', v)} className="w-full h-6 px-1.5 border border-gray-300 dark:border-gray-600 rounded text-[11px] focus:border-blue-500 outline-none transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:bg-transparent disabled:border-transparent disabled:px-0 disabled:cursor-default disabled:font-medium disabled:text-gray-800 dark:disabled:text-gray-200" />
                </div>
                <div className="col-span-1">
                    <label className="block text-[9px] text-gray-400 font-bold mb-1 uppercase">{t.middleName}</label>
                    <SmartInput value={person.middleName} onCommit={(v) => handleChange('middleName', v)} className="w-full h-6 px-1.5 border border-gray-300 dark:border-gray-600 rounded text-[11px] focus:border-blue-500 outline-none transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:bg-transparent disabled:border-transparent disabled:px-0 disabled:cursor-default disabled:font-medium disabled:text-gray-800 dark:disabled:text-gray-200" />
                </div>
                <div className="col-span-1">
                    <label className="block text-[9px] text-gray-400 font-bold mb-1 uppercase">{t.lastName}</label>
                    <SmartInput value={person.lastName} onCommit={(v) => handleChange('lastName', v)} className="w-full h-6 px-1.5 border border-gray-300 dark:border-gray-600 rounded text-[11px] focus:border-blue-500 outline-none transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:bg-transparent disabled:border-transparent disabled:px-0 disabled:cursor-default disabled:font-medium disabled:text-gray-800 dark:disabled:text-gray-200" />
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
                 <div>
                    <label className="block text-[9px] text-gray-400 font-bold mb-1 uppercase">{t.title}</label>
                    <SmartInput value={person.title} placeholder="" onCommit={(v) => handleChange('title', v)} className="w-full h-6 px-1.5 border border-gray-300 dark:border-gray-600 rounded text-[11px] focus:border-blue-500 outline-none transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:bg-transparent disabled:border-transparent disabled:px-0 disabled:cursor-default disabled:font-medium disabled:text-gray-800 dark:disabled:text-gray-200" />
                 </div>
                 <div>
                    <label className="block text-[9px] text-gray-400 font-bold mb-1 uppercase">{t.suffix}</label>
                    <SmartInput value={person.suffix} placeholder="" onCommit={(v) => handleChange('suffix', v)} className="w-full h-6 px-1.5 border border-gray-300 dark:border-gray-600 rounded text-[11px] focus:border-blue-500 outline-none transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:bg-transparent disabled:border-transparent disabled:px-0 disabled:cursor-default disabled:font-medium disabled:text-gray-800 dark:disabled:text-gray-200" />
                 </div>
                 <div>
                    <label className="block text-[9px] text-gray-400 font-bold mb-1 uppercase">{t.nickName}</label>
                    <SmartInput value={person.nickName} onCommit={(v) => handleChange('nickName', v)} className="w-full h-6 px-1.5 border border-gray-300 dark:border-gray-600 rounded text-[11px] focus:border-blue-500 outline-none transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:bg-transparent disabled:border-transparent disabled:px-0 disabled:cursor-default disabled:font-medium disabled:text-gray-800 dark:disabled:text-gray-200" />
                 </div>
            </div>

            <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800/50 p-2 rounded-lg border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer group">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${person.gender === 'male' ? 'border-blue-500 bg-blue-500' : 'border-gray-300 bg-white dark:bg-gray-700'}`}>
                            {person.gender === 'male' && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                        </div>
                        <input type="radio" name="gender" value="male" checked={person.gender === 'male'} onChange={() => handleChange('gender', 'male')} className="hidden" />
                        <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 transition-colors">{t.male}</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer group">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${person.gender === 'female' ? 'border-pink-500 bg-pink-500' : 'border-gray-300 bg-white dark:bg-gray-700'}`}>
                            {person.gender === 'female' && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                        </div>
                        <input type="radio" name="gender" value="female" checked={person.gender === 'female'} onChange={() => handleChange('gender', 'female')} className="hidden" />
                        <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300 group-hover:text-pink-600 transition-colors">{t.female}</span>
                    </label>
                </div>
                <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 mx-1"></div>
                <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={!person.isDeceased} onChange={(e) => handleChange('isDeceased', !e.target.checked)} className="w-3.5 h-3.5 rounded text-green-600 focus:ring-0 cursor-pointer" />
                    <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300">{person.isDeceased ? t.deceased : t.living}</span>
                </label>
            </div>

             <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                     <label className="block text-[9px] text-gray-400 font-bold mb-1 uppercase">{t.birthDate}</label>
                     <DateSelect value={person.birthDate} onChange={(val) => handleChange('birthDate', val)} />
                </div>
                <div>
                     <label className="block text-[9px] text-gray-400 font-bold mb-1 uppercase">{t.birthPlace}</label>
                     <SmartInput value={person.birthPlace} onCommit={(v) => handleChange('birthPlace', v)} className="w-full h-6 px-1.5 border border-gray-300 dark:border-gray-600 rounded text-[11px] focus:border-blue-500 outline-none transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:bg-transparent disabled:border-transparent disabled:px-0 disabled:cursor-default disabled:font-medium disabled:text-gray-800 dark:disabled:text-gray-200" />
                </div>
                <div className="col-span-2">
                     <div className="flex items-center gap-1.5">
                         <BookOpen className="w-3 h-3 text-gray-400" />
                         <SmartInput placeholder={t.sourcePlaceholder} value={person.birthSource} onCommit={(v) => handleChange('birthSource', v)} className={`w-full h-6 px-1.5 border border-gray-300 dark:border-gray-600 rounded text-[11px] focus:border-blue-500 outline-none transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:bg-transparent disabled:border-transparent disabled:px-0 disabled:cursor-default disabled:font-medium disabled:text-gray-800 dark:disabled:text-gray-200 !h-6 !text-[10px] placeholder:italic`} />
                     </div>
                </div>
             </div>

             {person.isDeceased && (
                 <div className="grid grid-cols-2 gap-2 animate-in slide-in-from-top-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                    <div>
                         <label className="block text-[9px] text-gray-400 font-bold mb-1 uppercase">{t.deathDate}</label>
                         <DateSelect value={person.deathDate} onChange={(val) => handleChange('deathDate', val)} />
                    </div>
                    <div>
                         <label className="block text-[9px] text-gray-400 font-bold mb-1 uppercase">{t.deathPlace}</label>
                         <SmartInput value={person.deathPlace} onCommit={(v) => handleChange('deathPlace', v)} className="w-full h-6 px-1.5 border border-gray-300 dark:border-gray-600 rounded text-[11px] focus:border-blue-500 outline-none transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:bg-transparent disabled:border-transparent disabled:px-0 disabled:cursor-default disabled:font-medium disabled:text-gray-800 dark:disabled:text-gray-200" />
                </div>
                     <div className="col-span-2">
                         <div className="flex items-center gap-1.5">
                             <BookOpen className="w-3 h-3 text-gray-400" />
                             <SmartInput placeholder={t.sourcePlaceholder} value={person.deathSource} onCommit={(v) => handleChange('deathSource', v)} className={`w-full h-6 px-1.5 border border-gray-300 dark:border-gray-600 rounded text-[11px] focus:border-blue-500 outline-none transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:bg-transparent disabled:border-transparent disabled:px-0 disabled:cursor-default disabled:font-medium disabled:text-gray-800 dark:disabled:text-gray-200 !h-6 !text-[10px] placeholder:italic`} />
                         </div>
                    </div>
                 </div>
             )}
             
             <div className="pt-4 space-y-4">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-900 dark:text-gray-100 uppercase tracking-widest bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md">{t.familyRelationships}</span>
                    <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800"></div>
                </div>
                
                <FamilyGroup 
                    title={t.parents} 
                    icon={<ArrowUp className="w-3.5 h-3.5 text-gray-500" />} 
                    ids={person.parents} 
                    people={people}
                    onAdd={onAddParent}
                    onRemove={handleRemoveParent}
                    onSelect={onSelect}
                    placeholder={t.noRelatives}
                    isEditing={true}
                    t={t}
                />
                
                <FamilyGroup 
                    title={t.spouses} 
                    icon={<Heart className="w-3.5 h-3.5 text-gray-500" />} 
                    ids={person.spouses} 
                    people={people}
                    onAdd={onAddSpouse}
                    onRemove={handleRemoveSpouse}
                    onSelect={onSelect}
                    placeholder={t.noRelatives}
                    isEditing={true}
                    t={t}
                />
                
                <FamilyGroup 
                    title={t.children} 
                    icon={<ArrowDown className="w-3.5 h-3.5 text-gray-500" />} 
                    ids={person.children} 
                    people={people}
                    onAdd={onAddChild}
                    onRemove={handleRemoveChild}
                    onSelect={onSelect}
                    placeholder={t.noRelatives}
                    isEditing={true}
                    t={t}
                />
             </div>
        </div>
    </div>

    {/* Smart Extract Modal */}
    {showSmartModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-4 border border-gray-100 dark:border-gray-700 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2 text-gray-800 dark:text-white">
                        <Sparkles className="w-4 h-4 text-purple-500" />
                        AI Data Extractor
                    </h3>
                    <button onClick={() => setShowSmartModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                        <X className="w-4 h-4 text-gray-500" />
                    </button>
                </div>
                <textarea 
                    value={smartText}
                    onChange={(e) => setSmartText(e.target.value)}
                    placeholder="Paste text here..."
                    className="w-full h-32 p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs focus:ring-2 focus:ring-purple-500/20 outline-none resize-none"
                />
                <button 
                    onClick={handleSmartExtract}
                    disabled={isExtracting || !smartText.trim()}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all"
                >
                    {isExtracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {isExtracting ? 'Extracting...' : 'Autofill Details'}
                </button>
            </div>
        </div>
    )}
    </>
  );
};