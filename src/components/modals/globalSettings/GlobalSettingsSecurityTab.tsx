import { Loader2, ShieldAlert, Trash2 } from 'lucide-react';
import { Button } from '../../ui/Button';
import type { GlobalSettingsModalState } from '../useGlobalSettingsModalState';

type GlobalSettingsSecurityTabProps = Pick<
  GlobalSettingsModalState,
  | 't'
  | 'deleteProgress'
  | 'setDeleteProgress'
  | 'isDeleting'
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
  showDeleteConfirm,
  setShowDeleteConfirm,
  startDeleteHold,
  cancelDeleteHold,
}: GlobalSettingsSecurityTabProps) => (
  <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
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
          <button
            onMouseDown={startDeleteHold}
            onMouseUp={cancelDeleteHold}
            onMouseLeave={cancelDeleteHold}
            onTouchStart={startDeleteHold}
            onTouchEnd={cancelDeleteHold}
            disabled={isDeleting}
            className="group relative flex h-16 w-full items-center justify-center gap-3 overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel)] font-bold text-[var(--text-main)] transition-all"
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
