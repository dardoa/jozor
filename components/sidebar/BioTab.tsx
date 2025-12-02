import React, { useState } from 'react';
import { Person } from '../../types';
import { generateBiography } from '../../services/geminiService';
import { Wand2 } from 'lucide-react';
import { SmartTextarea } from '../ui/SmartInput'; // Keep SmartTextarea for bio
import { FormField } from '../ui/FormField'; // New import

interface BioTabProps {
  person: Person;
  people: Record<string, Person>;
  isEditing: boolean;
  onUpdate: (id: string, updates: Partial<Person>) => void;
  inputClass: string; // This prop will become less relevant for FormField usage
  t: any;
}

export const BioTab: React.FC<BioTabProps> = ({ person, people, isEditing, onUpdate, t }) => {
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

  const textareaClass = `w-full px-1.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-[10px] outline-none focus:border-blue-500 transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:bg-transparent disabled:border-transparent disabled:px-0 disabled:cursor-default disabled:font-medium disabled:text-gray-800 dark:disabled:text-gray-200`;

  return (
    <div className="space-y-3">
        <div className="bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700 shadow-sm space-y-1">
            <div className="flex justify-between items-center mb-1">
                <h3 className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{t.workInterests}</h3>
                {!isEditing && <span className="text-[9px] text-gray-400">{t.readOnly}</span>}
            </div>
            
            <FormField
                label={t.profession}
                value={person.profession}
                onCommit={(v) => handleChange('profession', v)}
                disabled={!isEditing}
            />

            <FormField
                label={t.company}
                value={person.company}
                onCommit={(v) => handleChange('company', v)}
                disabled={!isEditing}
            />

            <FormField
                label={t.interests}
                value={person.interests}
                onCommit={(v) => handleChange('interests', v)}
                disabled={!isEditing}
                placeholder={isEditing ? "e.g. Golf, Cooking" : ""}
            />
        </div>

        <div className="bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex justify-between items-center mb-1">
                <h3 className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{t.biography}</h3>
                {isEditing && (
                    <div className="flex items-center gap-1.5">
                        <span className="text-[9px] text-gray-500">{t.tone}:</span>
                        <select 
                            value={bioTone}
                            onChange={(e) => setBioTone(e.target.value)}
                            className="text-[9px] border border-gray-200 dark:border-gray-600 rounded px-1 py-0.5 bg-gray-50 dark:bg-gray-700 outline-none focus:border-purple-300 text-gray-600 dark:text-gray-200"
                        >
                            <option value="Standard">Standard</option>
                            <option value="Formal">Formal</option>
                            <option value="Storyteller">Storyteller</option>
                            <option value="Humorous">Humorous</option>
                            <option value="Journalistic">Journalistic</option>
                        </select>
                        <button
                            onClick={handleGenerateBio}
                            disabled={isGenerating}
                            className="text-[9px] text-purple-600 dark:text-purple-300 hover:text-purple-700 flex items-center gap-1 bg-purple-50 dark:bg-purple-900/30 px-1.5 py-0.5 rounded-full border border-purple-100 dark:border-purple-800 transition-colors"
                        >
                            <Wand2 className="w-2.5 h-2.5" />
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
                className={textareaClass}
                placeholder={isEditing ? t.writeBio : t.noBio}
            />
        </div>
    </div>
  );
};