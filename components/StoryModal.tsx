
import React, { useState, useEffect } from 'react';
import { Person, Language } from '../types';
import { generateFamilyStory } from '../services/geminiService';
import { getTranslation } from '../utils/translations';
import { X, BookOpen, Sparkles, Loader2, RefreshCw } from 'lucide-react';

interface StoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  people: Record<string, Person>;
  rootId: string;
  language: Language;
}

export const StoryModal: React.FC<StoryModalProps> = ({ isOpen, onClose, people, rootId, language }) => {
  const [storyHtml, setStoryHtml] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const t = getTranslation(language);

  // Generate on first open if empty
  useEffect(() => {
    if (isOpen && !storyHtml && !loading) {
        handleGenerate();
    }
  }, [isOpen]);

  const handleGenerate = async () => {
      setLoading(true);
      try {
          const text = await generateFamilyStory(people, rootId, language);
          setStoryHtml(text);
      } catch (e) {
          setStoryHtml(language === 'ar' ? "<p>حدث خطأ أثناء كتابة القصة.</p>" : "<p>Error generating story.</p>");
      } finally {
          setLoading(false);
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-[#fdfbf7] dark:bg-[#1a1b1e] rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col border-4 border-[#e5e7eb] dark:border-[#2c2e33] overflow-hidden relative">
        
        {/* Book Spine Effect */}
        <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-r from-gray-300 to-transparent dark:from-black/50 z-10"></div>

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#e5e7eb] dark:border-gray-800 bg-[#fdfbf7] dark:bg-[#1a1b1e]">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full text-amber-700 dark:text-amber-400">
                 <BookOpen className="w-6 h-6" />
             </div>
             <div>
                 <h3 className="text-xl font-serif font-bold text-gray-900 dark:text-[#d1d5db]">{t.storyTitle} <span className="text-amber-600">{people[rootId]?.lastName || t.family}</span></h3>
                 <p className="text-xs text-gray-500 font-sans flex items-center gap-1"><Sparkles className="w-3 h-3"/> AI Generated Narrative</p>
             </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
                onClick={handleGenerate} 
                disabled={loading}
                className="p-2 text-gray-500 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                title="Regenerate"
            >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content - Book Page Style */}
        <div className="flex-1 overflow-y-auto p-8 md:p-12 bg-[#fdfbf7] dark:bg-[#1a1b1e] scrollbar-thin scrollbar-thumb-amber-100 dark:scrollbar-thumb-gray-700">
            {loading ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
                    <p className="font-serif italic animate-pulse">{t.generateStory}...</p>
                </div>
            ) : (
                <article 
                    className="prose prose-amber dark:prose-invert max-w-none font-serif leading-relaxed text-lg"
                    dangerouslySetInnerHTML={{ __html: storyHtml }}
                />
            )}
        </div>
        
        {/* Footer Page Number */}
        <div className="py-2 text-center text-xs text-gray-400 font-serif border-t border-gray-100 dark:border-gray-800">
            ~ Page 1 ~
        </div>

      </div>
    </div>
  );
};
