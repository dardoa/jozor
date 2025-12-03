import React, { useRef, useState, memo } from 'react';
import { Person, Gender } from '../../types';
import { DateSelect } from '../DateSelect';
import { getDisplayDate } from '../../utils/familyLogic';
import { User, Baby, BookOpen, Camera, Sparkles, Loader2, X, Ribbon, MessageCircle } from 'lucide-react';
import { processImageFile } from '../../utils/imageLogic';
import { extractPersonData } from '../../services/geminiService';
import { FormField } from '../ui/FormField';
import { FamilyRelationshipsSection } from './FamilyRelationshipsSection';
import * as d3 from 'd3';

interface InfoTabProps {
  person: Person;
  people: Record<string, Person>;
  isEditing: boolean;
  onUpdate: (id: string, updates: Partial<Person>) => void;
  onSelect: (id: string) => void;
  t: any;
  onAddParent: (gender: Gender) => void;
  onAddSpouse: (gender: Gender) => void;
  onAddChild: (gender: Gender) => void;
  onRemoveRelationship?: (targetId: string, relativeId: string, type: 'parent' | 'spouse' | 'child') => void;
  onOpenModal: (modalType: 'calculator' | 'stats' | 'chat' | 'consistency' | 'timeline' | 'share' | 'story' | 'map') => void;
}

