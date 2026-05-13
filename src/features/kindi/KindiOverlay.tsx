import React, { memo, useEffect, useRef } from 'react';
import { Bot, Check, Mic, MicOff, Send, ShieldCheck, Sparkles, X } from 'lucide-react';

import { SmartAvatar } from '../../components/ui/SmartAvatar';
import type { Person } from '../../types';
import type { KindiConfirmation, KindiMessage } from './types';

interface KindiOverlayProps {
  isOpen: boolean;
  draft: string;
  messages: KindiMessage[];
  isThinking: boolean;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  onFocusPerson: (personId: string) => void;
  onConfirm: (confirmation: KindiConfirmation) => void;
  onCancel: (confirmation?: KindiConfirmation) => void;
  onCancelDisambiguation: (messageId: string) => void;
  onShowMorePeople: (messageId: string) => void;
  onChooseDisambiguation: (messageId: string, personId: string) => void;
  hasPendingDecision?: boolean;
  isListening?: boolean;
  isVoiceSupported?: boolean;
  onToggleVoice?: () => void;
}

const personName = (person: Person) =>
  [person.firstName, person.middleName, person.lastName].filter(Boolean).join(' ').trim() || 'Unnamed person';

const KindiPersonCard = ({
  person,
  onFocus,
  disabled = false,
}: {
  person: Person;
  onFocus: (id: string) => void;
  disabled?: boolean;
}) => (
  <button
    type="button"
    onClick={() => onFocus(person.id)}
    disabled={disabled}
    className="flex w-full items-center gap-3 rounded-2xl border border-[#4f5b2f]/10 bg-white/70 px-3 py-2.5 text-start shadow-sm transition hover:-translate-y-0.5 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
  >
    <SmartAvatar
      person={person}
      size={42}
      className="rounded-2xl ring-1 ring-white/80 shadow-sm"
    />
    <div className="min-w-0 flex-1">
      <div className="truncate text-sm font-bold text-stone-900">{personName(person)}</div>
      <div className="mt-0.5 truncate text-xs text-stone-500">
        {[person.birthDate, person.birthPlace].filter(Boolean).join(' · ') || 'Person profile'}
      </div>
    </div>
  </button>
);

