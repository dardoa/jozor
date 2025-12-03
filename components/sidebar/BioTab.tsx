import React, { useState, memo } from 'react';
import { Person } from '../../types';
import { generateBiography } from '../../services/geminiService';
import { Wand2, Sparkles, Loader2 } from 'lucide-react';
import { SmartTextarea } from '../ui/SmartInput';
import { FormField } from '../ui/FormField';

interface BioTabProps {
  person: Person;
  people: Record<string, Person>;
  isEditing: boolean;
  onUpdate: (id: string, updates: Partial<Person>) => void;
  t: any;
}

export const BioTab: React.FC<BioTabProps> = memo(({ person, people, isEditing, onUpdate, t }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [bioTone, setBioTone] = useState('Standard');

  const handleChange = (field: keyof Person, value: any) => {
    onUpdate(person.id, { [field]: value });
  };

  const handleGenerateBio = async () => {
    setIsGenerating(true);
    try {
      const bio = await generateBiography(person, people, bioTone);
      handleChange('bio', bio);
    } catch (e) {
      alert("Failed to generate bio. Check API Key.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-5">
        <div className="bg-white dark:bg-stone-800 p-4 rounded-xl border border-stone-200/50 dark:border-stone-700/50 shadow-sm space-y-3">
            <div className="flex justify-between items-center mb-1">
                <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">{t.workInterests}</h3>
                {!isEditing && <span className="text-[10px] text-stone-400">{t.readOnly}</span>}
            </div>
            
            <FormField
                label={t.profession}
                value={person.profession}
                onCommit={(v) => handleChange('profession', v)}
                disabled={!isEditing}
                labelWidthClass="w-20"
            />

            <FormField
                label={t.company}
                value={person.company}
                onCommit={(v) => handleChange('company', v)}
                disabled={!isEditing}
                labelWidthClass="w-20"
            />

            <FormField
                label={t.interests}
                value={person.interests}
                onCommit={(v) => handleChange('interests', v)}
                disabled={!isEditing}
                placeholder={isEditing ? "e.g. Golf, Cooking" : ""}
                labelWidthClass="w-20"
            />
        </div>

        <div className="bg-white dark:bg-stone-800 p-4 rounded-xl border border-stone-200/50 dark:border-stone-700/50 shadow-sm">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">{t.biography}</h3>
                {isEditing && (
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-stone-500">{t.tone}:</span>
                        {/* Reduced h-8 to h-7 and text-[10px] to text-[9px] */}
                        <select 
                            value={bioTone}
                            onChange={(e) => setBioTone(e.target.value)}
                            className="text-[9px] border border-stone-200 dark:border-stone-600 rounded-lg px-2 py-1 bg-stone-50 dark:bg-stone-700 outline-none focus:border-purple-300 text-stone-600 dark:text-stone-200 h-7"
                        >
                            <option value="Standard">Standard</option>
                            <option value="Formal">Formal</option>
                            <option value="Storyteller">Storyteller</option>
                            <option value="Humorous">Humorous</option>
                            <option value="Journalistic">Journalistic</option>
                        </select>
                        {/* Reduced text-[10px] to text-[9px] */}
                        <button
                            onClick={handleGenerateBio}
                            disabled={isGenerating}
                            className="text-[9px] text-purple-600 dark:text-purple-300 hover:text-purple-700 flex items-center gap-1 bg-purple-50 dark:bg-purple-900/30 px-2 py-1 rounded-full border border-purple-100 dark:border-purple-800 transition-colors font-bold"
                        >
                            {isGenerating ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3" />}
                            {isGenerating ? '...' : t.generate}
                        </button>
                    </div>
                )}
            </div>
            <SmartTextarea
                disabled={!isEditing}
                rows={12}
                value={person.bio}
                onCommit={(v) => handleChange('bio', v)}
                className="w-full px-3 py-2 border border-stone-300 dark:border-stone-600 rounded-lg text-sm outline-none focus:border-teal-500 transition-colors bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 disabled:bg-transparent disabled:border-transparent disabled:px-0 disabled:cursor-default disabled:font-medium disabled:text-stone-800 dark:disabled:text-stone-200"
                placeholder={isEditing ? t.writeBio : t.noBio}
            />
        </div>
    </div>
  );
});