export const InfoTab: React.FC<InfoTabProps> = memo(({ 
    person, people, isEditing, onUpdate, onSelect, t,
    onAddParent, onAddSpouse, onAddChild, onRemoveRelationship, onOpenModal
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

  if (!isEditing) {
      // --- VIEW MODE ---
      return (
        <div className="space-y-4 pb-4">
             <div className="flex gap-3 items-start animate-in fade-in duration-200">
                {/* Image */}
                <div className="shrink-0 flex flex-col items-center gap-2">
                    <div className="relative group cursor-pointer" onClick={() => onSelect(person.id)}>
                         <div className={`w-28 h-28 rounded-2xl border-2 border-white dark:border-stone-700 shadow-md flex items-center justify-center overflow-hidden bg-stone-50 dark:bg-stone-700 ${person.isDeceased ? 'grayscale' : ''}`}> {/* Increased size to w-28 h-28 */}
                            {person.photoUrl ? (
                                <img src={person.photoUrl} alt={person.firstName} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500" />
                            ) : (
                                // Increased icon size to w-10 h-10
                                <User className={`w-10 h-10 ${person.gender === 'male' ? 'text-blue-300 dark:text-blue-800' : 'text-pink-300 dark:text-pink-800'}`} /> 
                            )}
                        </div>
                        {person.isDeceased && (
                            <>
                                <div className="absolute -top-2 -end-2 bg-white dark:bg-stone-800 rounded-full p-1 shadow-sm border border-stone-100 dark:border-stone-700 z-10">
                                    <Ribbon className="w-4 h-4 text-stone-600 dark:text-stone-400 fill-current" />
                                </div>
                                {/* Chat with Ancestor button */}
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onOpenModal('chat'); }} 
                                    className="p-1.5 bg-purple-600/90 hover:bg-purple-700 text-white rounded-full shadow-lg transition-all z-20 border border-white/20"
                                    title={t.chatWithAncestor}
                                >
                                    <MessageCircle className="w-4 h-4" />
                                </button>
                            </>
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
            
            <FamilyRelationshipsSection
                person={person} people={people} isEditing={isEditing} onUpdate={onUpdate} onSelect={onSelect} t={t}
                onAddParent={onAddParent} onAddSpouse={onAddSpouse} onAddChild={onAddChild} onRemoveRelationship={onRemoveRelationship}
            />
        </div>
      );
  }

  // --- EDIT MODE ---
  return (
    <>
    <div className="flex flex-col gap-4 animate-in fade-in duration-200">
        {/* Profile Picture & Smart Fill */}
        <div className="flex items-start gap-3 relative">
            <div className="shrink-0 space-y-1.5">
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-20 h-20 rounded-xl border-2 border-dashed border-stone-300 dark:border-stone-600 hover:border-teal-400 dark:hover:border-teal-400 bg-stone-50 dark:bg-stone-800 flex flex-col items-center justify-center cursor-pointer relative overflow-hidden group transition-all"
                >
                    {person.photoUrl ? (
                        <>
                            <img src={person.photoUrl} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleChange('photoUrl', ''); }}
                                className="absolute top-1 right-1 p-0.5 bg-red-500/80 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                title={t.removePhoto}
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </>
                    ) : (
                        <Camera className="w-7 h-7 text-stone-300 dark:text-stone-500 group-hover:text-teal-400 transition-colors" />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
                        <span className="text-[9px] font-bold text-white bg-black/60 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">{t.changePhoto}</span>
                    </div>
                </div>
                <input 
                    ref={fileInputRef}
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleImageUpload}
                />
            </div>

            <div className="flex-1 flex flex-col items-start gap-y-1">
                <button 
                    onClick={() => setShowSmartModal(true)}
                    className="py-1 px-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg hover:scale-[1.01] transition-all flex items-center justify-center gap-1.5"
                >
                    <Sparkles className="w-3.5 h-3.5" /> {t.smartFill}
                </button>
                <p className="text-[9px] text-stone-500 dark:text-stone-400 mt-0.5 text-start">{t.smartFillDescription}</p>
            </div>
        </div>

        {/* Identity Section */}
        <div className="bg-white dark:bg-stone-800 pt-5 p-3 rounded-xl border border-stone-200/50 dark:border-stone-700/50 shadow-sm space-y-2 relative">
            <h3 className="absolute top-[-12px] start-3 z-10 bg-white dark:bg-stone-800 px-2 text-[9px] font-bold text-stone-400 uppercase tracking-wider">{t.identity}</h3>
            <div className="space-y-2"> {/* Changed from grid grid-cols-2 gap-2 to space-y-2 */}
                <FormField label={t.firstName} value={person.firstName} onCommit={(v) => handleChange('firstName', v)} disabled={!isEditing} labelWidthClass="w-16" />
                <FormField label={t.middleName} value={person.middleName} onCommit={(v) => handleChange('middleName', v)} disabled={!isEditing} labelWidthClass="w-16" />
                <FormField label={t.lastName} value={person.lastName} onCommit={(v) => handleChange('lastName', v)} disabled={!isEditing} labelWidthClass="w-16" />
                <FormField label={t.birthName} value={person.birthName} onCommit={(v) => handleChange('birthName', v)} disabled={!isEditing} labelWidthClass="w-16" />
                <FormField label={t.nickName} value={person.nickName} onCommit={(v) => handleChange('nickName', v)} disabled={!isEditing} labelWidthClass="w-16" />
                <FormField label={t.title} value={person.title} onCommit={(v) => handleChange('title', v)} disabled={!isEditing} labelWidthClass="w-16" />
                <FormField label={t.suffix} value={person.suffix} onCommit={(v) => handleChange('suffix', v)} disabled={!isEditing} labelWidthClass="w-16" />
            </div>
        </div>

        {/* Gender & Status */}
        <div className="bg-white dark:bg-stone-800 pt-5 p-3 rounded-xl border border-stone-200/50 dark:border-stone-700/50 shadow-sm space-y-2 relative">
            <h3 className="absolute top-[-12px] start-3 z-10 bg-white dark:bg-stone-800 px-2 text-[9px] font-bold text-stone-400 uppercase tracking-wider">{t.status}</h3>
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 cursor-pointer group">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${person.gender === 'male' ? 'border-blue-500 bg-blue-500' : 'border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700'}`}>
                            {person.gender === 'male' && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                        </div>
                        <input type="radio" name="gender" value="male" checked={person.gender === 'male'} onChange={() => handleChange('gender', 'male')} className="hidden" />
                        <span className="text-sm font-medium text-stone-700 dark:text-stone-300 group-hover:text-blue-600 transition-colors">{t.male}</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer group">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${person.gender === 'female' ? 'border-pink-500 bg-pink-500' : 'border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700'}`}>
                            {person.gender === 'female' && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                        </div>
                        <input type="radio" name="gender" value="female" checked={person.gender === 'female'} onChange={() => handleChange('gender', 'female')} className="hidden" />
                        <span className="text-sm font-medium text-stone-700 dark:text-stone-300 group-hover:text-pink-600 transition-colors">{t.female}</span>
                    </label>
                </div>
                <div className="h-6 w-px bg-stone-300 dark:bg-stone-600 mx-2"></div>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={!person.isDeceased} onChange={(e) => handleChange('isDeceased', !e.target.checked)} className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-0 cursor-pointer border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700" />
                    <span className="text-sm font-medium text-stone-700 dark:text-stone-300">{person.isDeceased ? t.deceased : t.living}</span>
                </label>
            </div>
        </div>

        {/* Birth Details */}
        <div className="bg-white dark:bg-stone-800 pt-5 p-3 rounded-xl border border-stone-200/50 dark:border-stone-700/50 shadow-sm space-y-2 relative">
            <h3 className="absolute top-[-12px] start-3 z-10 bg-white dark:bg-stone-800 px-2 text-[9px] font-bold text-stone-400 uppercase tracking-wider">{t.birthDetails}</h3>
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <label className="w-16 shrink-0 text-[9px] text-stone-600 dark:text-stone-400 font-medium">{t.birthDate}</label>
                    <DateSelect value={person.birthDate} onChange={(val) => handleChange('birthDate', val)} disabled={!isEditing} />
                </div>
                <FormField label={t.birthPlace} value={person.birthPlace} onCommit={(v) => handleChange('birthPlace', v)} disabled={!isEditing} labelWidthClass="w-16" />
                <div className="flex items-center gap-2">
                    <label className="w-16 shrink-0 text-[9px] text-stone-600 dark:text-stone-400 font-medium">{t.source}</label>
                    <div className="flex-1 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-stone-400" />
                        <FormField
                            label=""
                            value={person.birthSource}
                            onCommit={(v) => handleChange('birthSource', v)}
                            disabled={!isEditing}
                            placeholder={t.sourcePlaceholder}
                            className="!h-7 !text-xs placeholder:italic"
                            labelWidthClass="hidden"
                        />
                    </div>
                </div>
            </div>
        </div>

        {/* Death Details (Conditional) */}
        {person.isDeceased && (
            <div className="bg-white dark:bg-stone-800 pt-5 p-3 rounded-xl border border-stone-200/50 dark:border-stone-700/50 shadow-sm space-y-2 animate-in slide-in-from-top-2 relative">
                <h3 className="absolute top-[-12px] start-3 z-10 bg-white dark:bg-stone-800 px-2 text-[9px] font-bold text-stone-400 uppercase tracking-wider">{t.deathDetails}</h3>
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <label className="w-16 shrink-0 text-[9px] text-stone-600 dark:text-stone-400 font-medium">{t.deathDate}</label>
                        <DateSelect value={person.deathDate} onChange={(val) => handleChange('deathDate', val)} disabled={!isEditing} />
                    </div>
                    <FormField label={t.deathPlace} value={person.deathPlace} onCommit={(v) => handleChange('deathPlace', v)} disabled={!isEditing} labelWidthClass="w-16" />
                    <div className="flex items-center gap-2">
                        <label className="w-16 shrink-0 text-[9px] text-stone-600 dark:text-stone-400 font-medium">{t.source}</label>
                        <div className="flex-1 flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-stone-400" />
                            <FormField
                                label=""
                                value={person.deathSource}
                                onCommit={(v) => handleChange('deathSource', v)}
                                disabled={!isEditing}
                                placeholder={t.sourcePlaceholder}
                                className="!h-7 !text-xs placeholder:italic"
                                labelWidthClass="hidden"
                            />
                        </div>
                    </div>
                </div>
            </div>
        )}
        
        <FamilyRelationshipsSection
            person={person} people={people} isEditing={isEditing} onUpdate={onUpdate} onSelect={onSelect} t={t}
            onAddParent={onAddParent} onAddSpouse={onAddSpouse} onAddChild={onAddChild} onRemoveRelationship={onRemoveRelationship}
        />
    </div>

    {/* Smart Extract Modal */}
    {showSmartModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-2xl max-w-md w-full p-4 border border-stone-100 dark:border-stone-700 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2 text-stone-800 dark:text-white">
                        <Sparkles className="w-4 h-4 text-purple-500" />
                        AI Data Extractor
                    </h3>
                    <button onClick={() => setShowSmartModal(false)} className="p-1 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-full">
                        <X className="w-4 h-4 text-stone-500" />
                    </button>
                </div>
                <textarea 
                    value={smartText}
                    onChange={(e) => setSmartText(e.target.value)}
                    placeholder="Paste text here..."
                    className="w-full h-32 p-3 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 text-sm focus:ring-2 focus:ring-purple-500/20 outline-none resize-none"
                />
                <button 
                    onClick={handleSmartExtract}
                    disabled={isExtracting || !smartText.trim()}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all"
                >
                    {isExtracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {isExtracting ? 'Extracting...' : 'Autofill Details'}
                </button>
            </div>
        </div>
    )}
    </>
  );
});