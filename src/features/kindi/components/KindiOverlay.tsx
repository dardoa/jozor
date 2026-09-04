import React, { memo, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  BookOpen,
  Check,
  CornerDownLeft,
  MessageSquarePlus,
  Mic,
  MicOff,
  ListChecks,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  SquarePen,
  UserPlus,
  UsersRound,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { KindiIcon } from '../../../components/icons/KindiIcon';
import { SmartAvatar } from '../../../components/ui/SmartAvatar';
import { useTranslation } from '../../../context/TranslationContext';
import type { Person } from '../../../types/person';
import { getDisplayDate } from '../../../utils/familyLogic';
import type { TranslationSchema } from '../../../utils/translationLoader';
import { ConfidenceBadge } from './ConfidenceBadge';
import { KindiAnswerFeedback, KindiAnswerHeader } from './KindiAnswerMeta';
import { KindiBiographyDraft } from './KindiBiographyDraft';
import { KindiDiagnosticSummary } from './KindiDiagnosticSummary';
import { KindiRecordReview } from './KindiRecordReview';
import { getKindiPersonContextLabel } from '../logic/kindiPersonContext';
import { isKindiGuidedUpdateField } from '../logic/kindiGuidedUpdate';
import type {
  KindiAnswerFeedback as KindiAnswerFeedbackValue,
  KindiConfirmation,
  KindiDiagnosticSuggestion,
  KindiDiagnosticTargetSection,
  KindiDiagnosticTargetField,
  KindiDiagnosticTargetTab,
  KindiMessage,
  KindiPersonResult,
  KindiUndoAction,
} from '../types';

type ConfirmationDetailRow = {
  label: string;
  value: string;
};

type KindiUiText = TranslationSchema['kindi'];

interface KindiOverlayProps {
  isOpen: boolean;
  draft: string;
  messages: KindiMessage[];
  peopleById?: Record<string, Person>;
  contextPerson?: Person;
  isThinking: boolean;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  onFocusPerson: (personId: string) => void;
  onOpenPersonRecord?: (
    personId: string,
    targetTab?: KindiDiagnosticTargetTab,
    targetSection?: KindiDiagnosticTargetSection,
    targetField?: KindiDiagnosticTargetField
  ) => void;
  onPrepareDiagnosticUpdate?: (suggestion: KindiDiagnosticSuggestion) => boolean;
  onConfirm: (confirmation: KindiConfirmation) => void;
  onCancel: (confirmation?: KindiConfirmation) => void;
  onCancelDisambiguation: (messageId: string) => void;
  onShowMorePeople: (messageId: string) => void;
  onChooseDisambiguation: (messageId: string, personId: string) => void;
  onStartNewConversation: () => void;
  onUndoChange: (messageId: string, undoAction: KindiUndoAction) => void;
  onRateAnswer: (messageId: string, feedback: KindiAnswerFeedbackValue) => void;
  hasPendingDecision?: boolean;
  isListening?: boolean;
  isVoiceSupported?: boolean;
  voiceError?: string | null;
  onToggleVoice?: () => void;
}

const KINDI_OVERLAY_STYLES = `
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
  @media (prefers-reduced-motion: reduce) {
    .animate-kindi-drawer,
    .animate-kindi-message {
      animation: none;
    }
  }
`;

const personName = (person: Person, unnamedPersonLabel: string) =>
  [person.firstName, person.middleName, person.lastName].filter(Boolean).join(' ').trim() || unnamedPersonLabel;

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
  text,
}: {
  person: Person;
  onFocus: (id: string) => void;
  disabled?: boolean;
  result?: KindiPersonResult;
  actionLabel?: string;
  contextLabel?: string;
  text: KindiUiText;
}) => (
  <button
    type="button"
    onClick={() => onFocus(person.id)}
    disabled={disabled}
    className="flex w-full items-center gap-3 rounded-2xl border border-[var(--border-soft)]/80 bg-[var(--surface-panel)]/80 px-3 py-2.5 text-start shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--surface-hover)] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
  >
    <span aria-hidden="true" className="shrink-0">
      <SmartAvatar
        person={person}
        size={42}
        className="rounded-2xl ring-1 ring-[var(--border-soft)]/50 shadow-sm"
      />
    </span>
    <div className="min-w-0 flex-1">
      <div className="flex min-w-0 items-center gap-2">
        <div className="truncate text-sm font-bold text-[var(--text-main)]">{personName(person, text.unnamedPerson)}</div>
        {result && (
          <ConfidenceBadge
            matchLevel={result.matchLevel}
            strongLabel={text.strongMatch}
            nearbyLabel={text.nearbyMatch}
          />
        )}
      </div>
      <div className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
        {[getDisplayDate(person.birthDate), person.birthPlace].filter(Boolean).join(' · ') || text.personProfile}
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

const getConfirmationDetailRows = (confirmation: KindiConfirmation, text: KindiUiText): ConfirmationDetailRow[] => {
  const plan = confirmation.plan;
  if (!plan) return [];

  if (plan.type === 'ADD') {
    const rows: ConfirmationDetailRow[] = [];
    const fullName = [plan.name?.firstName, plan.name?.lastName].filter(Boolean).join(' ').trim();
    const updates = plan.initialUpdates ?? {};

    if (fullName) rows.push({ label: text.fields.name, value: fullName });
    const birthDate = toConfirmationDisplayValue(updates.birthDate);
    const birthPlace = toConfirmationDisplayValue(updates.birthPlace);
    const profession = toConfirmationDisplayValue(updates.profession);
    const deathDate = toConfirmationDisplayValue(updates.deathDate);
    const deathPlace = toConfirmationDisplayValue(updates.deathPlace);
    const residence = toConfirmationDisplayValue(updates.residence);
    const bio = toConfirmationDisplayValue(updates.bio);

    if (birthDate) rows.push({ label: text.fields.birthDate, value: birthDate });
    if (birthPlace) rows.push({ label: text.fields.birthPlace, value: birthPlace });
    if (profession) rows.push({ label: text.fields.profession, value: profession });
    if (residence) rows.push({ label: text.fields.residence, value: residence });
    if (deathDate) rows.push({ label: text.fields.deathDate, value: deathDate });
    if (deathPlace) rows.push({ label: text.fields.deathPlace, value: deathPlace });
    if (bio) rows.push({ label: text.fields.bio, value: bio });

    return rows;
  }

  if (plan.type === 'UPDATE') {
    const labels: Partial<Record<keyof Person, string>> = {
      firstName: text.fields.firstName,
      middleName: text.fields.middleName,
      nickName: text.fields.nickName,
      lastName: text.fields.lastName,
      birthDate: text.fields.birthDate,
      birthPlace: text.fields.birthPlace,
      residence: text.fields.residence,
      deathDate: text.fields.deathDate,
      deathPlace: text.fields.deathPlace,
      profession: text.fields.profession,
      bio: text.fields.bio,
    };

    return Object.entries(plan.updates)
      .map(([key, value]) => ({
        label: labels[key as keyof Person] ?? key,
        value: value === '' ? text.emptyValue : toConfirmationDisplayValue(value),
      }))
      .filter((row): row is ConfirmationDetailRow => Boolean(row.value));
  }

  return [];
};

const KindiConfirmCard = ({
  confirmation,
  onConfirm,
  onCancel,
  text,
}: {
  confirmation: KindiConfirmation;
  onConfirm: (confirmation: KindiConfirmation) => void;
  onCancel: (confirmation?: KindiConfirmation) => void;
  text: KindiUiText;
}) => {
  const detailRows = getConfirmationDetailRows(confirmation, text);

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
            {text.detailsHeading}
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
        <div
          role="status"
          aria-live="polite"
          className="mt-3 rounded-xl bg-[var(--surface-panel)]/90 px-3 py-2 text-xs font-bold text-[var(--text-secondary)]"
        >
          {confirmation.status === 'confirmed'
            ? text.confirmedStatus
            : confirmation.status === 'processing'
              ? text.processingStatus
            : confirmation.status === 'failed'
              ? confirmation.error || text.failedStatus
              : text.cancelledStatus}
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
  contextPerson,
  isThinking,
  onDraftChange,
  onSubmit,
  onClose,
  onFocusPerson,
  onOpenPersonRecord,
  onPrepareDiagnosticUpdate,
  onConfirm,
  onCancel,
  onCancelDisambiguation,
  onShowMorePeople,
  onChooseDisambiguation,
  onStartNewConversation,
  onUndoChange,
  onRateAnswer,
  hasPendingDecision = false,
  isListening = false,
  isVoiceSupported = false,
  voiceError = null,
  onToggleVoice,
}) => {
  const { t, language } = useTranslation();
  const kindiText = t.kindi;
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const activeConfirmation = [...messages]
    .reverse()
    .find((m) => m.confirmation && (!m.confirmation.status || m.confirmation.status === 'pending'))
    ?.confirmation;
  const activeDisambiguationMessage = [...messages]
    .reverse()
    .find((m) => m.disambiguation && (!m.disambiguation.status || m.disambiguation.status === 'pending'));
  const canStartNewConversation = messages.length > 1 && !hasPendingDecision && !isThinking;
  const showStarterActions = messages.length === 1 && !isThinking;

  useLayoutEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());

    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  // Setup dynamic keyboard shortcuts listener for confirmations (Enter/Escape)
  useLayoutEffect(() => {
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

      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )).filter((element) => !element.hasAttribute('hidden'));
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
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
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    messagesEndRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'end' });
  }, [isOpen, isThinking, messages]);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !hasPendingDecision) {
      onClose();
    }
  };

  return createPortal(
    <div
      data-testid="kindi-backdrop"
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[var(--z-index-modal)] flex justify-end bg-black/10 backdrop-blur-[2px] transition-all duration-300"
    >
      <style>{KINDI_OVERLAY_STYLES}</style>

      <section
        id="kindi-dialog"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={kindiText.dialogLabel}
        className="animate-kindi-drawer flex h-full sm:h-[calc(100vh-3rem)] w-full sm:max-w-[480px] flex-col overflow-hidden rounded-none sm:rounded-[2rem] border-none sm:border sm:border-[var(--border-main)]/60 bg-[var(--surface-app)] sm:bg-[var(--surface-app)]/85 sm:backdrop-blur-xl shadow-2xl m-0 sm:my-6 sm:me-6 sm:ms-0"
      >
        <header className="flex items-center justify-between border-b border-[var(--border-soft)]/50 px-4 py-3.5 bg-[var(--surface-app)] sm:bg-[var(--surface-app)]/40">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-[var(--primary-600)] shadow-sm ring-1 ring-[var(--border-soft)]/50">
              <KindiIcon size={38} className="h-9 w-9 object-contain" />
            </div>
            <div>
              <h2 className="text-sm font-black text-[var(--text-main)]">{kindiText.title}</h2>
              <p className="text-xs text-[var(--text-muted)]">{kindiText.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onStartNewConversation}
              disabled={!canStartNewConversation}
              className="rounded-full p-2 text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-main)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-600)] disabled:cursor-not-allowed disabled:opacity-35"
              aria-label={kindiText.newConversation}
              title={hasPendingDecision ? kindiText.newConversationUnavailable : kindiText.newConversation}
            >
              <MessageSquarePlus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-[var(--text-muted)] transition-all hover:bg-[var(--surface-hover)] hover:text-[var(--text-main)] hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-600)]"
              aria-label={kindiText.close}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div
          role="log"
          aria-label={kindiText.conversationLabel}
          aria-live="polite"
          aria-relevant="additions text"
          className="flex-1 space-y-4 overflow-y-auto px-4 py-4 kindi-scrollbar bg-transparent"
        >
          {messages.map((message) => (
            <article
              key={message.id}
              aria-label={message.role === 'user'
                ? kindiText.userMessageLabel
                : kindiText.assistantMessageLabel}
              className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
            >
              {message.role !== 'user' && (
                <div
                  aria-hidden="true"
                  className="me-2 mt-1 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--primary-600)] shadow-sm ring-1 ring-[var(--border-soft)]/50 animate-kindi-message"
                >
                  <KindiIcon size={28} className="h-7 w-7 object-contain" />
                </div>
              )}
              <div className={`animate-kindi-message max-w-[88%] rounded-3xl px-4 py-3 shadow-sm transition-all duration-300 ${
                message.role === 'user'
                  ? 'bg-[var(--primary-600)] text-white rounded-te-sm'
                  : 'border border-[var(--border-soft)]/60 bg-[var(--surface-panel)]/80 backdrop-blur-md text-[var(--text-main)] rounded-ts-sm'
              }`}>
                {message.role === 'assistant' && message.answerMeta && (
                  <KindiAnswerHeader answer={message.answerMeta} text={kindiText} />
                )}
                <p className="text-sm leading-6">{message.text}</p>
                {message.diagnosticSummary && (
                  <KindiDiagnosticSummary summary={message.diagnosticSummary} text={kindiText} />
                )}
                {message.biographyDraft && (
                  <KindiBiographyDraft draft={message.biographyDraft} text={kindiText} />
                )}
                {message.recordReview && (
                  <KindiRecordReview
                    review={message.recordReview}
                    text={kindiText}
                    onOpenRecord={message.recordReviewTargetPersonId && onOpenPersonRecord
                      ? () => onOpenPersonRecord(
                        message.recordReviewTargetPersonId!,
                        'about',
                        'workBio'
                      )
                      : undefined}
                  />
                )}
                {message.diagnosticSuggestions && message.diagnosticSuggestions.length > 0 && (
                  <section
                    className="mt-3 border-y border-[var(--border-soft)]/70 py-2.5"
                    aria-label={kindiText.diagnosticNextSteps}
                    data-testid="kindi-diagnostic-suggestions"
                  >
                    <h3 className="flex items-center gap-1.5 text-xs font-black text-[var(--text-main)]">
                      <ListChecks className="h-3.5 w-3.5 text-[var(--primary-600)]" aria-hidden="true" />
                      {kindiText.diagnosticNextSteps}
                    </h3>
                    <ul className="mt-2 divide-y divide-[var(--border-soft)]/70 text-xs leading-5 text-[var(--text-secondary)]">
                      {message.diagnosticSuggestions.map((suggestion) => (
                        <li key={`${suggestion.key}:${suggestion.targetPersonId}`} className="flex flex-col gap-2 py-2 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:gap-3">
                          <span className="min-w-0 flex-1">{suggestion.text}</span>
                          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                            {onPrepareDiagnosticUpdate && isKindiGuidedUpdateField(suggestion.targetField) && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (onPrepareDiagnosticUpdate(suggestion)) inputRef.current?.focus();
                                }}
                                aria-label={`${suggestion.text} · ${kindiText.diagnosticCompleteWithKindi}`}
                                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[var(--primary-600)] px-2.5 py-1 text-[10px] font-black text-white transition hover:bg-[var(--primary-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-600)] focus-visible:ring-offset-2"
                              >
                                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>{kindiText.diagnosticCompleteWithKindi}</span>
                              </button>
                            )}
                            {onOpenPersonRecord && (
                              <button
                                type="button"
                                onClick={() => onOpenPersonRecord(
                                  suggestion.targetPersonId,
                                  suggestion.targetTab,
                                  suggestion.targetSection,
                                  suggestion.targetField
                                )}
                                aria-label={`${suggestion.text} · ${kindiText.diagnosticOpenRecord}`}
                                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--primary-600)]/25 bg-[var(--surface-subtle)] px-2.5 py-1 text-[10px] font-black text-[var(--primary-600)] transition hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-600)]"
                              >
                                <SquarePen className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>{kindiText.diagnosticOpenRecord}</span>
                              </button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                {message.helpTopicId && (
                  <Link
                    to={`/help?topic=${encodeURIComponent(message.helpTopicId)}`}
                    className="mt-3 inline-flex items-center gap-2 rounded-full border border-[var(--primary-600)]/25 bg-[var(--surface-subtle)] px-3 py-1.5 text-xs font-black text-[var(--primary-600)] transition hover:bg-[var(--surface-hover)]"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    {t.help.openTopic}
                  </Link>
                )}
                {message.people && message.people.length > 0 && (
                  <div className="mt-3 grid gap-2 animate-kindi-message">
                    {message.people.slice(0, message.visiblePeopleCount ?? message.people.length).map((person) => (
                      <KindiPersonCard
                        key={person.id}
                        person={person}
                        disabled={message.disambiguation?.status && message.disambiguation.status !== 'pending'}
                        contextLabel={message.disambiguation
                          ? getKindiPersonContextLabel(person, peopleById, language)
                          : message.personContexts?.find((item) => item.personId === person.id)?.summary
                            ?? message.diagnosticPersonContexts?.find((item) => item.personId === person.id)?.summary}
                        actionLabel={message.disambiguation
                          ? (!message.disambiguation.status || message.disambiguation.status === 'pending'
                            ? kindiText.choose
                            : undefined)
                          : message.answerMeta?.kind === 'diagnostic'
                            ? kindiText.diagnosticOpenRecord
                            : undefined}
                        text={kindiText}
                        onFocus={message.disambiguation
                          ? (personId) => onChooseDisambiguation(message.id, personId)
                          : message.answerMeta?.kind === 'diagnostic' && onOpenPersonRecord
                            ? (personId) => onOpenPersonRecord(personId, 'about', 'overview')
                            : onFocusPerson}
                      />
                    ))}
                    {(message.visiblePeopleCount ?? message.people.length) < message.people.length && (
                      <button
                        type="button"
                        onClick={() => onShowMorePeople(message.id)}
                        className="rounded-2xl border border-dashed border-[var(--primary-600)]/25 bg-[var(--surface-subtle)] px-3 py-3 text-sm font-black text-[var(--primary-600)] transition hover:-translate-y-0.5 hover:bg-[var(--surface-hover)]"
                      >
                        {kindiText.showMore} ({message.people.length - (message.visiblePeopleCount ?? 0)} {kindiText.remaining})
                      </button>
                    )}
                    {message.disambiguation && (!message.disambiguation.status || message.disambiguation.status === 'pending') && (
                      <button
                        type="button"
                        onClick={() => onCancelDisambiguation(message.id)}
                        className="justify-self-end rounded-full px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)]"
                      >
                        {kindiText.cancel}
                      </button>
                    )}
                    {message.disambiguation?.status === 'cancelled' && (
                      <div
                        role="status"
                        aria-live="polite"
                        className="rounded-xl bg-[var(--surface-panel)] px-3 py-2 text-xs font-bold text-[var(--text-secondary)]"
                      >
                        {kindiText.selectionCancelled}
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
                        text={kindiText}
                        onFocus={onFocusPerson}
                      />
                    ))}
                    {(message.visiblePeopleCount ?? message.peopleResults.length) < message.peopleResults.length && (
                      <button
                        type="button"
                        onClick={() => onShowMorePeople(message.id)}
                        className="rounded-2xl border border-dashed border-[var(--primary-600)]/25 bg-[var(--surface-subtle)] px-3 py-3 text-sm font-black text-[var(--primary-600)] transition hover:-translate-y-0.5 hover:bg-[var(--surface-hover)]"
                      >
                        {kindiText.showMore} ({message.peopleResults.length - (message.visiblePeopleCount ?? 0)} {kindiText.remaining})
                      </button>
                    )}
                  </div>
                )}
                {message.confirmation && (
                  <KindiConfirmCard
                    confirmation={message.confirmation}
                    onConfirm={onConfirm}
                    onCancel={onCancel}
                    text={kindiText}
                  />
                )}
                {message.undoAction && (
                  <div className="mt-3 border-t border-[var(--border-soft)]/60 pt-2.5">
                    {message.undoAction.status === 'available' ? (
                      <button
                        type="button"
                        onClick={() => onUndoChange(message.id, message.undoAction as KindiUndoAction)}
                        className="inline-flex items-center gap-1.5 text-xs font-black text-[var(--primary-600)] transition hover:text-[var(--primary-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-600)]"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        {kindiText.undoChange}
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--text-muted)]">
                        <RotateCcw className="h-3.5 w-3.5" />
                        {message.undoAction.status === 'undone'
                          ? kindiText.undoDone
                          : message.undoAction.status === 'expired'
                            ? kindiText.undoExpired
                            : kindiText.undoFailed}
                      </span>
                    )}
                  </div>
                )}
                {message.role === 'assistant' && message.answerMeta && (
                  <KindiAnswerFeedback
                    messageId={message.id}
                    answer={message.answerMeta}
                    text={kindiText}
                    onRate={onRateAnswer}
                  />
                )}
              </div>
            </article>
          ))}
          {showStarterActions && (
            <div className="ms-10 animate-kindi-message" data-testid="kindi-starter-actions">
              {contextPerson && (
                <div className="mb-2 flex min-w-0 items-center gap-2 text-xs text-[var(--text-muted)]">
                  <span>{kindiText.currentContext}</span>
                  <span aria-hidden="true">·</span>
                  <span className="truncate font-black text-[var(--text-main)]">
                    {personName(contextPerson, kindiText.unnamedPerson)}
                  </span>
                </div>
              )}
              <p className="mb-2 text-[11px] font-bold text-[var(--text-muted)]">{kindiText.startHere}</p>
              <div className="grid gap-1.5 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    onDraftChange(kindiText.starterFamilyPrompt);
                    inputRef.current?.focus();
                  }}
                  className="flex min-h-10 items-center gap-2 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel)] px-3 py-2 text-start text-xs font-bold text-[var(--text-main)] transition hover:border-[var(--primary-600)]/40 hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-600)]"
                >
                  <UsersRound className="h-4 w-4 shrink-0 text-[var(--primary-600)]" />
                  {kindiText.starterFamily}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDraftChange(kindiText.starterChangePrompt);
                    inputRef.current?.focus();
                  }}
                  className="flex min-h-10 items-center gap-2 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel)] px-3 py-2 text-start text-xs font-bold text-[var(--text-main)] transition hover:border-[var(--primary-600)]/40 hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-600)]"
                >
                  <UserPlus className="h-4 w-4 shrink-0 text-[var(--primary-600)]" />
                  {kindiText.starterChange}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDraftChange(kindiText.starterHelpPrompt);
                    inputRef.current?.focus();
                  }}
                  className="flex min-h-10 items-center gap-2 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel)] px-3 py-2 text-start text-xs font-bold text-[var(--text-main)] transition hover:border-[var(--primary-600)]/40 hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-600)] sm:col-span-2"
                >
                  <BookOpen className="h-4 w-4 shrink-0 text-[var(--primary-600)]" />
                  {kindiText.starterHelp}
                </button>
              </div>
            </div>
          )}
          {isThinking && (
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--surface-panel)]/80 backdrop-blur-md px-3.5 py-2 text-xs font-bold text-[var(--text-muted)] shadow-sm animate-kindi-message">
              <Sparkles className="h-3.5 w-3.5 animate-pulse text-[var(--primary-600)]" />
              <span>{kindiText.thinking}</span>
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
          className="border-t border-[var(--border-soft)]/50 bg-[var(--surface-panel)] sm:bg-[var(--surface-panel)]/40 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-4 sm:backdrop-blur-md"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          {voiceError && (
            <div
              role="alert"
              className="mb-2 rounded-lg border border-[var(--danger-500)]/25 bg-[var(--danger-500)]/10 px-3 py-2 text-xs font-bold text-[var(--danger-600)]"
            >
              {voiceError}
            </div>
          )}
          <div className={`flex items-center gap-2 rounded-full border px-3.5 py-2 shadow-inner transition-all duration-300 ${
            isListening
              ? 'border-[var(--danger-500)] bg-[var(--danger-500)]/10 ring-2 ring-[var(--danger-500)]/30'
              : 'border-[var(--border-soft)] bg-[var(--surface-subtle)] focus-within:border-[var(--primary-600)]/50 focus-within:ring-2 focus-within:ring-[var(--primary-600)]/15'
          }`}>
            {hasPendingDecision ? (
              <div className="flex flex-1 items-center justify-between gap-2 text-[11px] font-bold text-[var(--text-secondary)]">
                <span className="truncate">{kindiText.pendingDecision}</span>
                <div className="flex items-center gap-1.5 shrink-0 select-none">
                  {activeConfirmation?.kind !== 'DELETE' && (
                    <>
                      <span className="flex items-center gap-0.5 rounded border border-[var(--border-soft)] bg-[var(--surface-panel)] px-1.5 py-0.5 font-mono text-[9px] text-[var(--text-main)] shadow-sm">
                        Ctrl Enter <CornerDownLeft className="h-2.5 w-2.5" />
                      </span>
                      <span className="text-[var(--text-muted)] text-[9px]">{kindiText.confirmShortcut}</span>
                    </>
                  )}
                  <span className="flex items-center gap-0.5 rounded border border-[var(--border-soft)] bg-[var(--surface-panel)] px-1.5 py-0.5 font-mono text-[9px] text-[var(--text-main)] shadow-sm">
                    Esc
                  </span>
                  <span className="text-[var(--text-muted)] text-[9px]">{kindiText.cancelShortcut}</span>
                </div>
              </div>
            ) : (
              <input
                ref={inputRef}
                autoFocus
                value={draft}
                onChange={(event) => onDraftChange(event.target.value)}
                placeholder={isListening ? kindiText.listeningPlaceholder : kindiText.messagePlaceholder}
                aria-label={kindiText.messageLabel}
                className="min-w-0 flex-1 bg-transparent text-sm font-medium text-[var(--text-main)] outline-none placeholder:text-[var(--text-muted)]"
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
                aria-label={isListening ? kindiText.stopVoice : kindiText.startVoice}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
            )}
            <button
              type="submit"
              disabled={!draft.trim() || isThinking || hasPendingDecision}
              className="rounded-full bg-[var(--primary-600)] p-2 text-white shadow-sm transition hover:bg-[var(--primary-700)] disabled:opacity-40"
              aria-label={kindiText.send}
            >
              <Send className="h-4 w-4 rtl:-scale-x-100" />
            </button>
          </div>
        </form>
      </section>
    </div>,
    document.body
  );
});
