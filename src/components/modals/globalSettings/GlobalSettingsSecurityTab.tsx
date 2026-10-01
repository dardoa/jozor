import { BrainCircuit, CreditCard, Loader2, ShieldAlert, Trash2 } from 'lucide-react';
import { Button } from '../../ui/Button';
import type { GlobalSettingsModalState } from '../useGlobalSettingsModalState';

type GlobalSettingsSecurityTabProps = Pick<
  GlobalSettingsModalState,
  | 't'
  | 'deleteProgress'
  | 'setDeleteProgress'
  | 'isDeleting'
  | 'isDeletionBillingBlocked'
  | 'isDeletionCheckoutBlocked'
  | 'openSubscriptionManagement'
  | 'showDeleteConfirm'
  | 'setShowDeleteConfirm'
  | 'startDeleteHold'
  | 'cancelDeleteHold'
>;

export const GlobalSettingsSecurityTab = ({
  t,
  deleteProgress,
  setDeleteProgress,
  isDeleting,
  isDeletionBillingBlocked,
  isDeletionCheckoutBlocked,
  openSubscriptionManagement,
  showDeleteConfirm,
  setShowDeleteConfirm,
  startDeleteHold,
  cancelDeleteHold,
}: GlobalSettingsSecurityTabProps) => (
  <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
    <div className="space-y-3 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel)] p-5 shadow-[var(--shadow-sm)]">
      <div className="flex items-center gap-3">
        <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-2 text-[var(--color-info-500)]">
          <BrainCircuit className="h-5 w-5" />
        </div>
        <div>
          <h4 className="font-bold text-sm text-[var(--text-main)]">
            {t.globalSettings.security.kindiLearningTitle || 'Kindi learning reports'}
          </h4>
          <p className="text-[10px] text-[var(--text-dim)]">
            {t.globalSettings.security.kindiLearningSubtitle || 'Redacted diagnostics help improve understanding.'}
          </p>
        </div>
      </div>
      <p className="text-xs leading-relaxed text-[var(--text-dim)]">
        {t.globalSettings.security.kindiLearningBody
          || 'Kindi may store redacted learning events such as event type, failure reason, confidence, and parser version. Raw queries, names, person IDs, emails, and executable plans are not stored in learning reports.'}
      </p>
    </div>

    {!showDeleteConfirm ? (
      <div className="space-y-4 rounded-3xl border border-[var(--danger-500)]/14 bg-[var(--danger-500)]/6 p-6">
        <div className="flex items-center gap-3 text-[var(--danger-500)]">
          <ShieldAlert className="w-6 h-6" />
          <h4 className="font-bold">{t.deleteAccountPermanentTitle}</h4>
        </div>
        <p className="text-sm text-[var(--text-dim)] leading-relaxed">
          {t.deleteAccountPermanentBody}
        </p>
        <Button
          variant="danger"
          className="w-full h-12 rounded-2xl font-bold"
          onClick={() => setShowDeleteConfirm(true)}
        >
          {t.globalSettings.security.startDeletion}
        </Button>
      </div>
    ) : (
      <div className="animate-in zoom-in-95 space-y-4 rounded-3xl border border-[var(--danger-500)]/20 bg-[var(--danger-500)]/10 p-6 duration-200">
        <div className="text-center space-y-2">
          <h4 className="text-lg font-bold text-[var(--danger-500)]">{t.deleteAccountPermanentTitle}</h4>
          <p className="text-xs text-[var(--text-dim)]">
            {t.globalSettings.security.deletionHold}
          </p>
        </div>

        <div className="pt-4 space-y-3">
          {isDeletionBillingBlocked && (
            <div className="space-y-3 text-sm">
              <p role="alert" className="text-[var(--text-main)]">
                {isDeletionCheckoutBlocked ? t.globalSettings.security.checkoutBlocksDeletion : t.globalSettings.security.subscriptionBlocksDeletion}
              </p>
              <Button variant="secondary" className="w-full" onClick={openSubscriptionManagement}>
                <CreditCard className="h-4 w-4 shrink-0" aria-hidden="true" />
                {t.globalSettings.security.manageSubscription}
              </Button>
            </div>
          )}
          <button
            type="button"
            aria-label={t.deleteAccountAction}
            aria-busy={isDeleting}
            onMouseDown={(event) => {
              if (event.button === 0) startDeleteHold();
            }}
            onMouseUp={cancelDeleteHold}
            onMouseLeave={cancelDeleteHold}
            onTouchStart={startDeleteHold}
            onTouchEnd={cancelDeleteHold}
            onTouchCancel={cancelDeleteHold}
            onBlur={cancelDeleteHold}
            onKeyDown={(event) => {
              if (event.key === ' ' || event.key === 'Enter') {
                event.preventDefault();
                if (!event.repeat) startDeleteHold();
              }
            }}
            onKeyUp={(event) => {
              if (event.key === ' ' || event.key === 'Enter') {
                event.preventDefault();
                cancelDeleteHold();
              }
            }}
            disabled={isDeleting}
            className="group relative flex h-16 w-full items-center justify-center gap-3 overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel)] font-bold text-[var(--text-main)] transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--danger-500)]"
          >
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[var(--danger-600)] to-[var(--danger-500)] opacity-90 transition-all duration-100 ease-linear"
              style={{
                width: `${deleteProgress}%`,
                insetInlineStart: 0,
              }}
            />

            <span className="relative z-10 flex items-center gap-3">
              {isDeleting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Trash2 className="w-5 h-5 transition-transform group-active:scale-110" />
                  {t.deleteAccountAction}
                </>
              )}
            </span>
          </button>

          <Button
            variant="ghost"
            className="w-full h-12 rounded-2xl font-bold text-[var(--text-dim)] hover:text-[var(--text-main)]"
            onClick={() => {
              cancelDeleteHold();
              setShowDeleteConfirm(false);
              setDeleteProgress(0);
            }}
            disabled={isDeleting}
          >
            {t.deleteAccountCancel}
          </Button>

          <p className="text-[10px] text-center font-medium italic text-[var(--danger-500)]/80">
            {t.globalSettings.security.deletionWarning}
          </p>
        </div>
      </div>
    )}
  </div>
);
