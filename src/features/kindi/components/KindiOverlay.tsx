import React, { memo, useEffect, useRef } from 'react';
import { Check, CornerDownLeft, Mic, MicOff, Send, ShieldCheck, Sparkles, X } from 'lucide-react';

import { KindiIcon } from '../../../components/icons/KindiIcon';
import { SmartAvatar } from '../../../components/ui/SmartAvatar';
import type { Person } from '../../../types';
import { ConfidenceBadge } from './ConfidenceBadge';
import { getKindiPersonContextLabel } from '../logic/kindiPersonContext';
import type { KindiConfirmation, KindiMessage, KindiPersonResult } from '../types';

type ConfirmationDetailRow = {
  label: string;
  value: string;
};

interface KindiOverlayProps {
  isOpen: boolean;
  draft: string;
  messages: KindiMessage[];
  peopleById?: Record<string, Person>;
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

const toConfirmationDisplayValue = (value: unknown): string | undefined => {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const text = String(value).replace(/\s+/g, ' ').trim();
  return text || undefined;
};

const KindiPersonCard = ({
  person,
  onFocus,
  disabled = false,
  result,
  actionLabel,
  contextLabel,
}: {
  person: Person;
  onFocus: (id: string) => void;
  disabled?: boolean;
  result?: KindiPersonResult;
  actionLabel?: string;
  contextLabel?: string;
}) => (
  <button
    type="button"
    onClick={() => onFocus(person.id)}
    disabled={disabled}
    className="flex w-full items-center gap-3 rounded-2xl border border-[var(--border-soft)]/80 bg-[var(--surface-panel)]/80 px-3 py-2.5 text-start shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--surface-hover)] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
  >
    <SmartAvatar
      person={person}
      size={42}
      className="rounded-2xl ring-1 ring-[var(--border-soft)]/50 shadow-sm"
    />
    <div className="min-w-0 flex-1">
      <div className="flex min-w-0 items-center gap-2">
        <div className="truncate text-sm font-bold text-[var(--text-main)]">{personName(person)}</div>
        {result && <ConfidenceBadge matchLevel={result.matchLevel} />}
      </div>
      <div className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
        {[person.birthDate, person.birthPlace].filter(Boolean).join(' · ') || 'Person profile'}
      </div>
      {contextLabel && (
        <div className="mt-0.5 truncate text-[11px] font-bold text-[var(--primary-600)]">
          {contextLabel}
        </div>
      )}
    </div>
    {actionLabel && (
      <span className="shrink-0 rounded-full border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-2 py-1 text-[10px] font-black text-[var(--primary-600)]">
        {actionLabel}
      </span>
    )}
  </button>
);

const getConfirmationDetailRows = (confirmation: KindiConfirmation): ConfirmationDetailRow[] => {
  const plan = confirmation.plan;
  if (!plan) return [];

  if (plan.type === 'ADD') {
    const rows: ConfirmationDetailRow[] = [];
    const fullName = [plan.name?.firstName, plan.name?.lastName].filter(Boolean).join(' ').trim();
    const updates = plan.initialUpdates ?? {};

    if (fullName) rows.push({ label: 'الاسم', value: fullName });
    const birthDate = toConfirmationDisplayValue(updates.birthDate);
    const birthPlace = toConfirmationDisplayValue(updates.birthPlace);
    const profession = toConfirmationDisplayValue(updates.profession);
    const deathDate = toConfirmationDisplayValue(updates.deathDate);
    const deathPlace = toConfirmationDisplayValue(updates.deathPlace);
    const residence = toConfirmationDisplayValue(updates.residence);
    const bio = toConfirmationDisplayValue(updates.bio);

    if (birthDate) rows.push({ label: 'تاريخ الميلاد', value: birthDate });
    if (birthPlace) rows.push({ label: 'مكان الميلاد', value: birthPlace });
    if (profession) rows.push({ label: 'المهنة', value: profession });
    if (residence) rows.push({ label: 'السكن', value: residence });
    if (deathDate) rows.push({ label: 'تاريخ الوفاة', value: deathDate });
    if (deathPlace) rows.push({ label: 'مكان الوفاة', value: deathPlace });
    if (bio) rows.push({ label: 'ملاحظات', value: bio });

    return rows;
  }

  if (plan.type === 'UPDATE') {
    const labels: Partial<Record<keyof Person, string>> = {
      firstName: 'الاسم الأول',
      middleName: 'الاسم الأوسط',
      nickName: 'الكنية',
      lastName: 'اسم العائلة',
      birthDate: 'تاريخ الميلاد',
      birthPlace: 'مكان الميلاد',
      residence: 'السكن',
      deathDate: 'تاريخ الوفاة',
      deathPlace: 'مكان الوفاة',
      profession: 'المهنة',
      bio: 'ملاحظات',
    };

    return Object.entries(plan.updates)
      .map(([key, value]) => ({
        label: labels[key as keyof Person] ?? key,
        value: value === '' ? 'فارغ' : toConfirmationDisplayValue(value),
      }))
      .filter((row): row is ConfirmationDetailRow => Boolean(row.value));
  }

  return [];
};

const KindiConfirmCard = ({
  confirmation,
  onConfirm,
  onCancel,
}: {
  confirmation: KindiConfirmation;
  onConfirm: (confirmation: KindiConfirmation) => void;
  onCancel: (confirmation?: KindiConfirmation) => void;
}) => {
  const detailRows = getConfirmationDetailRows(confirmation);

  return (
    <div className={`mt-3 rounded-2xl border p-3.5 shadow-md transition-all duration-300 ${
      confirmation.status === 'confirmed'
        ? 'border-[var(--color-success-500)]/30 bg-[var(--color-success-500)]/10 shadow-[0_0_15px_rgba(var(--color-success-500-rgb,16,185,129),0.05)]'
        : confirmation.status === 'processing'
          ? 'border-[var(--color-info-500)]/30 bg-[var(--color-info-500)]/10 animate-pulse'
        : confirmation.status === 'failed'
          ? 'border-[var(--danger-500)]/30 bg-[var(--danger-500)]/10'
        : confirmation.status === 'cancelled'
          ? 'border-[var(--border-soft)] bg-[var(--surface-subtle)] opacity-75'
          : confirmation.kind === 'DELETE'
        ? 'border-[var(--danger-500)]/30 bg-[var(--danger-500)]/10 shadow-[0_0_15px_rgba(var(--danger-rgb,239,68,68),0.05)]'
        : 'border-[var(--color-warning-500)]/30 bg-[var(--color-warning-500)]/10 shadow-[0_0_15px_rgba(var(--color-warning-rgb,245,158,11),0.05)]'
    }`}>
      <div className="flex items-start gap-2.5">
        <ShieldCheck className={`mt-0.5 h-4.5 w-4.5 shrink-0 ${
          confirmation.kind === 'DELETE' ? 'text-[var(--danger-600)]' : 'text-[var(--primary-600)]'
        }`} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-black text-[var(--text-main)]">{confirmation.title}</div>
          <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{confirmation.description}</p>
        </div>
      </div>
      {detailRows.length > 0 && (
        <div className="mt-3.5 rounded-xl border border-[var(--border-soft)]/60 bg-[var(--surface-panel)]/90 px-3 py-2.5">
          <div className="text-[10px] font-black tracking-wider text-[var(--primary-600)] uppercase">
            التفاصيل التي سيتم حفظها
          </div>
          <dl className="mt-2 grid gap-1.5">
            {detailRows.map((row) => (
              <div key={`${row.label}:${row.value}`} className="flex items-start justify-between gap-3 text-xs leading-5">
                <dt className="shrink-0 font-bold text-[var(--text-muted)]">{row.label}</dt>
                <dd className="min-w-0 text-end font-black text-[var(--text-main)]">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      {confirmation.status && confirmation.status !== 'pending' && (
        <div className="mt-3 rounded-xl bg-[var(--surface-panel)]/90 px-3 py-2 text-xs font-bold text-[var(--text-secondary)]">
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
        <div className="mt-3.5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => onCancel(confirmation)}
            className="rounded-full px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)]"
          >
            {confirmation.cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => onConfirm(confirmation)}
            className={`inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:brightness-95 ${
              confirmation.kind === 'DELETE'
                ? 'bg-[var(--danger-600)]'
                : 'bg-[var(--primary-600)]'
            }`}
          >
            <Check className="h-3.5 w-3.5" />
            {confirmation.confirmLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
};

export const KindiOverlay: React.FC<KindiOverlayProps> = memo(({
  isOpen,
  draft,
  messages,
  peopleById = {},
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
  const activeConfirmation = [...messages]
    .reverse()
    .find((m) => m.confirmation && (!m.confirmation.status || m.confirmation.status === 'pending'))
    ?.confirmation;
  const activeDisambiguationMessage = [...messages]
    .reverse()
    .find((m) => m.disambiguation && (!m.disambiguation.status || m.disambiguation.status === 'pending'));

  // Setup dynamic keyboard shortcuts listener for confirmations (Enter/Escape)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (activeConfirmation) {
          onCancel(activeConfirmation);
        } else if (activeDisambiguationMessage) {
          onCancelDisambiguation(activeDisambiguationMessage.id);
        } else {
          onClose();
        }
      }

      if (
        e.key === 'Enter'
        && activeConfirmation
        && activeConfirmation.kind !== 'DELETE'
        && (e.ctrlKey || e.metaKey)
      ) {
        // Prevent double trigger if buttons are focused.
        if (document.activeElement?.tagName !== 'BUTTON') {
          e.preventDefault();
          onConfirm(activeConfirmation);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeConfirmation, activeDisambiguationMessage, isOpen, onConfirm, onCancel, onCancelDisambiguation, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [isOpen, isThinking, messages]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !hasPendingDecision) {
      onClose();
    }
  };

  return (
    <div
      data-testid="kindi-backdrop"
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[var(--z-index-modal)] flex justify-end bg-black/10 backdrop-blur-[2px] transition-all duration-300"
    >
      {/* Self-contained Premium Styles for transitions and scrollbars */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes kindi-drawer-slide-in {
          from {
            transform: translateX(100%);
            opacity: 0.9;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        [dir="rtl"] @keyframes kindi-drawer-slide-in {
          from {
            transform: translateX(-100%);
            opacity: 0.9;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes kindi-slide-up {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .kindi-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .kindi-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .kindi-scrollbar::-webkit-scrollbar-thumb {
          background: var(--border-soft);
          border-radius: 99px;
        }
        .kindi-scrollbar::-webkit-scrollbar-thumb:hover {
          background: var(--primary-600);
        }
        .animate-kindi-drawer {
          animation: kindi-drawer-slide-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-kindi-message {
          animation: kindi-slide-up 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />

      <section
        role="dialog"
        aria-modal="true"
        aria-label="Kindi intelligent assistant"
        className="animate-kindi-drawer flex h-[calc(100vh-2rem)] sm:h-[calc(100vh-3rem)] w-full max-w-md sm:max-w-[480px] flex-col overflow-hidden rounded-[2rem] border border-[var(--border-main)]/60 bg-[var(--surface-app)]/85 backdrop-blur-xl shadow-2xl m-4 sm:my-6 sm:me-6 sm:ms-0"
      >
        <header className="flex items-center justify-between border-b border-[var(--border-soft)]/50 px-4 py-3.5 bg-[var(--surface-app)]/40">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-[var(--primary-600)] shadow-sm ring-1 ring-[var(--border-soft)]/50">
              <KindiIcon size={38} className="h-9 w-9 object-contain" />
            </div>
            <div>
              <h2 className="text-sm font-black text-[var(--text-main)]">Kindi</h2>
              <p className="text-xs text-[var(--text-muted)]">Search and tree-control assistant</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[var(--text-muted)] transition-all hover:bg-[var(--surface-hover)] hover:text-[var(--text-main)] hover:scale-105 active:scale-95"
            aria-label="Close Kindi"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 kindi-scrollbar bg-transparent">
          {messages.map((message) => (
            <div key={message.id} className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
              {message.role !== 'user' && (
                <div className="me-2 mt-1 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--primary-600)] shadow-sm ring-1 ring-[var(--border-soft)]/50 animate-kindi-message">
                  <KindiIcon size={28} className="h-7 w-7 object-contain" />
                </div>
              )}
              <div className={`animate-kindi-message max-w-[88%] rounded-3xl px-4 py-3 shadow-sm transition-all duration-300 ${
                message.role === 'user'
                  ? 'bg-[var(--primary-600)] text-white rounded-te-sm'
                  : 'border border-[var(--border-soft)]/60 bg-[var(--surface-panel)]/80 backdrop-blur-md text-[var(--text-main)] rounded-ts-sm'
              }`}>
                <p className="text-sm leading-6">{message.text}</p>
                {message.people && message.people.length > 0 && (
                  <div className="mt-3 grid gap-2 animate-kindi-message">
                    {message.people.slice(0, message.visiblePeopleCount ?? message.people.length).map((person) => (
                      <KindiPersonCard
                        key={person.id}
                        person={person}
                        disabled={message.disambiguation?.status && message.disambiguation.status !== 'pending'}
                        contextLabel={message.disambiguation ? getKindiPersonContextLabel(person, peopleById) : undefined}
                        actionLabel={message.disambiguation
                          ? (!message.disambiguation.status || message.disambiguation.status === 'pending'
                            ? 'Choose'
                            : message.disambiguation.status)
                          : undefined}
                        onFocus={message.disambiguation
                          ? (personId) => onChooseDisambiguation(message.id, personId)
                          : onFocusPerson}
                      />
                    ))}
                    {(message.visiblePeopleCount ?? message.people.length) < message.people.length && (
                      <button
                        type="button"
                        onClick={() => onShowMorePeople(message.id)}
                        className="rounded-2xl border border-dashed border-[var(--primary-600)]/25 bg-[var(--surface-subtle)] px-3 py-3 text-sm font-black text-[var(--primary-600)] transition hover:-translate-y-0.5 hover:bg-[var(--surface-hover)]"
                      >
                        عرض المزيد ({message.people.length - (message.visiblePeopleCount ?? 0)} متبقي)
                      </button>
                    )}
                    {message.disambiguation && (!message.disambiguation.status || message.disambiguation.status === 'pending') && (
                      <button
                        type="button"
                        onClick={() => onCancelDisambiguation(message.id)}
                        className="justify-self-end rounded-full px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)]"
                      >
                        إلغاء
                      </button>
                    )}
                    {message.disambiguation?.status === 'cancelled' && (
                      <div className="rounded-xl bg-[var(--surface-panel)] px-3 py-2 text-xs font-bold text-[var(--text-secondary)]">
                        تم إلغاء هذا الاختيار، ولم يتم تغيير أي بيانات.
                      </div>
                    )}
                  </div>
                )}
                {message.peopleResults && message.peopleResults.length > 0 && (
                  <div className="mt-3 grid gap-2 animate-kindi-message">
                    {message.peopleResults.slice(0, message.visiblePeopleCount ?? message.peopleResults.length).map((result) => (
                      <KindiPersonCard
                        key={result.person.id}
                        person={result.person}
                        result={result}
                        onFocus={onFocusPerson}
                      />
                    ))}
                    {(message.visiblePeopleCount ?? message.peopleResults.length) < message.peopleResults.length && (
                      <button
                        type="button"
                        onClick={() => onShowMorePeople(message.id)}
                        className="rounded-2xl border border-dashed border-[var(--primary-600)]/25 bg-[var(--surface-subtle)] px-3 py-3 text-sm font-black text-[var(--primary-600)] transition hover:-translate-y-0.5 hover:bg-[var(--surface-hover)]"
                      >
                        عرض المزيد ({message.peopleResults.length - (message.visiblePeopleCount ?? 0)} متبقي)
                      </button>
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
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--surface-panel)]/80 backdrop-blur-md px-3.5 py-2 text-xs font-bold text-[var(--text-muted)] shadow-sm animate-kindi-message">
              <Sparkles className="h-3.5 w-3.5 animate-pulse text-[var(--primary-600)]" />
              <span>Kindi is thinking</span>
              <span className="flex items-center gap-0.5" aria-hidden="true">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--primary-600)] [animation-delay:-0.25s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--primary-600)] [animation-delay:-0.12s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--primary-600)]" />
              </span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form
          className="border-t border-[var(--border-soft)]/50 bg-[var(--surface-panel)]/40 p-4 backdrop-blur-md"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div className={`flex items-center gap-2 rounded-full border px-3.5 py-2 shadow-inner transition-all duration-300 ${
            isListening
              ? 'border-[var(--danger-500)] bg-[var(--danger-500)]/10 ring-2 ring-[var(--danger-500)]/30'
              : 'border-[var(--border-soft)] bg-[var(--surface-subtle)] focus-within:border-[var(--primary-600)]/50 focus-within:ring-2 focus-within:ring-[var(--primary-600)]/15'
          }`}>
            {hasPendingDecision ? (
              <div className="flex flex-1 items-center justify-between gap-2 text-[11px] font-bold text-[var(--text-secondary)]">
                <span className="truncate">تأكيد القرار معلق حالياً...</span>
                <div className="flex items-center gap-1.5 shrink-0 select-none">
                  {activeConfirmation?.kind !== 'DELETE' && (
                    <>
                      <span className="flex items-center gap-0.5 rounded border border-[var(--border-soft)] bg-[var(--surface-panel)] px-1.5 py-0.5 font-mono text-[9px] text-[var(--text-main)] shadow-sm">
                        Ctrl Enter <CornerDownLeft className="h-2.5 w-2.5" />
                      </span>
                      <span className="text-[var(--text-muted)] text-[9px]">للتأكيد</span>
                    </>
                  )}
                  <span className="flex items-center gap-0.5 rounded border border-[var(--border-soft)] bg-[var(--surface-panel)] px-1.5 py-0.5 font-mono text-[9px] text-[var(--text-main)] shadow-sm">
                    Esc
                  </span>
                  <span className="text-[var(--text-muted)] text-[9px]">للتراجع</span>
                </div>
              </div>
            ) : (
              <input
                value={draft}
                onChange={(event) => onDraftChange(event.target.value)}
                placeholder={isListening ? 'Listening...' : 'Ask Kindi: children of Mahmoud, add a son...'}
                aria-label="Kindi message"
                className="min-w-0 flex-1 bg-transparent text-sm font-medium text-[var(--text-main)] outline-none placeholder:text-[var(--text-muted)]"
                autoFocus
              />
            )}
            {isVoiceSupported && (
              <button
                type="button"
                onClick={onToggleVoice}
                disabled={hasPendingDecision}
                className={`rounded-full p-2 transition ${
                  isListening
                    ? 'bg-[var(--danger-500)] text-white shadow-sm'
                    : 'text-[var(--text-muted)] hover:bg-[var(--primary-600)]/10 hover:text-[var(--primary-600)]'
                }`}
                aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
            )}
            <button
              type="submit"
              disabled={!draft.trim() || isThinking || hasPendingDecision}
              className="rounded-full bg-[var(--primary-600)] p-2 text-white shadow-sm transition hover:bg-[var(--primary-700)] disabled:opacity-40"
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
