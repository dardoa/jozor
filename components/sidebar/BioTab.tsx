import React, { useState, memo } from 'react';
import { Person } from '../../types';
import { generateBiography } from '../../services/geminiService';
import { Wand2, Sparkles, Loader2, Info } from 'lucide-react';
import { SmartTextarea } from '../ui/SmartInput';
import { FormField } from '../ui/FormField';
import { Card } from '../ui/Card';
import { useTranslation } from '../../context/TranslationContext';

interface BioTabProps {
  person: Person;
  people: Record<string, Person>;
  isEditing: boolean;
  onUpdate: (id: string, updates: Partial<Person>) => void;
}

export const BioTab: React.FC<BioTabProps> = memo(({ person, people, isEditing, onUpdate }) => {
  const { t } = useTranslation();
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

  const hasWorkInterests = person.profession || person.company || person.interests;

  return (
    <div className="space-y-4">
        <Card title={t.workInterests}>
            {(!hasWorkInterests && !isEditing) ? (
                <div className="text-center py-4 text-stone-400 dark:text-stone-500 bg-stone-50 dark:bg-stone-800/50 rounded-xl border border-dashed border-stone-200 dark:border-stone-700 flex flex-col items-center">
                    <Info className="w-8 h-8 mb-2 opacity-50" />
                    <span className="text-sm">{t.noWorkInterests || 'No work or interests information available.'}</span>
                </div>
            ) : (
                <>
                    <FormField
                        label={t.profession}
                        value={person.profession}
                        onCommit={(v) => handleChange('profession', v)}
                        disabled={!isEditing}
                        labelWidthClass="w-24"
                    />

                    <FormField
                        label={t.company}
                        value={person.company}
                        onCommit={(v) => handleChange('company', v)}
                        disabled={!isEditing}
                        labelWidthClass="w-24"
                    />

                    <FormField
                        label={t.interests}
                        value={person.interests}
                        onCommit={(v) => handleChange('interests', v)}
                        disabled={!isEditing}
                        placeholder={isEditing ? "e.g. Golf, Cooking" : ""}
                        labelWidthClass="w-24"
                    />
                </>
            )}
        </Card>

        <Card title={t.biography}>
            <div className="flex justify-between items-center relative z-10 mb-3">
                {isEditing && (
                    <div className="flex items-center gap-2 ms-auto">
                        <span className="text-[9px] text-stone-500">{t.tone}:</span>
                        <select 
                            value={bioTone}
                            onChange={(e) => setBioTone(e.target.value)}
                            className="text-[8px] border border-stone-200 dark:border-stone-600 rounded-lg px-2 py-0.5 bg-stone-50 dark:bg-stone-700 outline-none focus:border-purple-300 text-stone-600 dark:text-stone-200 h-6"
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
                            className="text-[8px] text-purple-600 dark:text-purple-300 hover:text-purple-700 flex items-center gap-1 bg-purple-50 dark:bg-purple-900/30 px-1.5 py-0.5 rounded-full border border-purple-100 dark:border-purple-800 transition-colors font-bold"
                        >
                            {isGenerating ? <Loader2 className="w-2.5 h-2.5 animate-spin"/> : <Sparkles className="w-2.5 h-2.5" />}
                            {isGenerating ? '...' : t.generate}
                        </button>
                    </div>
                )}
            </div>
            {isEditing ? (
                <SmartTextarea
                    disabled={!isEditing}
                    rows={8}
                    value={person.bio}
                    onCommit={(v) => handleChange('bio', v)}
                    className="w-full px-2.5 py-1.5 border border-stone-300 dark:border-stone-600 rounded-lg text-xs outline-none focus:border-teal-500 transition-colors bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 disabled:bg-transparent disabled:border-transparent disabled:px-0 disabled:cursor-default disabled:font-medium disabled:text-stone-800 dark:disabled:text-stone-200"
                    placeholder={isEditing ? t.writeBio : t.noBio}
                />
            ) : (
                <div className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
                    {person.bio || <p className="text-stone-400 italic">{t.noBio}</p>}
                </div>
            )}
        </Card>
    </div>
  );
});