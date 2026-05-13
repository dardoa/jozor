import React, { memo } from 'react';
import { Bot, Search, Sparkles } from 'lucide-react';

import { useTranslation } from '../../context/TranslationContext';
import { useSpeechToText } from '../../hooks/useSpeechToText';
import type { SearchProps } from '../../types';
import { KindiOverlay } from './KindiOverlay';
import { useKindiController } from './useKindiController';

export const KindiSearchTrigger: React.FC<SearchProps> = memo(({ people, onFocusPerson }) => {
  const controller = useKindiController({ people, onFocusPerson });
  const { language } = useTranslation();
  const {
    isListening,
    startListening,
    stopListening,
    isSupported: isVoiceSupported,
  } = useSpeechToText({
    language: language === 'ar' ? 'ar-SA' : 'en-US',
    onResult: (text) => {
      controller.setDraft(text);
      void controller.submit(text);
    },
    onError: (error) => {
      console.error('Kindi voice input error:', error);
    },
  });

  const toggleVoice = () => {
    if (isListening) {
      stopListening();
      return;
    }

    startListening();
  };

  return (
    <>
      <button
        id="tree-search-input"
        type="button"
        onClick={() => controller.setIsOpen(true)}
        className="group flex w-full items-center gap-2.5 rounded-full border border-[#4f5b2f]/10 bg-[#f7f1df]/80 px-4 py-2 text-start shadow-sm transition hover:bg-[#fbf7ea] hover:shadow-md lg:w-56 xl:w-64"
        aria-label="Open Kindi intelligent assistant"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#4f5b2f] text-white">
          <Bot className="h-3.5 w-3.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-black text-stone-800">اسأل كيندي</span>
          <span className="hidden truncate text-[11px] font-medium text-stone-500 xl:block">
            بحث، علاقات، أو إجراء آمن
          </span>
        </span>
        <span className="relative text-[#4f5b2f]">
          <Search className="h-4 w-4 transition group-hover:scale-110" />
          <Sparkles className="absolute -right-1 -top-1 h-2.5 w-2.5 text-amber-500" />
        </span>
      </button>

      <KindiOverlay
        isOpen={controller.isOpen}
        draft={controller.draft}
        messages={controller.messages}
        isThinking={controller.isThinking}
        onDraftChange={controller.setDraft}
        onSubmit={() => controller.submit()}
        onClose={() => controller.setIsOpen(false)}
        onFocusPerson={controller.focusPerson}
        onConfirm={controller.confirm}
        onCancel={controller.cancel}
        onCancelDisambiguation={controller.cancelDisambiguation}
        onShowMorePeople={controller.showMorePeople}
        onChooseDisambiguation={controller.chooseDisambiguation}
        hasPendingDecision={controller.hasPendingDecision}
        isListening={isListening}
        isVoiceSupported={isVoiceSupported}
        onToggleVoice={toggleVoice}
      />
    </>
  );
});