const KindiConfirmCard = ({
  confirmation,
  onConfirm,
  onCancel,
}: {
  confirmation: KindiConfirmation;
  onConfirm: (confirmation: KindiConfirmation) => void;
  onCancel: (confirmation?: KindiConfirmation) => void;
}) => (
  <div className={`mt-3 rounded-2xl border p-3 shadow-sm ${
    confirmation.status === 'confirmed'
      ? 'border-emerald-900/15 bg-emerald-50/90'
      : confirmation.status === 'processing'
        ? 'border-sky-900/15 bg-sky-50/90'
      : confirmation.status === 'failed'
        ? 'border-red-900/20 bg-red-50/95'
      : confirmation.status === 'cancelled'
        ? 'border-stone-300/70 bg-stone-100/80'
        : confirmation.kind === 'DELETE'
      ? 'border-red-900/20 bg-red-50/95'
      : 'border-amber-900/15 bg-amber-50/90'
  }`}>
    <div className="flex items-start gap-2">
      <ShieldCheck className="mt-0.5 h-4 w-4 text-[#4f5b2f]" />
      <div>
        <div className="text-sm font-black text-stone-900">{confirmation.title}</div>
        <p className="mt-1 text-xs leading-5 text-stone-600">{confirmation.description}</p>
      </div>
    </div>
    {confirmation.status && confirmation.status !== 'pending' && (
      <div className="mt-3 rounded-xl bg-white/55 px-3 py-2 text-xs font-bold text-stone-600">
        {confirmation.status === 'confirmed'
          ? 'تم تنفيذ هذا القرار، ولم تعد البطاقة قابلة لإعادة التنفيذ.'
          : confirmation.status === 'processing'
            ? 'جاري تنفيذ القرار وحفظه...'
          : confirmation.status === 'failed'
            ? confirmation.error || 'تعذر تنفيذ هذا القرار. لم يتم اعتماد البطاقة.'
          : 'تم إلغاء هذا القرار، ولم يتم تغيير أي بيانات.'}
      </div>
    )}
    {!confirmation.status || confirmation.status === 'pending' ? (
      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => onCancel(confirmation)}
          className="rounded-full px-3 py-1.5 text-xs font-bold text-stone-600 transition hover:bg-stone-200/70"
        >
          {confirmation.cancelLabel}
        </button>
        <button
          type="button"
          onClick={() => onConfirm(confirmation)}
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold text-white shadow-sm transition ${
            confirmation.kind === 'DELETE'
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-[#4f5b2f] hover:bg-[#39431f]'
          }`}
        >
          <Check className="h-3.5 w-3.5" />
          {confirmation.confirmLabel}
        </button>
      </div>
    ) : null}
  </div>
);

export const KindiOverlay: React.FC<KindiOverlayProps> = memo(({
  isOpen,
  draft,
  messages,
  isThinking,
  onDraftChange,
  onSubmit,
  onClose,
  onFocusPerson,
  onConfirm,
  onCancel,
  onCancelDisambiguation,
  onShowMorePeople,
  onChooseDisambiguation,
  hasPendingDecision = false,
  isListening = false,
  isVoiceSupported = false,
  onToggleVoice,
}) => {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [isOpen, isThinking, messages]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[var(--z-index-modal)] flex items-start justify-center bg-stone-950/35 px-3 py-20 backdrop-blur-sm sm:px-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Kindi intelligent assistant"
        className="flex max-h-[78vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-white/70 bg-[#f7f1df]/95 shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-[#4f5b2f]/10 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#4f5b2f] text-white shadow-sm">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-stone-950">Kindi</h2>
              <p className="text-xs text-stone-500">Search and tree-control assistant</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-stone-500 transition hover:bg-white/70 hover:text-stone-900"
            aria-label="Close Kindi"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {messages.map((message) => (
            <div key={message.id} className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
              <div className={`max-w-[88%] rounded-3xl px-4 py-3 shadow-sm ${
                message.role === 'user'
                  ? 'bg-[#4f5b2f] text-white'
                  : 'border border-white/70 bg-white/65 text-stone-800'
              }`}>
                <p className="text-sm leading-6">{message.text}</p>
                {message.people && message.people.length > 0 && (
                  <div className="mt-3 grid gap-2">
                    {message.people.slice(0, message.visiblePeopleCount ?? message.people.length).map((person) => (
                      <KindiPersonCard
                        key={person.id}
                        person={person}
                        disabled={message.disambiguation?.status && message.disambiguation.status !== 'pending'}
                        onFocus={message.disambiguation
                          ? (personId) => onChooseDisambiguation(message.id, personId)
                          : onFocusPerson}
                      />
                    ))}
                    {(message.visiblePeopleCount ?? message.people.length) < message.people.length && (
                      <button
                        type="button"
                        onClick={() => onShowMorePeople(message.id)}
                        className="rounded-2xl border border-dashed border-[#4f5b2f]/25 bg-[#f7f1df]/70 px-3 py-3 text-sm font-black text-[#4f5b2f] transition hover:-translate-y-0.5 hover:bg-[#f7f1df]"
                      >
                        عرض المزيد ({message.people.length - (message.visiblePeopleCount ?? 0)} متبقي)
                      </button>
                    )}
                    {message.disambiguation && (!message.disambiguation.status || message.disambiguation.status === 'pending') && (
                      <button
                        type="button"
                        onClick={() => onCancelDisambiguation(message.id)}
                        className="justify-self-end rounded-full px-3 py-1.5 text-xs font-bold text-stone-600 transition hover:bg-stone-200/70"
                      >
                        إلغاء
                      </button>
                    )}
                    {message.disambiguation?.status === 'cancelled' && (
                      <div className="rounded-xl bg-white/55 px-3 py-2 text-xs font-bold text-stone-600">
                        تم إلغاء هذا الاختيار، ولم يتم تغيير أي بيانات.
                      </div>
                    )}
                  </div>
                )}
                {message.confirmation && (
                  <KindiConfirmCard
                    confirmation={message.confirmation}
                    onConfirm={onConfirm}
                    onCancel={onCancel}
                  />
                )}
              </div>
            </div>
          ))}
          {isThinking && (
            <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-2 text-xs font-bold text-stone-500 shadow-sm">
              <Sparkles className="h-3.5 w-3.5 animate-pulse text-[#4f5b2f]" />
              <span>Kindi is thinking</span>
              <span className="flex items-center gap-0.5" aria-hidden="true">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#4f5b2f] [animation-delay:-0.25s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#4f5b2f] [animation-delay:-0.12s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#4f5b2f]" />
              </span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form
          className="border-t border-[#4f5b2f]/10 bg-white/35 p-3"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div className={`flex items-center gap-2 rounded-full border px-3 py-2 shadow-inner transition ${
            isListening
              ? 'border-red-400 bg-red-50/90 ring-2 ring-red-300/40'
              : 'border-[#4f5b2f]/10 bg-white/80'
          }`}>
            <input
              value={draft}
              onChange={(event) => onDraftChange(event.target.value)}
              placeholder={hasPendingDecision ? 'Choose or cancel the pending Kindi card first...' : isListening ? 'Listening...' : 'Ask Kindi: children of Mahmoud, women from Makkah, add a son...'}
              aria-label="Kindi message"
              disabled={hasPendingDecision}
              className="min-w-0 flex-1 bg-transparent text-sm font-medium text-stone-900 outline-none placeholder:text-stone-400"
              autoFocus
            />
            {isVoiceSupported && (
              <button
                type="button"
                onClick={onToggleVoice}
                disabled={hasPendingDecision}
                className={`rounded-full p-2 transition ${
                  isListening
                    ? 'bg-red-500 text-white shadow-sm'
                    : 'text-stone-500 hover:bg-[#4f5b2f]/10 hover:text-[#4f5b2f]'
                }`}
                aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
            )}
            <button
              type="submit"
              disabled={!draft.trim() || isThinking || hasPendingDecision}
              className="rounded-full bg-[#4f5b2f] p-2 text-white shadow-sm transition hover:bg-[#39431f] disabled:opacity-40"
              aria-label="Send to Kindi"
            >
              <Send className="h-4 w-4 rtl:-scale-x-100" />
            </button>
          </div>
        </form>
      </section>
    </div>
  );
});
