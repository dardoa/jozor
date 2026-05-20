import React, { memo } from 'react';
import { Search, Sparkles } from 'lucide-react';

import { KindiIcon } from '../../../components/icons/KindiIcon';
import { useTranslation } from '../../../context/TranslationContext';
import { useSpeechToText } from '../../../hooks/utils/useSpeechToText';
import type { SearchProps } from '../../../types';
import { KindiOverlay } from './KindiOverlay';
import { useKindiController } from '../hooks/useKindiController';

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
        className="group flex w-full items-center gap-2.5 rounded-full border border-[var(--border-soft)] bg-[var(--surface-panel)] px-4 py-2 text-start shadow-sm transition hover:bg-[var(--surface-hover)] hover:shadow-md lg:w-56 xl:w-64"
        aria-label="Open Kindi intelligent assistant"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--primary-600)] shadow-sm ring-1 ring-[var(--border-soft)]">
          <KindiIcon size={24} className="h-6 w-6 object-contain" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-black text-[var(--text-main)]">اسأل كيندي</span>
          <span className="hidden truncate text-[11px] font-medium text-[var(--text-muted)] xl:block">
            بحث، علاقات، أو إجراء آمن
          </span>
        </span>
        <span className="relative text-[var(--primary-600)]">
          <Search className="h-4 w-4 transition group-hover:scale-110" />
          <Sparkles className="absolute -right-1 -top-1 h-2.5 w-2.5 text-[var(--color-warning-500)]" />
        </span>
      </button>

      <KindiOverlay
        isOpen={controller.isOpen}
        draft={controller.draft}
        messages={controller.messages}
        peopleById={people}
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
