import React, { useState, useEffect } from 'react';
import { Person } from '../types'; // Removed Language
import { generateFamilyStory } from '../../services/geminiService'; // Corrected import path
import { X, BookOpen, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import DOMPurify from 'dompurify';
import { useTranslation } from '../context/TranslationContext';

interface StoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  people: Record<string, Person>;
  rootId: string;
  language: string; // Changed to string as it's passed from context
}

export const StoryModal: React.FC<StoryModalProps> = ({ isOpen, onClose, people, rootId, language }) => {
  const { t } = useTranslation();
  const [storyHtml, setStoryHtml] = useState<string>('');
  const [loading, setLoading] = useState(false);

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
          // Sanitize the AI-generated HTML before setting it
          setStoryHtml(DOMPurify.sanitize(text));
      } catch (e) {
          setStoryHtml(language === 'ar' ? "<p>حدث خطأ أثناء كتابة القصة.</p>" : "<p>Error generating story.</p>");
      } finally {
          setLoading(false);
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-[#fdfbf7] dark:bg-stone-900 rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col border-4 border-stone-200 dark:border-stone-800 overflow-hidden relative">
        
        {/* Book Spine Effect */}
        <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-r from-stone-300 to-transparent dark:from-black/50 z-10"></div>

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-stone-200 dark:border-stone-800 bg-[#fdfbf7] dark:bg-stone-900">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full text-amber-700 dark:text-amber-400">
                 <BookOpen className="w-6 h-6" />
             </div>
             <div>
                 <h3 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-100">{t.storyTitle} <span className="text-amber-600">{people[rootId]?.lastName || t.family}</span></h3>
                 <p className="text-xs text-stone-500 font-sans flex items-center gap-1"><Sparkles className="w-3 h-3"/> AI Generated Narrative</p>
             </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
                onClick={handleGenerate} 
                disabled={loading}
                className="p-2 text-stone-500 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                title="Regenerate"
            >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition-colors text-stone-400 hover:text-stone-600">
                <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content - Book Page Style */}
        <div className="flex-1 overflow-y-auto p-8 md:p-12 bg-[#fdfbf7] dark:bg-stone-900 scrollbar-thin scrollbar-thumb-amber-100 dark:scrollbar-thumb-stone-700">
            {loading ? (
                <div className="h-full flex flex-col items-center justify-center text-stone-400 gap-4">
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
        <div className="py-2 text-center text-xs text-stone-400 font-serif border-t border-stone-200 dark:border-stone-800">
            ~ Page 1 ~
        </div>

      </div>
    </div>
  );
};