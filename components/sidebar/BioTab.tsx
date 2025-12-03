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
    <div className="space-y-4"> {/* Reduced space-y-5 to space-y-4 */}
        <div className="bg-white dark:bg-stone-800 pt-4 p-3 rounded-xl border border-stone-200/50 dark:border-stone-700/50 shadow-sm space-y-2 relative"> {/* Changed pt-5 to pt-4 */}
            <div className="absolute top-[-3] start-3 z-10 bg-white dark:bg-stone-800 px-2 flex justify-between items-center"> {/* Changed top-0 to top-[-3] */}
                <h3 className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">{t.workInterests}</h3> {/* Reduced text-[10px] to text-[9px] */}
                {!isEditing && <span className="text-[9px] text-stone-400 ms-2">{t.readOnly}</span>} {/* Reduced text-[10px] to text-[9px] */}
            </div>
            
            <FormField
                label={t.profession}
                value={person.profession}
                onCommit={(v) => handleChange('profession', v)}
                disabled={!isEditing}
                labelWidthClass="w-16" /* Reduced w-20 to w-16 */
            />

            <FormField
                label={t.company}
                value={person.company}
                onCommit={(v) => handleChange('company', v)}
                disabled={!isEditing}
                labelWidthClass="w-16" /* Reduced w-20 to w-16 */
            />

            <FormField
                label={t.interests}
                value={person.interests}
                onCommit={(v) => handleChange('interests', v)}
                disabled={!isEditing}
                placeholder={isEditing ? "e.g. Golf, Cooking" : ""}
                labelWidthClass="w-16" /* Reduced w-20 to w-16 */
            />
        </div>

        <div className="bg-white dark:bg-stone-800 pt-4 p-3 rounded-xl border border-stone-200/50 dark:border-stone-700/50 shadow-sm relative"> {/* Changed pt-5 to pt-4 */}
            <div className="absolute top-[-3] start-3 z-10 bg-white dark:bg-stone-800 px-2 flex justify-between items-center w-[calc(100%-24px)]"> {/* Changed top-0 to top-[-3] */}
                <h3 className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">{t.biography}</h3> {/* Reduced text-[10px] to text-[9px] */}
                {isEditing && (
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] text-stone-500">{t.tone}:</span> {/* Reduced text-[10px] to text-[9px] */}
                        <select 
                            value={bioTone}
                            onChange={(e) => setBioTone(e.target.value)}
                            className="text-[8px] border border-stone-200 dark:border-stone-600 rounded-lg px-2 py-0.5 bg-stone-50 dark:bg-stone-700 outline-none focus:border-purple-300 text-stone-600 dark:text-stone-200 h-6"
                        > {/* Reduced text-[9px] to text-[8px], py-1 to py-0.5, h-7 to h-6 */}
                            <option value="Standard">Standard</option>
                            <option value="Formal">Formal</option>
                            <option value="Storyteller">Storyteller</option>
                            <option value="Humorous">Humorous</option>
                            <option value="Journalistic">Journalistic</option>
                        </select>
                        <button
                            onClick={handleGenerateBio}
                            disabled={isGenerating}
                            className="text-[8px] text-purple-600 dark:text-purple-300 hover:text-purple-700 flex items-center gap-1 bg-purple-50 dark:bg-purple-900/30 px-1.5 py-0.5 rounded-full border border-purple-100 dark:border-purple-800 transition-colors font-bold"
                        > {/* Reduced text-[9px] to text-[8px], px-2 py-1 to px-1.5 py-0.5 */}
                            {isGenerating ? <Loader2 className="w-2.5 h-2.5 animate-spin"/> : <Sparkles className="w-2.5 h-2.5" />} {/* Reduced w-3 h-3 to w-2.5 h-2.5 */}
                            {isGenerating ? '...' : t.generate}
                        </button>
                    </div>
                )}
            </div>
            <SmartTextarea
                disabled={!isEditing}
                rows={8} /* Reduced rows from 12 to 8 */
                value={person.bio}
                onCommit={(v) => handleChange('bio', v)}
                className="w-full px-2.5 py-1.5 border border-stone-300 dark:border-stone-600 rounded-lg text-xs outline-none focus:border-teal-500 transition-colors bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 disabled:bg-transparent disabled:border-transparent disabled:px-0 disabled:cursor-default disabled:font-medium disabled:text-stone-800 dark:disabled:text-stone-200"
                placeholder={isEditing ? t.writeBio : t.noBio}
            />
        </div>
    </div>
  );
});