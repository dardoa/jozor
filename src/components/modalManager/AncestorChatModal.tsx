import { FormEvent, useMemo, useState } from 'react';
import { Loader2, MessageCircle, Send, X } from 'lucide-react';

import { OverlayPrimitive } from '../../context/OverlayContext';
import { startAncestorChat } from '../../services/geminiService';
import type { Language, Message, Person } from '../../types';

interface AncestorChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  person?: Person;
  people: Record<string, Person>;
  language: Language;
}

const buildPersonName = (person: Person) =>
  [person.title, person.firstName, person.middleName, person.lastName]
    .filter(Boolean)
    .join(' ')
    .trim() || person.nickName || person.birthName;

export const AncestorChatModal = ({
  isOpen,
  onClose,
  person,
  people,
  language,
}: AncestorChatModalProps) => {
  const isRtl = language === 'ar';
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);

  const labels = useMemo(() => ({
    title: isRtl ? 'الدردشة مع السلف' : 'Chat with ancestor',
    missingPerson: isRtl ? 'تعذر فتح المحادثة لهذا الشخص.' : 'Unable to open chat for this person.',
    placeholder: isRtl ? 'اكتب سؤالك هنا...' : 'Ask a question...',
    send: isRtl ? 'إرسال' : 'Send',
    intro: isRtl
      ? 'هذه محادثة تخيلية مبنية على بيانات الشخص المتاحة في الشجرة.'
      : 'This is an imaginative chat based on the available tree data.',
  }), [isRtl]);

  const personName = person ? buildPersonName(person) : '';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !person || isSending) return;

    const nextMessages: Message[] = [...messages, { role: 'user', text }];
    setMessages(nextMessages);
    setDraft('');
    setIsSending(true);

    try {
      const response = await startAncestorChat(person, people, nextMessages, text);
      setMessages((current) => [...current, { role: 'model', text: response }]);
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <OverlayPrimitive isOpen={isOpen} onClose={onClose} id="ancestor-chat-modal">
      <div
        className="ds-overlay-card flex h-[82dvh] w-full max-w-2xl flex-col overflow-hidden bg-[var(--surface-app)] shadow-[var(--shadow-lg)] sm:rounded-[24px]"
        dir={isRtl ? 'rtl' : 'ltr'}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="ds-modal-header flex items-center justify-between border-b border-[var(--border-soft)] bg-[var(--surface-panel)]">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary-50)] text-[var(--primary-600)]">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-base font-bold text-[var(--text-main)]">{labels.title}</h3>
              <p className="truncate text-xs text-[var(--text-muted)]">{personName || labels.missingPerson}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-subtle)] hover:text-[var(--text-main)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto p-4">
          {!person ? (
            <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel)] p-4 text-sm text-[var(--text-muted)]">
              {labels.missingPerson}
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel)] p-4 text-sm leading-6 text-[var(--text-muted)]">
                {labels.intro}
              </div>
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                      message.role === 'user'
                        ? 'bg-[var(--primary-600)] text-[var(--primary-text)]'
                        : 'border border-[var(--border-soft)] bg-[var(--surface-panel)] text-[var(--text-main)]'
                    }`}
                  >
                    {message.text}
                  </div>
                </div>
              ))}
              {isSending ? (
                <div className="flex justify-start">
                  <div className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel)] px-4 py-3 text-sm text-[var(--text-muted)]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isRtl ? 'يستحضر الرد...' : 'Thinking...'}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex shrink-0 items-center gap-2 border-t border-[var(--border-soft)] bg-[var(--surface-panel)] p-3">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            disabled={!person || isSending}
            placeholder={labels.placeholder}
            className="ds-input min-w-0 flex-1 rounded-2xl px-4 py-3 text-sm"
          />
          <button
            type="submit"
            disabled={!person || isSending || !draft.trim()}
            className="inline-flex h-12 min-w-12 items-center justify-center rounded-2xl bg-[var(--primary-600)] px-4 text-sm font-bold text-[var(--primary-text)] transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className={`h-4 w-4 ${isRtl ? 'rotate-180' : ''}`} />
            <span className="sr-only">{labels.send}</span>
          </button>
        </form>
      </div>
    </OverlayPrimitive>
  );
};
